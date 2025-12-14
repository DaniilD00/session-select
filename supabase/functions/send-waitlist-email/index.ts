// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildWaitlistEmailHtml, buildWaitlistEmailSubject } from "./template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
// Configure sender via secrets; requires domain verification in Resend when using your own domain
const FROM = Deno.env.get("RESEND_FROM") ?? "Ready Pixel Go <no-reply@readypixelgo.se>";
const REPLY_TO = Deno.env.get("RESEND_REPLY_TO") ?? undefined;
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://readypixelgo.se";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendDiscountEmail = async ({
  email,
  firstName,
  percent,
  code,
  expiryISO,
  limit,
  unsubscribeUrl,
}: {
  email: string;
  firstName?: string;
  percent: number;
  code: string;
  expiryISO: string;
  limit: number;
  unsubscribeUrl: string;
}) => {
  const html = buildWaitlistEmailHtml({
    firstName,
    percent,
    code,
    expiryISO,
    limit,
    unsubscribeUrl,
    siteUrl: SITE_URL,
  });

  return resend.emails.send({
    from: FROM,
    to: [email],
    subject: buildWaitlistEmailSubject(percent),
    html,
    ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
  });
};

serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, first_name, last_name, dob, consent, code, percent, expiryISO } = body || {};
    if (!email || !code || !percent || !expiryISO) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const limit = Number(Deno.env.get("LAUNCH_MAX_CODES") ?? 100);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Upsert the subscriber data so we always capture the latest details
    const { data: upserted, error: upsertError } = await supabase
      .from("waitlist")
      .upsert(
        {
          email,
          first_name,
          last_name,
          dob: dob ? new Date(dob).toISOString().slice(0, 10) : null,
          consent: Boolean(consent),
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    const unsubscribeToken = upserted?.unsubscribe_token ?? "";
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

    // If a code was already assigned, simply re-send the email
    if (upserted?.code_sent) {
      const resendResp = await sendDiscountEmail({
        email,
        firstName: first_name,
        percent,
        code,
        expiryISO,
        limit,
        unsubscribeUrl,
      });
      return new Response(
        JSON.stringify({ ok: true, codeSent: true, resent: true, id: resendResp.data?.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { count } = await supabase
      .from("waitlist")
      .select("code_sent", { count: "exact", head: true })
      .eq("code_sent", true);

    if ((count ?? 0) >= limit || !consent) {
      return new Response(JSON.stringify({ ok: true, codeSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("waitlist")
      .update({ code_sent: true, code_sent_at: new Date().toISOString() })
      .eq("email", email)
      .eq("code_sent", false)
      .select("code_sent")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated?.code_sent) {
      return new Response(JSON.stringify({ ok: true, codeSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    try {
      const sendResp = await sendDiscountEmail({
        email,
        firstName: first_name,
        percent,
        code,
        expiryISO,
        limit,
        unsubscribeUrl,
      });
      return new Response(JSON.stringify({ ok: true, codeSent: true, id: sendResp.data?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (mailError) {
      // Roll back the assignment so the user can try again if sending fails
      await supabase
        .from("waitlist")
        .update({ code_sent: false, code_sent_at: null })
        .eq("email", email);
      throw mailError;
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
