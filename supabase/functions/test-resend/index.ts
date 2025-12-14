import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, email, domainId, domainName, domainConfig, fromEmail } = body;

    console.log(`Action: ${action || 'send_email'}`);

    let result;

    switch (action) {
      // ... existing cases ...
      case 'list_domains':
        result = await resend.domains.list();
        break;
      
      case 'get_domain':
        if (!domainId) throw new Error("domainId is required");
        result = await resend.domains.get(domainId);
        break;

      case 'verify_domain':
        if (!domainId) throw new Error("domainId is required");
        result = await resend.domains.verify(domainId);
        break;

      case 'create_domain':
        if (!domainName) throw new Error("domainName is required");
        result = await resend.domains.create({ name: domainName });
        break;

      case 'update_domain':
        if (!domainId) throw new Error("domainId is required");
        result = await resend.domains.update({
          id: domainId,
          ...domainConfig
        });
        break;

      default:
        // Default: Send email
        if (!email) {
          throw new Error("Email is required for sending test email, or specify an 'action' (list_domains, etc.)");
        }

        // Robustly get FROM address
        let fromAddress = fromEmail; // Allow overriding
        if (!fromAddress) {
            fromAddress = Deno.env.get("RESEND_FROM");
            if (!fromAddress || fromAddress.trim() === "") {
                fromAddress = "Ready Pixel Go <no-reply@readypixelgo.se>";
            }
        }

        console.log(`Sending test email to ${email}`);
        console.log(`From Address: '${fromAddress}'`);

        result = await resend.emails.send({
          from: fromAddress,
          to: [email],
          subject: "Test Email from Ready Pixel Go",
          html: "<h1>It Works!</h1><p>Resend is correctly configured and sending emails.</p>",
        });
        
        // Append debug info to result
        if (result && !result.error) {
            result.debug = { usedFromAddress: fromAddress, usedToAddress: email };
        }
        break;
    }

    console.log("Resend response:", result);

    if (result.error) {
        throw new Error(result.error.message);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
