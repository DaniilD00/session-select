// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getTables } from "../_shared/locations.ts";
import { requireAdminCode } from "../_shared/security.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "https://www.readypixelgo.se").split(",").map(o => o.trim());

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminAccessCode, date, location } = await req.json();
    const tables = getTables(location);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const auth = await requireAdminCode(req, supabaseClient, adminAccessCode);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch bookings with details (include created_at so frontend can classify status rules)
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from(tables.bookings)
      .select("id, booking_date, time_slot, payment_status, email, phone, adults, children, total_price, payment_method, created_at, review_email_sent_at, confirmation_email_sent")
      .eq("booking_date", date);

    if (bookingsError) throw bookingsError;

    // Fetch overrides
    const { data: overrides, error: overridesError } = await supabaseClient
      .from(tables.overrides)
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
