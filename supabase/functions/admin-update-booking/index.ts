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

const logStep = (step: string, details?: Record<string, unknown>) => {
  const extra = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-UPDATE-BOOKING] ${step}${extra}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminCode = Deno.env.get("ADMIN_ACCESS_CODE");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!adminCode || !supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing server configuration");
    }

    const payload = await req.json();
    const { adminAccessCode, bookingId, action, newDate, newTime, updates } = payload ?? {};

    if (!constantTimeEqual(adminAccessCode, adminCode)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bookingId || !action) {
      throw new Error("bookingId and action are required");
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("id, booking_date, time_slot, payment_status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    let updatedBooking = null;

    if (action === "release") {
      const { data, error } = await supabaseClient
        .from("bookings")
        .update({ payment_status: "cancelled" })
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;
      updatedBooking = data;
    } else if (action === "update") {
      const updatePayload: Record<string, unknown> = {};

      if (newDate) {
        updatePayload.booking_date = newDate;
      }
      if (newTime) {
        updatePayload.time_slot = newTime;
      }

      if (updates) {
        if (updates.email) updatePayload.email = updates.email;
        if (updates.phone) updatePayload.phone = updates.phone;
        if (typeof updates.adults === "number") updatePayload.adults = updates.adults;
        if (typeof updates.children === "number") updatePayload.children = updates.children;
        if (typeof updates.total_price === "number") updatePayload.total_price = updates.total_price;
      }

      if (Object.keys(updatePayload).length === 0) {
        throw new Error("No fields provided to update");
      }

      if (newDate && newTime) {
        const { data: conflict } = await supabaseClient
          .from("bookings")
          .select("id")
          .eq("booking_date", newDate)
          .eq("time_slot", newTime)
          .in("payment_status", ["paid", "pending"])
          .neq("id", bookingId)
          .maybeSingle();

        if (conflict) {
          throw new Error("Requested slot is already booked");
        }
      }

      const { data, error } = await supabaseClient
        .from("bookings")
        .update(updatePayload)
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;
      updatedBooking = data;
    } else {
      throw new Error("Unsupported action");
    }

    logStep("Booking updated", { bookingId, action });

    return new Response(
      JSON.stringify({ success: true, booking: updatedBooking }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });

    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
