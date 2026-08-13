import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getLocation, getTables } from "../_shared/locations.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    logStep("ERROR: Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  // Get the raw body and signature header
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    logStep("ERROR: Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("Webhook signature verification failed", { error: message });
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  // Only handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const paymentStatus = session.payment_status;

    // Location is stamped into the Stripe session metadata by create-payment.
    const loc = getLocation(session.metadata?.location);
    const tables = getTables(loc.id);

    logStep("Checkout session completed", { sessionId, paymentStatus, location: loc.id });

    if (paymentStatus !== "paid") {
      logStep("Payment not completed, skipping", { paymentStatus });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find the booking(s) by stripe_session_id — a multi-slot Ronneby booking
    // shares one Stripe session across several rows (one per occupied slot).
    const { data: existingBookings, error: fetchError } = await supabaseClient
      .from(tables.bookings)
      .select("id, payment_status, is_group_primary")
      .eq("stripe_session_id", sessionId);

    if (fetchError || !existingBookings || existingBookings.length === 0) {
      logStep("Booking not found for session", { sessionId, error: fetchError?.message });
      // Return 200 so Stripe doesn't retry — we can't find the booking
      return new Response(JSON.stringify({ received: true, warning: "booking not found" }), { status: 200 });
    }

    const primaryExisting = existingBookings.find((b: any) => b.is_group_primary) ?? existingBookings[0];

    // If already paid, skip (idempotent)
    if (primaryExisting.payment_status === "paid") {
      logStep("Booking already paid, skipping", { bookingId: primaryExisting.id });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Update every row in the group to paid
    const { data: updatedBookings, error: updateError } = await supabaseClient
      .from(tables.bookings)
      .update({ payment_status: "paid" })
      .eq("stripe_session_id", sessionId)
      .select();

    if (updateError || !updatedBookings || updatedBookings.length === 0) {
      logStep("Failed to update booking", { error: updateError?.message });
      return new Response("Database error", { status: 500 });
    }

    const updatedBooking = updatedBookings.find((b: any) => b.is_group_primary) ?? updatedBookings[0];

    logStep("Booking updated to paid", { bookingId: updatedBooking.id, rowCount: updatedBookings.length });

    // Send confirmation email
    try {
      const emailResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ bookingId: updatedBooking.id, location: loc.id }),
        }
      );
      const emailResult = await emailResponse.json();
      logStep("Confirmation email result", { emailResult });
    } catch (emailError) {
      // Don't fail the webhook — the booking is already marked paid
      logStep("Email sending failed (non-fatal)", { error: String(emailError) });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
