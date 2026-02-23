import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { code } = await req.json();
    const promoCode = (code || "").trim().toUpperCase();

    if (!promoCode) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const expectedCode = (Deno.env.get("LAUNCH_CODE") || "").toUpperCase();
    const expiry = new Date(Deno.env.get("LAUNCH_CODE_EXPIRY") || "2026-03-01");
    const percent = Number(Deno.env.get("LAUNCH_DISCOUNT_PERCENT") || 10);

    const isValid = expectedCode && constantTimeEqual(promoCode, expectedCode) && new Date() <= expiry;

    if (isValid) {
      return new Response(JSON.stringify({ valid: true, percent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if code matches but is expired
    const codeMatches = expectedCode && constantTimeEqual(promoCode, expectedCode);
    if (codeMatches && new Date() > expiry) {
      return new Response(JSON.stringify({ valid: false, reason: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ valid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in validate-promo:", error);
    return new Response(JSON.stringify({ valid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
