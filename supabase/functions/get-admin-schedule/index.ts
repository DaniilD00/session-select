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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminAccessCode, date } = await req.json();
    const envAdminCode = Deno.env.get("ADMIN_ACCESS_CODE");
    if (!envAdminCode) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!constantTimeEqual(adminAccessCode, envAdminCode)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch bookings with details (include created_at so frontend can classify status rules)
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("id, booking_date, time_slot, payment_status, email, phone, adults, children, total_price, payment_method, created_at, review_email_sent_at")
      .eq("booking_date", date);

    if (bookingsError) throw bookingsError;

    // Fetch overrides
    const { data: overrides, error: overridesError } = await supabaseClient
      .from("time_slot_overrides")
      .select("time_slot, is_active")
      .eq("slot_date", date);

    if (overridesError) throw overridesError;

    return new Response(JSON.stringify({ bookings, overrides }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[get-admin-schedule] Error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
