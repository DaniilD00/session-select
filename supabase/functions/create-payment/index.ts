// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    const adults = Math.max(0, Math.min(6, Number(bookingData.adults) || 0));
    const children = Math.max(0, Math.min(6, Number(bookingData.children) || 0));
    const totalPeople = adults + children;

    if (totalPeople < 1 || totalPeople > 6) {
      throw new Error("Invalid number of guests (1-6 required)");
    }

    // ── Server-side price calculation (tiered per-person pricing) ──
    const tier = totalPeople <= 2 ? 0 : totalPeople <= 4 ? 1 : 2;

    const adultRates = [349, 329, 299];
    const childRates = [299, 279, 249];

    let calculatedPrice = (adults * adultRates[tier]) + (children * childRates[tier]);

    // Server-side promo code validation
    let discountPercent = 0;
    const promoCode = (bookingData.discountCode || "").trim().toUpperCase();
    if (promoCode) {
      const expectedPromoCode = (Deno.env.get("LAUNCH_CODE") || "").toUpperCase();
      const promoExpiry = new Date(Deno.env.get("LAUNCH_CODE_EXPIRY") || "2026-03-01");
      const promoPct = Number(Deno.env.get("LAUNCH_DISCOUNT_PERCENT") || 10);
      if (expectedPromoCode && promoCode === expectedPromoCode && new Date() <= promoExpiry) {
        discountPercent = promoPct;
      }
      // Silently ignore invalid codes (don't reveal valid codes via error messages)
    }

    if (discountPercent > 0) {
      calculatedPrice = Math.round(calculatedPrice * (1 - discountPercent / 100));
    }

    logStep("Server-calculated price", { calculatedPrice, adults, children, discountPercent });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: bookingData.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer for email", { email: bookingData.email });
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : bookingData.email,
      line_items: [
        {
          price_data: {
            currency: "sek",
            product_data: { 
              name: `Event Booking - ${bookingData.bookingDate}`,
              description: `Time: ${bookingData.timeSlot}, People: ${bookingData.adults} adults + ${bookingData.children} children`
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
          description: `ReadyPixelGo Event Booking - ${bookingData.bookingDate} at ${bookingData.timeSlot}`,
          footer: "Moms 25% ingår i priset.",
        },
      },
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        booking_date: bookingData.bookingDate,
        time_slot: bookingData.timeSlot,
        adults: bookingData.adults.toString(),
        children: bookingData.children.toString(),
        email: bookingData.email,
        phone: bookingData.phone,
        payment_method: bookingData.paymentMethod,
        discount_code: bookingData.discountCode ?? "",
        discount_percent: discountPercent.toString(),
        discount_amount: calculatedPrice.toString()
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create booking record in database
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        booking_date: bookingData.bookingDate,
        time_slot: bookingData.timeSlot,
        adults: adults,
        children: children,
        total_price: calculatedPrice,
        email: bookingData.email,
        phone: bookingData.phone,
        payment_method: bookingData.paymentMethod,
        payment_status: "pending",
        stripe_session_id: session.id,
        user_id: null
      })
      .select()
      .single();

    if (bookingError) {
      logStep("Database error", { error: bookingError });
      throw new Error("Failed to create booking. Please try again.");
    }

    logStep("Booking created in database", { bookingId: booking.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      bookingId: booking.id,
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