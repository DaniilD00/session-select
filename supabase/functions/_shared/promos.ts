// Promo codes, shared by validate-promo (what the guest sees when they hit
// "Apply") and create-payment (the authoritative check before charging).
//
// These are marketing codes printed on the site and handed out on social — not
// secrets — so they live here rather than in env vars. The one exception is the
// original launch code, which stays in LAUNCH_CODE / LAUNCH_CODE_EXPIRY /
// LAUNCH_DISCOUNT_PERCENT and is folded in at lookup time.
//
// A code is only accepted when the booking's location is in `locations`, so a
// Solna-only code is refused on a Ronneby booking rather than silently applied.

// Type-only: erased at bundle time, so this adds no runtime dependency.
import type { LocationId } from "./locations.ts";

export interface PromoCode {
  code: string; // always upper-case
  percent: number;
  locations: LocationId[]; // which venues the code is valid at
  // Inclusive end of validity, as an ISO instant. Bookings validated after
  // this moment are rejected as expired.
  expiresAt: string;
}

export const PROMO_CODES: PromoCode[] = [
  {
    // Farewell campaign for the Solna venue, which closes after 2026-09-24.
    // Valid for the rest of September so guests can still use it on the final
    // days' slots.
    code: "READY10",
    percent: 10,
    locations: ["solna"],
    expiresAt: "2026-09-30T23:59:59+02:00",
  },
];

export type PromoResult =
  | { valid: true; percent: number }
  | { valid: false; reason?: "expired" | "wrong_location" };

// Resolve a typed-in code for a given location.
//
// `now` is injectable so both callers agree on the clock during a single
// request. The env-var launch code is checked first to keep the original
// behaviour intact for any code still in circulation.
export function checkPromoCode(
  rawCode: string,
  location: string | null | undefined,
  now: Date = new Date()
): PromoResult {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { valid: false };

  const locationId: LocationId = location === "ronneby" ? "ronneby" : "solna";

  // Legacy launch code from env vars — valid at every location, as before.
  const launchCode = (Deno.env.get("LAUNCH_CODE") || "").toUpperCase();
  if (launchCode && constantTimeEqual(code, launchCode)) {
    const expiry = new Date(Deno.env.get("LAUNCH_CODE_EXPIRY") || "2026-03-01");
    if (now > expiry) return { valid: false, reason: "expired" };
    return { valid: true, percent: Number(Deno.env.get("LAUNCH_DISCOUNT_PERCENT") || 10) };
  }

  const promo = PROMO_CODES.find((p) => constantTimeEqual(code, p.code));
  if (!promo) return { valid: false };
  if (!promo.locations.includes(locationId)) return { valid: false, reason: "wrong_location" };
  if (now > new Date(promo.expiresAt)) return { valid: false, reason: "expired" };

  return { valid: true, percent: promo.percent };
}

// Length-independent comparison, so a wrong code can't be narrowed down by
// timing the response.
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
