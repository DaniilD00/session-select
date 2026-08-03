// Shared security helpers for Supabase edge functions (Deno runtime).
// - constantTimeEqual: timing-safe string comparison for secrets
// - requireAdminCode: admin-code auth with IP-based brute-force rate limiting
// - verifyTurnstile: server-side Cloudflare Turnstile CAPTCHA verification
//
// Rate limiting uses the `security_events` table (see migration
// 20260707120000_security_hardening.sql). If the table doesn't exist yet the
// checks fail open so deploys are safe before the migration is applied.

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get: (name: string) => string | undefined } };

const MAX_FAILED_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a || "");
  const bBuf = encoder.encode(b || "");
  let result = aBuf.length === bBuf.length ? 0 : 1;
  const len = Math.max(aBuf.length, bBuf.length);
  for (let i = 0; i < len; i++) {
    result |= (aBuf[i] || 0) ^ (bBuf[i] || 0);
  }
  return result === 0;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return (
    fwd.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function failedAttemptsInWindow(supabase: any, scope: string, key: string): Promise<number | null> {
  try {
    const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("security_events")
      .select("id", { count: "exact", head: true })
      .eq("scope", scope)
      .eq("key", key)
      .gte("created_at", cutoff);
    if (error) return null; // table missing or unreadable — fail open
    return count ?? 0;
  } catch {
    return null;
  }
}

async function recordFailedAttempt(supabase: any, scope: string, key: string): Promise<void> {
  try {
    await supabase.from("security_events").insert({ scope, key });
  } catch {
    // best effort — never block the response on logging
  }
}

export interface AdminAuthResult {
  ok: boolean;
  status: number;
  error?: string;
}

/**
 * Validates a supplied admin access code against ADMIN_ACCESS_CODE with
 * constant-time comparison and per-IP brute-force rate limiting.
 * `supabase` must be a service-role client.
 */
export async function requireAdminCode(
  req: Request,
  supabase: any,
  suppliedCode: string | undefined | null
): Promise<AdminAuthResult> {
  const envAdminCode = Deno.env.get("ADMIN_ACCESS_CODE");
  if (!envAdminCode) {
    return { ok: false, status: 500, error: "Server misconfiguration" };
  }

  const ip = getClientIp(req);
  const attempts = await failedAttemptsInWindow(supabase, "admin-auth-fail", ip);
  if (attempts !== null && attempts >= MAX_FAILED_ATTEMPTS) {
    return { ok: false, status: 429, error: "Too many attempts. Try again later." };
  }

  if (!constantTimeEqual(suppliedCode || "", envAdminCode)) {
    await recordFailedAttempt(supabase, "admin-auth-fail", ip);
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, status: 200 };
}

export interface TurnstileResult {
  ok: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * If TURNSTILE_SECRET_KEY is not configured the check is skipped (ok: true),
 * so the CAPTCHA can be rolled out by simply adding the secret.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return { ok: true, skipped: true };
  }
  if (!token || typeof token !== "string") {
    return { ok: false, skipped: false, error: "CAPTCHA verification required" };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const result = await resp.json();
    if (result.success === true) {
      return { ok: true, skipped: false };
    }
    return { ok: false, skipped: false, error: "CAPTCHA verification failed" };
  } catch {
    // Cloudflare unreachable — fail closed for payments would block all sales,
    // so fail open here; the per-email rate limit still applies.
    return { ok: true, skipped: false };
  }
}
