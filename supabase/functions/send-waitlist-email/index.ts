// @ts-nocheck
// Minimal typing shim so local TypeScript tooling doesn't complain; Supabase provides Deno at runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
// Configure sender via secrets; requires domain verification in Resend when using your own domain
const FROM = Deno.env.get("RESEND_FROM") ?? "Readypixel <no-reply@readypixel.com>";
const REPLY_TO = Deno.env.get("RESEND_REPLY_TO") ?? undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Rate limit by email: if an attempt was made within the last 5 minutes and no code was sent, reject
    if (email) {
      const supabaseRL = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { data: existing } = await supabaseRL
        .from("waitlist")
        .select("created_at, code_sent, code_sent_at")
        .eq("email", email)
        .maybeSingle();
      if (existing && !existing.code_sent) {
        const last = new Date(existing.created_at).getTime();
        const now = Date.now();
        if (now - last < 5 * 60 * 1000) {
          return new Response(JSON.stringify({ error: "Too many requests" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 429,
          });
        }
      }
    }

    // Upsert the subscriber
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

    // Only first N get code
    const limit = Number(Deno.env.get("LAUNCH_MAX_CODES") ?? 100);

    // Try to atomically assign code if under limit and consented
    const { data: claimed, error: claimError } = await supabase
      .from("waitlist")
      .update({ code_sent: true, code_sent_at: new Date().toISOString() })
      .eq("email", email)
      .eq("code_sent", false)
      .gte("(select count(*) from waitlist where code_sent)", 0); // placeholder to fit API; we'll do count separately

    // We cannot express the count guard directly via the client filter; do a safe re-check around an update
    // So fallback approach: check count then conditional update
    const { count } = await supabase
      .from("waitlist")
      .select("code_sent", { count: "exact", head: true })
      .eq("code_sent", true);

    let codeAssigned = false;
    if ((count ?? 0) < limit && Boolean(consent)) {
      const { data: updated, error: updateError } = await supabase
        .from("waitlist")
        .update({ code_sent: true, code_sent_at: new Date().toISOString() })
        .eq("email", email)
        .eq("code_sent", false)
        .select("code_sent")
        .single();
      if (updateError) throw updateError;
      codeAssigned = updated?.code_sent === true;
    }

    if (!codeAssigned) {
      return new Response(JSON.stringify({ ok: true, codeSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Send the email with the code
    const expiryDate = new Date(expiryISO);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin:0 auto;">
        <h2>Thanks for subscribing 🎉</h2>
        <p>You're among the first ${limit} subscribers—here's your launch discount:</p>
        <p><strong>Code:</strong> <code style="padding:6px 10px; background:#f5f5f5; border-radius:6px; display:inline-block;">${code}</code></p>
        <p><strong>Discount:</strong> ${percent}% off your total booking</p>
        <p><strong>Valid until:</strong> ${expiryDate.toDateString()}</p>
        <p>Use this code at checkout on our website.</p>
        <p>— The Readypixel Team</p>
      </div>
    `;

    const sendResp = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Your ${percent}% launch discount code`,
      html,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    });

    return new Response(JSON.stringify({ ok: true, codeSent: true, id: sendResp.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
