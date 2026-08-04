// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildBookingConfirmationHtml, buildBookingConfirmationSubject } from "./template.ts";
import { getLocation, getTables } from "../_shared/locations.ts";
import { constantTimeEqual, requireAdminCode } from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://readypixelgo.se").replace(/\/$/, "");

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
  console.log(`[SEND-CONFIRMATION] ${step}${detailsStr}`);
};

const VENUE_ADDRESS = "Sundbybergsvägen 1F, 171 73 Solna";
const STOCKHOLM_TZ = "Europe/Stockholm";

const pad = (num: number) => num.toString().padStart(2, "0");

const formatLocal = (date: Date) => {
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

const formatUtc = (date: Date) => {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
};

const toBase64 = (input: string) => {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const buildIcsAttachment = (booking: any, venueAddress: string = VENUE_ADDRESS) => {
  // Expect time_slot like "10:00 - 11:00" or "10:00-11:00"
  const parts = booking.time_slot?.split("-").map((p: string) => p.trim());
  if (!parts || parts.length < 2) return null;

  const [startStr, endStr] = parts;
  const start = new Date(`${booking.booking_date}T${startStr}:00`);
  const end = new Date(`${booking.booking_date}T${endStr}:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const dtStamp = formatUtc(new Date());
  const dtStartLocal = formatLocal(start);
  const dtEndLocal = formatLocal(end);

  const descriptionLines = [
    `Boknings-ID: ${booking.id}`,
    `E-post: ${booking.email}`,
    booking.phone ? `Telefon: ${booking.phone}` : null,
    booking.payment_method ? `Betalning: ${booking.payment_method}` : null,
    booking.discount_code ? `Rabattkod: ${booking.discount_code}` : null,
  ].filter(Boolean).join("\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ready Pixel Go//Booking Confirmation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    // Minimal VTIMEZONE for Europe/Stockholm so Apple/Siri can resolve local time reliably
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Stockholm",
    "X-LIC-LOCATION:Europe/Stockholm",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${booking.id}@readypixelgo.se`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=${STOCKHOLM_TZ}:${dtStartLocal}`,
    `DTEND;TZID=${STOCKHOLM_TZ}:${dtEndLocal}`,
    "SUMMARY:Ready Pixel Go bokning",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    `LOCATION:${venueAddress}`,
    `DESCRIPTION:${descriptionLines}`,
    `ORGANIZER;CN=Ready Pixel Go:mailto:no-reply@readypixelgo.se`,
    `ATTENDEE;CN=${booking.email};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:${booking.email}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return {
    filename: "booking.ics",
    content: toBase64(ics),
    contentType: "text/calendar; charset=UTF-8; method=REQUEST",
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const {
      bookingId,
      location,
      customPriceText,
      statusColor,
      preview,
      customTotalPrice,
      customAdults,
      customChildren,
      customTotalPeople,
      adminAccessCode
    } = await req.json();
    logStep("Booking ID received", { bookingId, location, statusColor, preview });

    const loc = getLocation(location);
    const tables = getTables(loc.id);

    // Use service role key to fetch booking details
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    // ── Authorization ──
    // This function exposes booking PII (preview) and sends email on the
    // company's behalf, so it must never be publicly callable. Allowed callers:
    //  1. Internal functions (verify-payment / stripe-webhook) presenting the
    //     service role key as bearer token.
    //  2. The admin portal presenting the admin access code.
    const authz = req.headers.get("authorization") || "";
    const bearer = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    const isInternalCall = Boolean(serviceRoleKey) && constantTimeEqual(bearer, serviceRoleKey);

    if (!isInternalCall) {
      const adminAuth = await requireAdminCode(req, supabaseClient, adminAccessCode);
      if (!adminAuth.ok) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
          status: adminAuth.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch booking details
    const { data: booking, error } = await supabaseClient
      .from(tables.bookings)
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      throw new Error(`Booking not found: ${error?.message}`);
    }

    logStep("Booking found", { booking });

    const venue = {
      address: loc.address,
      directionsHtml:
        loc.id === "ronneby"
          ? `${loc.address}<br/><br/><em>Ring numret nedan när ni är utanför så kommer vår personal och öppnar dörren!</em>`
          : undefined,
      sessionNoteHtml:
        loc.id === "ronneby"
          ? `Genomgången av instruktionerna <strong style="color:#22d3ee;">ingår i era ${loc.sessionMinutes} minuter</strong>`
          : undefined,
    };

    const html = buildBookingConfirmationHtml(booking, SITE_URL, {
      customPriceText,
      statusColor,
      customTotalPrice,
      customAdults,
      customChildren,
      customTotalPeople
    }, venue);
    
    if (preview) {
      return new Response(JSON.stringify({ 
        success: true,
        html 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Send confirmation email
    let fromAddress = Deno.env.get("RESEND_FROM");
    // Fallback if not set or if it's the default onboarding address (which causes errors with custom domains)
    if (!fromAddress || fromAddress.includes("onboarding@resend.dev")) {
        fromAddress = "Ready Pixel Go <no-reply@readypixelgo.se>";
    }
    
    const icsAttachment = buildIcsAttachment(booking, loc.address);

    const HOST_EMAIL = Deno.env.get("HOST_BCC_EMAIL") || "tatiana.dykina@outlook.com";

    const emailPayload: any = {
      from: fromAddress,
      to: [booking.email],
      bcc: [HOST_EMAIL],
      subject: buildBookingConfirmationSubject(booking),
      html,
    };

    if (icsAttachment) {
      emailPayload.attachments = [icsAttachment];
      logStep("ICS attachment added", { filename: icsAttachment.filename });
    } else {
      logStep("ICS attachment skipped (time slot parse failed)");
    }

    const emailResponse = await resend.emails.send(emailPayload);

    if (emailResponse.error) {
      logStep("ERROR sending email", { error: emailResponse.error });
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    logStep("Email sent successfully to customer and host", { emailResponse });

    // Mark that confirmation email has been sent
    const { error: updateError } = await supabaseClient
      .from(tables.bookings)
      .update({ confirmation_email_sent: true })
      .eq("id", bookingId);

    if (updateError) {
      logStep("ERROR updating confirmation_email_sent status", { error: updateError });
      // Not throwing error, because email was sent successfully
    }

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
      JSON.stringify({ error: "Failed to send confirmation email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});