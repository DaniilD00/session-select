import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
