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

const logStep = (step: string, details?: Record<string, unknown>) => {
  const extra = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUBMIT-REVIEW] ${step}${extra}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing server configuration");

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { action, token, rating, game_rating, enjoyed, improve, age_range, found_us } = body ?? {};

    if (!token) throw new Error("Token is required");

    /* ==================== CHECK ==================== */
    if (action === "check") {
      // Look up review_token on bookings table
      const { data: booking, error: bErr } = await supabaseClient
        .from("bookings")
        .select("id, review_token")
        .eq("review_token", token)
        .maybeSingle();

      if (bErr || !booking) {
        return new Response(JSON.stringify({ error: "Invalid or expired review link" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check if already submitted
      const { data: existing } = await supabaseClient
        .from("reviews")
        .select("id")
        .eq("token", token)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Already submitted", alreadySubmitted: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    /* ==================== SUBMIT ==================== */
    if (action === "submit") {
      if (typeof rating !== "number" || rating < 1 || rating > 10) {
        throw new Error("Rating must be between 1 and 10");
      }

      // Look up booking by review_token
      const { data: booking, error: bErr } = await supabaseClient
        .from("bookings")
        .select("id, email, review_token")
        .eq("review_token", token)
        .maybeSingle();

      if (bErr || !booking) {
        throw new Error("Invalid or expired review link");
      }

      // Prevent duplicate
      const { data: existing } = await supabaseClient
        .from("reviews")
        .select("id")
        .eq("token", token)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Already submitted", alreadySubmitted: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const { error: insertErr } = await supabaseClient
        .from("reviews")
        .insert({
          booking_id: booking.id,
          token,
          email: booking.email,
          rating,
          enjoyed: enjoyed || null,
          improve: improve || null,
          game_rating: (typeof game_rating === "number" && game_rating >= 1 && game_rating <= 10) ? game_rating : null,
          age_range: age_range || null,
          found_us: found_us || null,
          google_review_shown: rating >= 8,
        });

      if (insertErr) throw insertErr;

      logStep("Review submitted", { bookingId: booking.id, rating });

      return new Response(JSON.stringify({ success: true, googleShown: rating >= 8 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
