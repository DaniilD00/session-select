// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Retrieving Stripe session", { sessionId });

    // Get the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Stripe session retrieved", { 
      status: session.payment_status,
      amount: session.amount_total 
    });

    // Fetch booking first to detect already-paid state (prevents duplicate emails)
    const { data: existingBooking, error: existingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (existingError || !existingBooking) {
      logStep("Booking fetch error", { error: existingError });
      throw new Error(`Booking not found for session ${sessionId}`);
    }

    // If already marked paid, skip re-sending confirmation
    if (session.payment_status === "paid" && existingBooking.payment_status === "paid") {
      logStep("Booking already paid; skip duplicate confirmation", { bookingId: existingBooking.id });
      return new Response(JSON.stringify({
        success: true,
        paymentStatus: existingBooking.payment_status,
        booking: existingBooking
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update booking status in database
    const { data: booking, error: updateError } = await supabaseClient
      .from("bookings")
      .update({ 
        payment_status: session.payment_status === "paid" ? "paid" : "failed"
      })
      .eq("stripe_session_id", sessionId)
      .select()
      .single();

    if (updateError) {
      logStep("Database update error", { error: updateError });
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    logStep("Booking updated", { bookingId: booking?.id, status: booking?.payment_status });

    // If payment is successful, send confirmation email
    if (session.payment_status === "paid" && booking) {
      logStep("Triggering confirmation email", { bookingId: booking.id });
      
      // Call the send-confirmation function
      const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const emailResult = await emailResponse.json();
      logStep("Email confirmation result", { emailResult });
    }

    return new Response(JSON.stringify({
      success: true,
      paymentStatus: session.payment_status,
      booking: booking
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});