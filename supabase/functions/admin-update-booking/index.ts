import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { coveredSlotTimes, getLocation, getTables } from "../_shared/locations.ts";
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
    const { adminAccessCode, bookingId, action, newDate, newTime, updates, booking: newBookingData, location } = payload ?? {};
    const loc = getLocation(location);
    const tables = getTables(loc.id);

    // Statuses that mean "this slot is taken" (cancelled/failed do not).
    const BLOCKING_STATUSES = ["paid", "pending", "other", "on-site"];

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

    if (!action) {
      throw new Error("action is required");
    }

    let updatedBooking = null;

    /* ======================= CREATE ======================= */
    if (action === "create") {
      const b = newBookingData;
      if (!b || !b.booking_date || !b.time_slot || !b.email) {
        throw new Error("booking_date, time_slot, and email are required");
      }

      // A session longer than the location's default occupies every slot it
      // runs over, so reserve them all — otherwise someone could still book
      // 13:00 in the middle of a 12:00-14:00 party.
      const effectiveDuration = typeof b.duration_minutes === "number" && b.duration_minutes > 0
        ? b.duration_minutes
        : loc.sessionMinutes;
      const slotTimes = coveredSlotTimes(loc.id, b.booking_date, b.time_slot, effectiveDuration);

      // Check every covered slot for conflicts, not just the start time.
      const { data: conflicts } = await supabaseClient
        .from(tables.bookings)
        .select("time_slot")
        .eq("booking_date", b.booking_date)
        .in("time_slot", slotTimes)
        .in("payment_status", BLOCKING_STATUSES);

      if (conflicts && conflicts.length > 0) {
        const taken = [...new Set(conflicts.map((c: any) => c.time_slot))].sort().join(", ");
        throw new Error(
          slotTimes.length > 1
            ? `Already booked within that time range: ${taken}`
            : "Requested slot is already booked"
        );
      }

      const adults = typeof b.adults === "number" ? b.adults : 0;
      const children = typeof b.children === "number" ? b.children : 0;

      // One row per occupied slot so the existing exact-match availability
      // logic blocks them all with no changes elsewhere. Only the primary row
      // carries the price and duration, so the money isn't counted per slot.
      // Guest counts are repeated on every row rather than zeroed: total_people
      // is a generated column with a CHECK (total_people >= 1), so a 0-guest
      // placeholder row would be rejected by the database.
      const groupId = slotTimes.length > 1 ? crypto.randomUUID() : null;
      const insertPayload = slotTimes.map((slot, idx) => ({
        booking_date: b.booking_date,
        time_slot: slot,
        email: b.email,
        phone: b.phone || "",
        adults,
        children,
        total_price: idx === 0 ? (typeof b.total_price === "number" ? b.total_price : 0) : 0,
        payment_method: b.payment_method || "admin",
        payment_status: b.payment_status || "paid",
        duration_minutes: idx === 0 ? (typeof b.duration_minutes === "number" ? b.duration_minutes : null) : null,
        booking_group_id: groupId,
        is_group_primary: idx === 0,
      }));

      const { data, error } = await supabaseClient
        .from(tables.bookings)
        .insert(insertPayload)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Failed to create booking");

      updatedBooking = data.find((row: any) => row.is_group_primary) ?? data[0];
      logStep("Booking created", { id: updatedBooking.id, slots: slotTimes });

      return new Response(
        JSON.stringify({ success: true, booking: updatedBooking, blockedSlots: slotTimes }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    /* ======================= UPDATE / RELEASE ======================= */
    if (!bookingId) {
      throw new Error("bookingId is required for update/release actions");
    }

    const { data: existingBooking, error: bookingError } = await supabaseClient
      .from(tables.bookings)
      .select("id, booking_date, time_slot, payment_status, duration_minutes, booking_group_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !existingBooking) {
      throw new Error("Booking not found");
    }

    if (action === "release") {
      // Multi-slot bookings (Ronneby's consecutive-slots feature) share a
      // booking_group_id across their rows — release the whole group so the
      // admin doesn't have to cancel each linked slot one at a time.
      const releaseQuery = supabaseClient.from(tables.bookings).update({ payment_status: "cancelled" });
      const { data, error } = existingBooking.booking_group_id
        ? await releaseQuery.eq("booking_group_id", existingBooking.booking_group_id).select()
        : await releaseQuery.eq("id", bookingId).select().single();

      if (error) throw error;
      updatedBooking = Array.isArray(data) ? data.find((b: any) => b.id === bookingId) ?? data[0] : data;
    } else if (action === "update") {
      // Always edit the group's primary row — it's the one holding the real
      // price/duration. The admin UI already steers edits there, but a request
      // naming a linked slot should still do the right thing.
      const groupId = existingBooking.booking_group_id;
      let ownRows = [existingBooking];
      if (groupId) {
        const { data: groupRows, error: groupErr } = await supabaseClient
          .from(tables.bookings)
          .select("id, booking_date, time_slot, payment_status, duration_minutes, booking_group_id, is_group_primary")
          .eq("booking_group_id", groupId);
        if (groupErr) throw groupErr;
        if (groupRows && groupRows.length > 0) ownRows = groupRows;
      }
      const primaryRow = ownRows.find((r: any) => r.is_group_primary) ?? existingBooking;

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
        if ("duration_minutes" in updates) updatePayload.duration_minutes = updates.duration_minutes;
      }

      if (Object.keys(updatePayload).length === 0) {
        throw new Error("No fields provided to update");
      }

      // Recompute which slots this booking occupies. Changing the date, start
      // time or duration can grow or shrink that set, so the linked rows are
      // rebuilt from scratch below.
      const effectiveDate = newDate || primaryRow.booking_date;
      const effectiveTime = newTime || primaryRow.time_slot;
      const rawDuration = updates && "duration_minutes" in updates
        ? updates.duration_minutes
        : primaryRow.duration_minutes;
      const effectiveDuration = typeof rawDuration === "number" && rawDuration > 0
        ? rawDuration
        : loc.sessionMinutes;
      const slotTimes = coveredSlotTimes(loc.id, effectiveDate, effectiveTime, effectiveDuration);

      const ownIds = ownRows.map((r: any) => r.id);
      const { data: conflicts } = await supabaseClient
        .from(tables.bookings)
        .select("time_slot")
        .eq("booking_date", effectiveDate)
        .in("time_slot", slotTimes)
        .in("payment_status", BLOCKING_STATUSES)
        .not("id", "in", `(${ownIds.join(",")})`);

      if (conflicts && conflicts.length > 0) {
        const taken = [...new Set(conflicts.map((c: any) => c.time_slot))].sort().join(", ");
        throw new Error(
          slotTimes.length > 1
            ? `Already booked within that time range: ${taken}`
            : "Requested slot is already booked"
        );
      }

      // A real reschedule (date, time, or duration actually changing) means
      // any confirmation email already sent describes the old slot — clear
      // the flag so the admin can send a fresh one for the new time.
      const dateChanged = newDate ? newDate !== primaryRow.booking_date : false;
      const timeChanged = newTime ? newTime !== primaryRow.time_slot : false;
      const durationChanged =
        updates && "duration_minutes" in updates && updates.duration_minutes !== primaryRow.duration_minutes;
      if (dateChanged || timeChanged || durationChanged) {
        updatePayload.confirmation_email_sent = false;
      }

      const newGroupId = slotTimes.length > 1 ? (groupId ?? crypto.randomUUID()) : null;
      updatePayload.booking_date = effectiveDate;
      updatePayload.time_slot = slotTimes[0];
      updatePayload.booking_group_id = newGroupId;
      updatePayload.is_group_primary = true;

      // Update the primary row in place so its id survives (review tokens and
      // confirmation state hang off it), then rebuild the linked rows.
      const { data, error } = await supabaseClient
        .from(tables.bookings)
        .update(updatePayload)
        .eq("id", primaryRow.id)
        .select()
        .single();

      if (error) throw error;
      updatedBooking = data;

      if (groupId) {
        const { error: deleteErr } = await supabaseClient
          .from(tables.bookings)
          .delete()
          .eq("booking_group_id", groupId)
          .neq("id", primaryRow.id);
        if (deleteErr) throw deleteErr;
      }

      if (slotTimes.length > 1) {
        const linkedRows = slotTimes.slice(1).map((slot) => ({
          booking_date: effectiveDate,
          time_slot: slot,
          email: data.email,
          phone: data.phone || "",
          adults: data.adults,
          children: data.children,
          total_price: 0,
          payment_method: data.payment_method,
          payment_status: data.payment_status,
          duration_minutes: null,
          booking_group_id: newGroupId,
          is_group_primary: false,
        }));

        const { error: insertErr } = await supabaseClient.from(tables.bookings).insert(linkedRows);
        if (insertErr) throw insertErr;
      }

      logStep("Booking rescheduled", { bookingId: primaryRow.id, slots: slotTimes });
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
        status: 200,
      }
    );
  }
});
