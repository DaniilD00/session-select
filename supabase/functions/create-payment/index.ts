import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
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
            unit_amount: bookingData.totalPrice * 100, // Convert to öre (Swedish cents)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
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
        discount_percent: bookingData.discountPercent?.toString?.() ?? "0",
        discount_amount: ((bookingData.adults + bookingData.children) ? (bookingData.totalPrice) : 0).toString()
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create booking record in database
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        booking_date: bookingData.bookingDate,
        time_slot: bookingData.timeSlot,
        adults: bookingData.adults,
        children: bookingData.children,
        total_people: bookingData.adults + bookingData.children,
        total_price: bookingData.totalPrice,
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
      throw new Error(`Database error: ${bookingError.message}`);
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