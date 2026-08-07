// Emits a real static HTML file for every public route at build time.
//
// Why this exists: the app is a SPA on GitHub Pages, which has no server-side
// rewrite. Without this, "/ronneby" is not a file, so GitHub Pages answers with
// HTTP 404 + public/404.html, which JS-redirects to "/?/ronneby". Humans get
// there; crawlers see a 404 and never index the page. Writing
// dist/ronneby/index.html makes GitHub Pages serve that URL with a 200 and the
// correct <head> before a single line of JS runs.
//
// The built dist/index.html (Solna, hand-maintained) is used as the template
// and is never modified. Every other route is derived from it, with the head
// rewritten from the LocationConfig so the two can't drift apart.
//
// 404.html still ships and still handles anything not listed here (admin
// routes, typos), so the SPA fallback is unchanged.

import type { Plugin } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import { LOCATIONS, LocationConfig, DaySchedule } from "../src/config/locations";

const ORIGIN = "https://readypixelgo.se";

// Public sub-routes rendered under every location, mirroring publicRoutes in
// App.tsx. `noindex` marks pages that exist for users but shouldn't be in the
// index (transactional / thin content); they're pre-rendered anyway so nobody
// lands on a 404 status.
interface SubPage {
  segment: string;
  title: (c: LocationConfig) => string;
  description: (c: LocationConfig) => string;
  noindex?: boolean;
}

const SUB_PAGES: SubPage[] = [
  {
    segment: "integritetspolicy",
    title: (c) => `Integritetspolicy – Ready Pixel Go ${c.city}`,
    description: (c) =>
      `Så behandlar Ready Pixel Go i ${c.city} dina personuppgifter vid bokning, nyhetsbrev och besök.`,
  },
  {
    segment: "anvandarvillkor",
    title: (c) => `Användarvillkor – Ready Pixel Go ${c.city}`,
    description: (c) =>
      `Villkor för att boka och delta i aktiviteter hos Ready Pixel Go i ${c.city}.`,
  },
  {
    segment: "bokningspolicy",
    title: (c) => `Boknings- och betalningspolicy – Ready Pixel Go ${c.city}`,
    description: (c) =>
      `Regler för bokning, ombokning, avbokning och betalning hos Ready Pixel Go i ${c.city}.`,
  },
  {
    segment: "launch",
    title: (c) => `Håll dig uppdaterad – Ready Pixel Go ${c.city}`,
    description: (c) => `Gå med i lanseringslistan för Ready Pixel Go i ${c.city}.`,
    noindex: true,
  },
  {
    segment: "booking-success",
    title: (c) => `Bokning bekräftad – Ready Pixel Go ${c.city}`,
    description: () => "Din bokning är bekräftad.",
    noindex: true,
  },
  {
    segment: "review",
    title: (c) => `Lämna omdöme – Ready Pixel Go ${c.city}`,
    description: () => "Berätta hur din upplevelse var.",
    noindex: true,
  },
  {
    segment: "discount",
    title: (c) => `Rabattkod – Ready Pixel Go ${c.city}`,
    description: () => "Hämta din rabattkod.",
    noindex: true,
  },
  {
    segment: "unsubscribe",
    title: (c) => `Avregistrera – Ready Pixel Go ${c.city}`,
    description: () => "Avregistrera dig från våra utskick.",
    noindex: true,
  },
];

/* ------------------------------ head rewriting ----------------------------- */

const escAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "</" inside a <script> body would close the tag early.
const escJsonLd = (value: unknown) => JSON.stringify(value, null, 2).replace(/<\//g, "<\\/");

interface HeadValues {
  canonical: string;
  title: string;
  description: string;
  keywords?: string;
  geo?: LocationConfig;
  noindex?: boolean;
  jsonLd?: unknown;
}

function rewriteHead(template: string, v: HeadValues): { html: string; misses: string[] } {
  const misses: string[] = [];
  let html = template;

  // Non-global patterns only: RegExp.test() advances lastIndex on /g patterns.
  const sub = (label: string, pattern: RegExp, replacement: string) => {
    if (!pattern.test(html)) {
      misses.push(label);
      return;
    }
    html = html.replace(pattern, replacement);
  };
  const metaName = (name: string, content: string) =>
    sub(
      `meta[name=${name}]`,
      new RegExp(`<meta name="${name}"[^>]*>`),
      `<meta name="${name}" content="${escAttr(content)}" />`
    );
  const metaProp = (prop: string, content: string) =>
    sub(
      `meta[property=${prop}]`,
      new RegExp(`<meta property="${prop}"[^>]*>`),
      `<meta property="${prop}" content="${escAttr(content)}" />`
    );

  sub("title", /<title>[\s\S]*?<\/title>/, `<title>${escAttr(v.title)}</title>`);
  metaName("description", v.description);
  if (v.keywords) metaName("keywords", v.keywords);
  metaName(
    "robots",
    v.noindex
      ? "noindex, follow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
  );
  sub(
    "canonical",
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${escAttr(v.canonical)}" />`
  );

  // Every hreflang alternate points at this route's own URL (the site serves
  // both languages from one URL via the client-side switcher).
  if (/<link rel="alternate" hreflang=/.test(html)) {
    html = html.replace(
      /<link rel="alternate" hreflang="([^"]*)"[^>]*>/g,
      (_m, lang: string) =>
        `<link rel="alternate" hreflang="${lang}" href="${escAttr(v.canonical)}" />`
    );
  } else {
    misses.push("hreflang");
  }

  if (v.geo) {
    metaName("geo.region", v.geo.geoRegion);
    metaName("geo.placename", v.geo.city);
    metaName("geo.position", `${v.geo.coords.lat};${v.geo.coords.lng}`);
    metaName("ICBM", `${v.geo.coords.lat}, ${v.geo.coords.lng}`);
  }

  metaProp("og:url", v.canonical);
  metaProp("og:title", v.title);
  metaProp("og:description", v.description);
  metaName("twitter:title", v.title);
  metaName("twitter:description", v.description);

  // Drop the template's (Solna) structured data, then add this route's own.
  html = html.replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, "");
  if (v.jsonLd) {
    html = html.replace(
      /<\/head>/,
      `  <script type="application/ld+json">\n${escJsonLd(v.jsonLd)}\n    </script>\n  </head>`
    );
  }

  return { html, misses };
}

/* ------------------------------ structured data ---------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");

// A day's public opening window: first bookable start -> last start + session.
function openingWindow(day: DaySchedule, sessionMinutes: number) {
  let opens: string | null = null;
  let lastStart: string | null = null;

  if (day.start && day.end) {
    opens = day.start;
    lastStart = day.end;
  } else if (day.hours?.length) {
    const sorted = [...day.hours].sort((a, b) => a - b);
    opens = `${pad(sorted[0])}:00`;
    lastStart = `${pad(sorted[sorted.length - 1])}:00`;
  }
  if (!opens || !lastStart) return null;

  const [h, m] = lastStart.split(":").map(Number);
  const endMinutes = h * 60 + m + sessionMinutes;
  const closes = `${pad(Math.floor(endMinutes / 60) % 24)}:${pad(endMinutes % 60)}`;
  return { opens, closes };
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND = ["Saturday", "Sunday"];

function localBusinessJsonLd(c: LocationConfig, canonical: string) {
  const minPrice = Math.min(...c.pricing.childRates);
  const maxPrice = Math.max(...c.pricing.adultRates);

  const hours = [
    { days: WEEKDAYS, window: openingWindow(c.timeSlotRule.weekday, c.sessionMinutes) },
    { days: WEEKEND, window: openingWindow(c.timeSlotRule.weekend, c.sessionMinutes) },
  ]
    .filter((h) => h.window)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.window!.opens,
      closes: h.window!.closes,
    }));

  const address: Record<string, string> = {
    "@type": "PostalAddress",
    streetAddress: c.streetAddress,
    addressLocality: c.city,
    addressCountry: "SE",
  };
  if (c.postalCode) address.postalCode = c.postalCode;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Ready Pixel Go",
    description: c.seo.description,
    image: `${ORIGIN}/carousel_media/IMG_med_logo.jpeg`,
    url: canonical,
    telephone: c.phone,
    email: c.email,
    priceRange: `${minPrice}-${maxPrice} SEK`,
    currenciesAccepted: "SEK",
    address,
    geo: {
      "@type": "GeoCoordinates",
      latitude: c.coords.lat,
      longitude: c.coords.lng,
    },
    hasMap: `https://maps.google.com/?q=${encodeURIComponent(c.mapsQuery)}`,
    areaServed: { "@type": "AdministrativeArea", name: c.regionName },
    openingHoursSpecification: hours,
    sameAs: [
      "https://www.instagram.com/readypixelgo_swe/",
      "https://www.facebook.com/readypixelgo/",
      "https://www.tiktok.com/@readypixelgo",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Gaming Sessions",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "LED-Arcade Spelsession – Vuxen (högsta pris)",
            description: `${c.sessionMinutes}-minuters interaktivt LED-arcade golv för vuxna vid liten grupp`,
          },
          price: String(Math.max(...c.pricing.adultRates)),
          priceCurrency: "SEK",
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "LED-Arcade Spelsession – Under 18 (lägsta pris)",
            description: `${c.sessionMinutes}-minuters interaktivt LED-arcade golv för barn under 18 år vid stor grupp`,
          },
          price: String(minPrice),
          priceCurrency: "SEK",
        },
      ],
    },
  };
}

const keywordsFor = (c: LocationConfig) =>
  [
    `aktiviteter i ${c.city}`,
    `roliga aktiviteter ${c.regionName}`,
    `teambuilding ${c.city}`,
    `familjeaktivitet ${c.city}`,
    `barnkalas ${c.city}`,
    `inomhusaktivitet ${c.city}`,
    `LED arcade ${c.regionName}`,
    `arcade golv ${c.city}`,
    `gaming ${c.city}`,
    "readypixelgo",
    "ready pixel go",
  ].join(", ");

/* --------------------------------- plugin ---------------------------------- */

export function prerenderRoutes(): Plugin {
  let outDir = "dist";
  let root = process.cwd();

  return {
    name: "rpg-prerender-routes",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
      root = config.root;
    },
    async closeBundle() {
      const distDir = path.resolve(root, outDir);
      const template = await fs.readFile(path.join(distDir, "index.html"), "utf8");
      const misses: string[] = [];
      const written: string[] = [];

      const write = async (routePath: string, values: HeadValues) => {
        const result = rewriteHead(template, values);
        misses.push(...result.misses.map((m) => `${routePath}: ${m}`));
        const dir = path.join(distDir, routePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, "index.html"), result.html, "utf8");
        written.push(`/${routePath}/`);
      };

      for (const location of Object.values(LOCATIONS)) {
        const base = location.basePath.replace(/^\//, ""); // "" | "ronneby"

        // The location home page. Solna's is the hand-maintained dist/index.html
        // at the site root, so only prefixed locations get one generated.
        if (base) {
          const canonical = `${ORIGIN}/${base}/`;
          await write(base, {
            canonical,
            title: location.seo.title,
            description: location.seo.description,
            keywords: keywordsFor(location),
            geo: location,
            jsonLd: localBusinessJsonLd(location, canonical),
          });
        }

        for (const page of SUB_PAGES) {
          const routePath = base ? `${base}/${page.segment}` : page.segment;
          await write(routePath, {
            canonical: `${ORIGIN}/${routePath}/`,
            title: page.title(location),
            description: page.description(location),
            geo: location,
            noindex: page.noindex,
          });
        }
      }

      if (misses.length) {
        // A tag the rewriter expected is gone from index.html — fail loudly
        // rather than silently shipping pages with Solna's metadata.
        throw new Error(
          `prerender-routes: could not rewrite these head tags (did index.html change?):\n  ${misses.join("\n  ")}`
        );
      }

      this.info?.(`prerendered ${written.length} routes: ${written.join(" ")}`);
    },
  };
}
