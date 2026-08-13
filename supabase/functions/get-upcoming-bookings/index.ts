// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
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
    const { adminAccessCode, limit = 5, offset = 0, searchQuery, location } = await req.json();
    const tables = getTables(location);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const auth = await requireAdminCode(req, supabaseClient, adminAccessCode);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (searchQuery) {
      // Strip characters that have meaning in PostgREST .or() filter syntax
      // so the search term can't inject extra filter conditions.
      const q = String(searchQuery).replace(/[,()\\]/g, " ").trim().slice(0, 100);
      if (!q) {
        return new Response(JSON.stringify({ searchResults: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let orConditions = [`email.ilike.%${q}%`, `phone.ilike.%${q}%`];

      // Handle phone number variations
      const digitsOnly = q.replace(/\D/g, "");
      if (digitsOnly.length >= 6) {
        // If it starts with 0, check for +46 variation
        if (digitsOnly.startsWith("0")) {
          const swedish = "+46" + digitsOnly.substring(1);
          const swedishNoPlus = "46" + digitsOnly.substring(1);
          orConditions.push(`phone.ilike.%${swedish}%`);
          orConditions.push(`phone.ilike.%${swedishNoPlus}%`);
        } 
        // If it starts with 46, check for 0 variation
        else if (digitsOnly.startsWith("46")) {
          const zero = "0" + digitsOnly.substring(2);
          orConditions.push(`phone.ilike.%${zero}%`);
          orConditions.push(`phone.ilike.%+${digitsOnly}%`);
        }
      }

      const { data: searchResults, error: searchError } = await supabaseClient
        .from(tables.bookings)
        .select("id, booking_date, time_slot, payment_status, email, phone, adults, children, total_price, payment_method")
        .or(orConditions.join(","))
        .order("booking_date", { ascending: false })
        .limit(10);

      if (searchError) throw searchError;

      return new Response(JSON.stringify({ searchResults }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch upcoming confirmed bookings (paid + other/admin statuses)
    const { data: bookings, error: bookingsError, count } = await supabaseClient
      .from(tables.bookings)
      .select("id, booking_date, time_slot, payment_status, email, phone, adults, children, total_price, payment_method, duration_minutes, booking_group_id, is_group_primary", { count: 'exact' })
      .gte("booking_date", today)
      .in("payment_status", ["paid", "other", "on-site"])
      .order("booking_date", { ascending: true })
      .order("time_slot", { ascending: true })
      .range(offset, offset + limit - 1);

    if (bookingsError) throw bookingsError;

    // Fetch incomplete bookings from the last 3 days (pending, cancelled, or failed)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: incompleteBookings, error: incompleteError } = await supabaseClient
      .from(tables.bookings)
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
