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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminAccessCode } = await req.json();
    const envAdminCode = Deno.env.get("ADMIN_ACCESS_CODE");

    if (!envAdminCode) {
      console.error("ADMIN_ACCESS_CODE environment variable is not set");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Constant-time comparison to prevent timing attacks
    const codeBuffer = new TextEncoder().encode(adminAccessCode || "");
    const expectedBuffer = new TextEncoder().encode(envAdminCode);

    let isValid = codeBuffer.length === expectedBuffer.length;
    const len = Math.max(codeBuffer.length, expectedBuffer.length);
    for (let i = 0; i < len; i++) {
      if ((codeBuffer[i] || 0) !== (expectedBuffer[i] || 0)) {
        isValid = false;
      }
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Unauthorized", valid: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in verify-admin:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
