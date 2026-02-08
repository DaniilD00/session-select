// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildBookingConfirmationHtml, buildBookingConfirmationSubject } from "./template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://readypixelgo.se").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const buildIcsAttachment = (booking: any) => {
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
    `LOCATION:${VENUE_ADDRESS}`,
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
    let fromAddress = Deno.env.get("RESEND_FROM");
    // Fallback if not set or if it's the default onboarding address (which causes errors with custom domains)
    if (!fromAddress || fromAddress.includes("onboarding@resend.dev")) {
        fromAddress = "Ready Pixel Go <no-reply@readypixelgo.se>";
    }
    
    const html = buildBookingConfirmationHtml(booking, SITE_URL);
    const icsAttachment = buildIcsAttachment(booking);

    const emailPayload: any = {
      from: fromAddress,
      to: [booking.email],
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

    logStep("Email sent successfully", { emailResponse });

    // Send a copy of the confirmation email to the host
    const HOST_EMAIL = "tatiana.dykina@outlook.com";
    try {
      const hostPayload = { ...emailPayload, to: [HOST_EMAIL] };
      const hostEmailResponse = await resend.emails.send(hostPayload);
      logStep("Host copy sent successfully", { hostEmailResponse });
    } catch (hostErr) {
      // Log but don't fail the request if the host copy fails
      logStep("WARNING: Failed to send host copy", { error: String(hostErr) });
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
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});