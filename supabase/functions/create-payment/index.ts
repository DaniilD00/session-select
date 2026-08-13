// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { defaultSlotsForDate, fromMinutes, getLocation, getPricing, getTables, toMinutes } from "../_shared/locations.ts";
import { getClientIp, verifyTurnstile } from "../_shared/security.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "https://www.readypixelgo.se").split(",").map(o => o.trim());

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

  const { bookingData } = await req.json();
    logStep("Booking data received", { bookingData });

    if (!bookingData || typeof bookingData !== "object") {
      throw new Error("Invalid booking data");
    }

    // ── Server-side input validation (never trust the client) ──
    const email = String(bookingData.email || "").trim().slice(0, 255);
    const phone = String(bookingData.phone || "").trim().slice(0, 40);
    const bookingDate = String(bookingData.bookingDate || "").trim();
    // A single start time, e.g. "19:00" — this is what TimeSlotSelector /
    // BookingForm has always actually sent. (This used to require a
    // "HH:MM - HH:MM" range, which no plain start time could ever match —
    // every booking attempt was rejected here. Fixed as part of adding
    // Ronneby's multi-slot booking below, which needed this validation
    // touched anyway.)
    const timeSlot = String(bookingData.timeSlot || "").trim().slice(0, 5);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email address");
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 6 || phoneDigits.length > 15) {
      throw new Error("Invalid phone number");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || isNaN(new Date(bookingDate).getTime())) {
      throw new Error("Invalid booking date");
    }
    const todayStr = new Date().toISOString().split("T")[0];
    const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    if (bookingDate < todayStr || bookingDate > maxDate) {
      throw new Error("Booking date is out of range");
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeSlot)) {
      throw new Error("Invalid time slot");
    }

    // ── CAPTCHA (Cloudflare Turnstile) — enforced when TURNSTILE_SECRET_KEY is set ──
    const captcha = await verifyTurnstile(bookingData.captchaToken, getClientIp(req));
    if (!captcha.ok) {
      logStep("CAPTCHA rejected");
      return new Response(JSON.stringify({ error: captcha.error || "CAPTCHA verification failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Resolve the location (defaults to Solna for backwards compatibility).
    const loc = getLocation(bookingData.location);
    const tables = getTables(loc.id);
    logStep("Location resolved", { location: loc.id, bookingsTable: tables.bookings });

    const adults = Math.max(0, Math.min(6, Number(bookingData.adults) || 0));
    const children = Math.max(0, Math.min(6, Number(bookingData.children) || 0));
    const totalPeople = adults + children;

    if (totalPeople < 1 || totalPeople > 6) {
      throw new Error("Invalid number of guests (1-6 required)");
    }

    // ── Ronneby only: book several consecutive slots in one go ──
    // The slots are taken straight from the location's own schedule, so this
    // stays correct if Ronneby's opening hours or interval ever change.
    const MAX_CONSECUTIVE_SLOTS = 4;

    let slotCount = Math.floor(Number(bookingData.slotCount) || 1);
    slotCount = Math.max(1, Math.min(MAX_CONSECUTIVE_SLOTS, slotCount));
    if (loc.id !== "ronneby") slotCount = 1; // consecutive-slot booking is Ronneby-only

    let slotTimes: string[] = [timeSlot];
    if (slotCount > 1) {
      const daySlots = defaultSlotsForDate(loc.id, bookingDate);
      const startIdx = daySlots.indexOf(timeSlot);
      if (startIdx === -1 || startIdx + slotCount > daySlots.length) {
        throw new Error("Not enough consecutive time slots available at that start time");
      }
      slotTimes = daySlots.slice(startIdx, startIdx + slotCount);
    }

    // Session runs from the first slot to the end of the last one.
    const durationMinutes =
      toMinutes(slotTimes[slotTimes.length - 1]) - toMinutes(slotTimes[0]) + loc.sessionMinutes;

    // ── Abuse guard: cap recent pending bookings per email ──
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count: recentPending } = await supabaseClient
      .from(tables.bookings)
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("payment_status", "pending")
      .gte("created_at", thirtyMinAgo);

    if ((recentPending ?? 0) >= 5) {
      throw new Error("Too many booking attempts. Please try again in a few minutes.");
    }

    // ── Availability check: reject if any of the requested slots is already
    // held/paid, or has been manually disabled by an admin override ──
    const { data: conflicts } = await supabaseClient
      .from(tables.bookings)
      .select("id")
      .eq("booking_date", bookingDate)
      .in("time_slot", slotTimes)
      .not("payment_status", "in", "(cancelled,failed)")
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return new Response(JSON.stringify({ error: "This time slot has just been booked. Please pick another time." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    const { data: blockedOverrides } = await supabaseClient
      .from(tables.overrides)
      .select("time_slot")
      .eq("slot_date", bookingDate)
      .in("time_slot", slotTimes)
      .eq("is_active", false)
      .limit(1);

    if (blockedOverrides && blockedOverrides.length > 0) {
      return new Response(JSON.stringify({ error: "One of the selected times is no longer available. Please pick another time." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // ── Server-side price calculation (tiered per-person pricing) ──
    const tier = totalPeople <= 2 ? 0 : totalPeople <= 4 ? 1 : 2;

    const { adultRates, childRates } = getPricing(loc.id);

    const perSlotPrice = (adults * adultRates[tier]) + (children * childRates[tier]);
    let calculatedPrice = perSlotPrice * slotCount;

    // Multi-slot discount: 10% off for booking 2+ consecutive Ronneby slots.
    const MULTI_SLOT_DISCOUNT_PERCENT = 10;
    let discountPercent = slotCount > 1 ? MULTI_SLOT_DISCOUNT_PERCENT : 0;

    // Server-side promo code validation — stacks on top of the multi-slot discount.
    let discountPercentFromPromo = 0;
    const promoCode = (bookingData.discountCode || "").trim().toUpperCase();
    if (promoCode) {
      const expectedPromoCode = (Deno.env.get("LAUNCH_CODE") || "").toUpperCase();
      const promoExpiry = new Date(Deno.env.get("LAUNCH_CODE_EXPIRY") || "2026-03-01");
      const promoPct = Number(Deno.env.get("LAUNCH_DISCOUNT_PERCENT") || 10);
      if (expectedPromoCode && promoCode === expectedPromoCode && new Date() <= promoExpiry) {
        discountPercentFromPromo = promoPct;
      }
      // Silently ignore invalid codes (don't reveal valid codes via error messages)
    }
    discountPercent += discountPercentFromPromo;

    if (discountPercent > 0) {
      calculatedPrice = Math.round(calculatedPrice * (1 - discountPercent / 100));
    }

    logStep("Server-calculated price", { calculatedPrice, adults, children, slotCount, discountPercent });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email,
      limit: 1
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer for email", { email });
    }

    // Create Stripe checkout session for one-time payment

    // Find or create a 25% inclusive tax rate for Swedish moms
    const existingRates = await stripe.taxRates.list({ limit: 100, active: true });
    let taxRateId = existingRates.data.find(
      (r) => r.percentage === 25 && r.inclusive && r.country === "SE"
    )?.id;

    if (!taxRateId) {
      const newRate = await stripe.taxRates.create({
        display_name: "Moms",
        description: "Swedish VAT 25%",
        percentage: 25,
        inclusive: true,
        country: "SE",
      });
      taxRateId = newRate.id;
      logStep("Created tax rate", { taxRateId });
    }

    // Only redirect back to an origin we trust — never a client-supplied one.
    const requestOrigin = req.headers.get("origin") || "";
    const redirectBase = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

    const paymentMethod = String(bookingData.paymentMethod || "card").slice(0, 20);

    const timeRangeLabel = slotCount > 1
      ? `${slotTimes[0]}-${fromMinutes(toMinutes(slotTimes[0]) + durationMinutes)}`
      : timeSlot;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: {
            currency: "sek",
            product_data: {
              name: `Event Booking - ${bookingDate}`,
              description: `Time: ${timeRangeLabel}${slotCount > 1 ? ` (${slotCount} slots)` : ""}, People: ${adults} adults + ${children} children`
            },
            unit_amount: calculatedPrice * 100, // Convert to öre (Swedish cents)
            tax_behavior: "inclusive",
          },
          quantity: 1,
          tax_rates: [taxRateId],
        },
      ],
      mode: "payment",
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `ReadyPixelGo Event Booking - ${bookingDate} at ${timeRangeLabel}`,
          footer: "Moms 25% ingår i priset.",
        },
      },
      success_url: `${redirectBase}${loc.basePath}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectBase}${loc.basePath}/`,
      metadata: {
        location: loc.id,
        booking_date: bookingDate,
        time_slot: timeSlot,
        slot_count: slotCount.toString(),
        adults: adults.toString(),
        children: children.toString(),
        email,
        phone,
        payment_method: paymentMethod,
        discount_code: discountPercentFromPromo > 0 ? promoCode : "",
        discount_percent: discountPercent.toString(),
        discount_amount: calculatedPrice.toString()
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create one booking row per occupied slot — this keeps the existing
    // exact-match availability/blocking logic working unchanged for every
    // other part of the app. Rows sharing booking_group_id belong to the
    // same checkout; the earliest slot (is_group_primary) carries the full
    // combined price and party size so nothing is double-counted, and is the
    // row everything else (confirmation email, admin display) treats as "the
    // booking". Single-slot bookings (Solna, or Ronneby with slotCount=1)
    // get exactly one row with booking_group_id = null, unchanged from before.
    const groupId = slotCount > 1 ? crypto.randomUUID() : null;
    const bookingRows = slotTimes.map((slot, idx) => ({
      booking_date: bookingDate,
      time_slot: slot,
      adults,
      children,
      total_price: idx === 0 ? calculatedPrice : 0,
      email,
      phone,
      payment_method: paymentMethod,
      payment_status: "pending",
      stripe_session_id: session.id,
      user_id: null,
      // null means "the location's normal session length" — same convention
      // the admin panel uses, so only a genuinely longer session is stored.
      duration_minutes: idx === 0 && durationMinutes !== loc.sessionMinutes ? durationMinutes : null,
      booking_group_id: groupId,
      is_group_primary: idx === 0,
    }));

    const { data: insertedRows, error: bookingError } = await supabaseClient
      .from(tables.bookings)
      .insert(bookingRows)
      .select();

    if (bookingError || !insertedRows || insertedRows.length === 0) {
      logStep("Database error", { error: bookingError });
      throw new Error("Failed to create booking. Please try again.");
    }

    const primaryBooking = insertedRows.find((b: any) => b.is_group_primary) ?? insertedRows[0];

    logStep("Booking created in database", { bookingId: primaryBooking.id, slotCount, rowCount: insertedRows.length });

    return new Response(JSON.stringify({
      url: session.url,
      bookingId: primaryBooking.id,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});