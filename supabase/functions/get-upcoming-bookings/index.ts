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
    const { adminAccessCode, limit = 5, offset = 0 } = await req.json();
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

    const today = new Date().toISOString().split('T')[0];

    // Fetch upcoming confirmed bookings only (pending shown separately on admin UI)
    const { data: bookings, error: bookingsError, count } = await supabaseClient
      .from("bookings")
      .select("id, booking_date, time_slot, payment_status, email, phone, adults, children, total_price, payment_method", { count: 'exact' })
      .gte("booking_date", today)
      .eq("payment_status", "paid")
      .order("booking_date", { ascending: true })
      .order("time_slot", { ascending: true })
      .range(offset, offset + limit - 1);

    if (bookingsError) throw bookingsError;

    return new Response(JSON.stringify({ bookings, count, hasMore: (count || 0) > offset + limit }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching upcoming bookings:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
