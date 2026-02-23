// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
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
    const { adminAccessCode, limit = 5, offset = 0 } = await req.json();
    const envAdminCode = Deno.env.get("ADMIN_ACCESS_CODE");
    if (!envAdminCode) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!constantTimeEqual(adminAccessCode, envAdminCode)) {
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

    // Fetch incomplete bookings from the last 3 days (pending, cancelled, or failed)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: incompleteBookings, error: incompleteError } = await supabaseClient
      .from("bookings")
      .select("id, booking_date, time_slot, payment_status, email, phone, adults, children, total_price, payment_method, created_at")
      .in("payment_status", ["pending", "cancelled", "failed"])
      .gte("created_at", threeDaysAgo)
      .order("created_at", { ascending: false });

    if (incompleteError) throw incompleteError;

    return new Response(JSON.stringify({ 
      bookings, 
      incompleteBookings,
      count, 
      hasMore: (count || 0) > offset + limit 
    }), {
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
