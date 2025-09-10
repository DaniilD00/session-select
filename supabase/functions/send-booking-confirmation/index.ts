import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-CONFIRMATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { bookingId } = await req.json();
    logStep("Booking ID received", { bookingId });

    // Use service role key to fetch booking details
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch booking details
    const { data: booking, error } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      throw new Error(`Booking not found: ${error?.message}`);
    }

    logStep("Booking found", { booking });

    // Send confirmation email
    const emailResponse = await resend.emails.send({
      from: "Event Booking <onboarding@resend.dev>",
      to: [booking.email],
      subject: "Booking Confirmation - Your Event is Confirmed!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Booking Confirmed! 🎉</h1>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Booking Details</h2>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.time_slot}</p>
            <p><strong>Guests:</strong> ${booking.adults} adults${booking.children > 0 ? ` + ${booking.children} children` : ''}</p>
            <p><strong>Total People:</strong> ${booking.total_people}</p>
            <p><strong>Total Price:</strong> ${booking.total_price} SEK</p>
            <p><strong>Payment Method:</strong> ${booking.payment_method}</p>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
          </div>

          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2d5a2d;"><strong>Payment Status:</strong> ✅ Confirmed</p>
          </div>

          <h3 style="color: #333;">Contact Information</h3>
          <p><strong>Email:</strong> ${booking.email}</p>
          <p><strong>Phone:</strong> ${booking.phone}</p>

          <div style="margin-top: 30px; padding: 20px; background-color: #f0f8ff; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <p>Your booking is confirmed! Please arrive 15 minutes before your scheduled time.</p>
            <p>If you need to make any changes or have questions, please contact us as soon as possible.</p>
          </div>

          <p style="text-align: center; margin-top: 30px; color: #666;">
            Thank you for choosing our service!<br>
            We look forward to seeing you soon.
          </p>
        </div>
      `,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-confirmation", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});