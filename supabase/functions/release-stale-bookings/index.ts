// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "https://www.readypixelgo.se").split(",").map(o => o.trim());

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function constantTimeEqual(a: string, b: string): boolean {
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

const DEFAULT_HOLD_MINUTES = parseInt(Deno.env.get("BOOKING_HOLD_MINUTES") ?? "5", 10);

const logStep = (step: string, details?: Record<string, unknown>) => {
  const extra = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RELEASE-STALE-BOOKINGS] ${step}${extra}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { date, holdMinutes, adminAccessCode } = body ?? {};

    // Check admin authentication — allow public access with restricted defaults
    const envAdminCode = Deno.env.get("ADMIN_ACCESS_CODE");
    const isAdmin = envAdminCode && adminAccessCode && constantTimeEqual(adminAccessCode, envAdminCode);

    // Public callers can only use the default hold time (5 min); admins can customize
    const effectiveHoldMinutes = isAdmin
      ? Math.max(5, Number(holdMinutes) || DEFAULT_HOLD_MINUTES)
      : DEFAULT_HOLD_MINUTES;
    const cutoff = new Date(Date.now() - effectiveHoldMinutes * 60 * 1000).toISOString();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let query = supabaseClient
      .from("bookings")
      .update({ payment_status: "cancelled" })
      .eq("payment_status", "pending")
      .not("payment_method", "in", "(admin,cash,invoice,other,manual)")
      .lt("created_at", cutoff)
      .select("id, booking_date, time_slot");

    if (date) {
      query = query.eq("booking_date", date);
    }

    const { data, error } = await query;

    if (error) {
      logStep("Database error", { message: error.message });
      throw new Error(error.message);
    }

    logStep("Released stale bookings", { count: data?.length ?? 0, cutoff, date });

    // Hard cleanup: cancel pending bookings older than 3 days (no longer shown on admin)
    const threeDayCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    let hardCleanupQuery = supabaseClient
      .from("bookings")
      .update({ payment_status: "cancelled" })
      .eq("payment_status", "pending")
      .not("payment_method", "in", "(admin,cash,invoice,other,manual)")
      .lt("created_at", threeDayCutoff)
      .select("id");

    if (date) {
      hardCleanupQuery = hardCleanupQuery.eq("booking_date", date);
    }

    const { data: hardCleaned, error: hardError } = await hardCleanupQuery;
    if (hardError) {
      logStep("Hard cleanup error", { message: hardError.message });
    } else {
      logStep("Hard cleanup (3-day)", { count: hardCleaned?.length ?? 0 });
    }

    return new Response(
      JSON.stringify({
        success: true,
        releasedCount: data?.length ?? 0,
        cutoff,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
