// @ts-nocheck
// Server-side IP geolocation used to suggest the nearest location to a visitor.
// Runs here (not in the browser) so the site's strict connect-src CSP stays
// intact and no third-party endpoint is contacted directly by the client.
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGIN") || "https://readypixelgo.se,https://www.readypixelgo.se"
)
  .split(",")
  .map((o) => o.trim());

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  // Echo localhost in dev, otherwise restrict to the configured origins.
  const allowedOrigin =
    ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Southern Sweden -> Ronneby. Match on ISO 3166-2:SE codes or county names.
const SOUTHERN_CODES = new Set(["K", "M", "G", "H", "SE-K", "SE-M", "SE-G", "SE-H"]);
const SOUTHERN_NAMES = ["blekinge", "skåne", "skane", "scania", "kronoberg", "kalmar"];

function suggestLocation(geo: {
  country_code?: string;
  region?: string;
  region_code?: string;
}): "solna" | "ronneby" {
  if ((geo.country_code || "").toUpperCase() !== "SE") return "solna";
  const code = (geo.region_code || "").toUpperCase();
  const name = (geo.region || "").toLowerCase();
  if (SOUTHERN_CODES.has(code) || SOUTHERN_NAMES.some((n) => name.includes(n))) {
    return "ronneby";
  }
  return "solna";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Take the first public IP from the forwarding chain.
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip =
      fwd.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";

    if (!ip) {
      return json({ suggestedLocation: "solna", reason: "no-ip" });
    }

    // ipwho.is: free, HTTPS, no API key. Returns region + region_code + country_code.
    const resp = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!resp.ok) {
      return json({ suggestedLocation: "solna", reason: "lookup-failed" });
    }
    const geo = await resp.json();
    if (!geo || geo.success === false) {
      return json({ suggestedLocation: "solna", reason: "lookup-error" });
    }

    return json({
      suggestedLocation: suggestLocation(geo),
      region: geo.region ?? null,
      regionCode: geo.region_code ?? null,
      country: geo.country_code ?? null,
    });
  } catch (error) {
    console.error("geo-locate error", error);
    // Fail safe: default to Solna, never block the page.
    return json({ suggestedLocation: "solna", reason: "exception" });
  }
});
