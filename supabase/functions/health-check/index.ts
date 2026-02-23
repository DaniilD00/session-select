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

  // Require admin authentication
  try {
    const body = await req.json().catch(() => ({}));
    const envAdminCode = Deno.env.get("ADMIN_ACCESS_CODE");
    if (!envAdminCode || body?.adminAccessCode !== envAdminCode) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const vars = [
    "STRIPE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
    "RESEND_API_KEY",
  ];

  const result: Record<string, boolean> = {};
  for (const v of vars) {
    result[v] = Boolean(Deno.env.get(v));
  }

  return new Response(JSON.stringify({ ok: true, env: result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
