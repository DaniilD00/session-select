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
    const { adminAccessCode, location } = await req.json();
    const tables = getTables(location);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const auth = await requireAdminCode(req, supabaseClient, adminAccessCode);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch 7 latest reviews joined with their booking data
    const { data: reviews, error } = await supabaseClient
      .from(tables.reviews)
      .select(`
        id,
        email,
        rating,
        game_rating,
        enjoyed,
        improve,
        age_range,
        found_us,
        submitted_at,
        booking_id,
        bookings:${tables.bookings} (
          booking_date,
          time_slot,
          adults,
          children
        )
      `)
      .order("submitted_at", { ascending: false })
      .limit(7);

    if (error) throw error;

    return new Response(JSON.stringify({ reviews: reviews ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
