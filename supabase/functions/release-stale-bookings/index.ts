import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_HOLD_MINUTES = parseInt(Deno.env.get("BOOKING_HOLD_MINUTES") ?? "15", 10);

const logStep = (step: string, details?: Record<string, unknown>) => {
  const extra = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RELEASE-STALE-BOOKINGS] ${step}${extra}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { date, holdMinutes } = body ?? {};

    const effectiveHoldMinutes = Math.max(5, Number(holdMinutes) || DEFAULT_HOLD_MINUTES);
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
