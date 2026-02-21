import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminAccessCode, date } = await req.json();
    const envAdminCode = Deno.env.get("ADMIN_ACCESS_CODE") || "Dastardly2025.";

    if (adminAccessCode !== envAdminCode) {
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

    // Fetch bookings with details (include created_at so frontend can identify stale pending)
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("id, booking_date, time_slot, payment_status, email, phone, adults, children, total_price, payment_method, created_at")
      .eq("booking_date", date)
      .in("payment_status", ["paid", "pending"]);

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
