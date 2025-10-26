import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authz = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    const expected = Deno.env.get("ADMIN_API_TOKEN") || "";
    if (!expected || token !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const limit = Number(Deno.env.get("LAUNCH_MAX_CODES") ?? 100);

    const { count: total } = await supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true });

    const { count: code_sent } = await supabase
      .from("waitlist")
      .select("code_sent", { count: "exact", head: true })
      .eq("code_sent", true);

    const { data: rows } = await supabase
      .from("waitlist")
      .select("id,email,first_name,last_name,created_at,code_sent,code_sent_at")
      .order("created_at", { ascending: false })
      .limit(100);

    return new Response(
      JSON.stringify({
        total: total ?? 0,
        code_sent: code_sent ?? 0,
        remaining: Math.max(0, limit - (code_sent ?? 0)),
        limit,
        rows: rows ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
