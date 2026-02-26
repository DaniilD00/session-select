import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "https://www.readypixelgo.se").split(",").map(o => o.trim());

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const SITE_URL = Deno.env.get("SITE_URL") || "https://www.readypixelgo.se";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: Record<string, unknown>) => {
  const extra = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-REVIEW-EMAIL] ${step}${extra}`);
};

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildReviewEmailHtml(reviewUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

      <h1 style="color:#1a1a2e;font-size:22px;margin:0 0 8px;">Tack för ditt besök! 🎮</h1>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Vi hoppas att du hade en fantastisk upplevelse hos ReadyPixelGo!
        Det tar bara 1-2 minut att berätta hur det var.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${reviewUrl}" 
           style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
          Lämna din feedback
        </a>
      </div>

      <p style="color:#888;font-size:13px;text-align:center;margin:16px 0 0;">
        Tack för att du hjälper oss bli bättre!<br/>
        — ReadyPixelGo-teamet
      </p>  
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing server configuration");

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Find paid bookings whose session ended >= 1 hour ago and haven't had a review email sent
    // Session = booking_date + time_slot (e.g. "14:00") + 45 min duration
    // We want: session_end + 1 hour <= now
    // session_end = booking_date + time_slot + 45 min
    // So we need: booking_date + time_slot + 45min + 60min = booking_date + time_slot + 105min <= now

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Get bookings from the last 7 days that are paid, not yet emailed
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: bookings, error: fetchErr } = await supabaseClient
      .from("bookings")
      .select("id, email, booking_date, time_slot, review_email_sent_at, review_token")
      .in("payment_status", ["paid", "other"])
      .gte("booking_date", sevenDaysAgo)
      .lte("booking_date", today)
      .is("review_email_sent_at", null)
      .order("booking_date", { ascending: true });

    if (fetchErr) throw fetchErr;

    let sentCount = 0;

    for (const booking of bookings || []) {
      // Parse session end time
      const [hours, minutes] = (booking.time_slot || "10:00").split(":").map(Number);
      const sessionStart = new Date(`${booking.booking_date}T${booking.time_slot}:00+01:00`); // CET
      const sessionEnd = new Date(sessionStart.getTime() + 45 * 60 * 1000);
      const sendAfter = new Date(sessionEnd.getTime() + 60 * 60 * 1000); // 1 hour after

      if (now < sendAfter) {
        continue; // Too early
      }

      // Generate token if not already set
      let token = booking.review_token;
      if (!token) {
        token = generateToken();
        await supabaseClient
          .from("bookings")
          .update({ review_token: token })
          .eq("id", booking.id);
      }

      const reviewUrl = `${SITE_URL}/review?token=${token}`;

      let fromAddress = Deno.env.get("RESEND_FROM");
      if (!fromAddress || fromAddress.includes("onboarding@resend.dev")) {
        fromAddress = "Ready Pixel Go <no-reply@readypixelgo.se>";
      }

      const { error: emailErr } = await resend.emails.send({
        from: fromAddress,
        to: [booking.email],
        subject: "Hur var din upplevelse? ⭐ — ReadyPixelGo",
        html: buildReviewEmailHtml(reviewUrl),
      });

      if (emailErr) {
        logStep("Email send failed", { bookingId: booking.id, error: String(emailErr) });
        continue;
      }

      // Mark as sent
      await supabaseClient
        .from("bookings")
        .update({ review_email_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      sentCount++;
      logStep("Review email sent", { bookingId: booking.id, email: booking.email });
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
