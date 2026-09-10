import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { checkPromoCode } from "../_shared/promos.ts";

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

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  try {
    // `location` decides which codes apply — a Solna-only code is refused on a
    // Ronneby booking. Missing location falls back to Solna, as everywhere else.
    const { code, location } = await req.json();

    // This is a preview only. create-payment re-runs the same check against the
    // booking it is actually charging, so a tampered response changes nothing.
    return json(checkPromoCode(code, location));
  } catch (error) {
    console.error("Error in validate-promo:", error);
    return json({ valid: false });
  }
});
