// Emits a real static HTML file for every public route at build time.
//
// Why this exists: the app is a SPA on GitHub Pages, which has no server-side
// rewrite. Without this, "/ronneby" is not a file, so GitHub Pages answers with
// HTTP 404 + public/404.html, which JS-redirects to "/?/ronneby". Humans get
// there; crawlers see a 404 and never index the page. Writing
// dist/ronneby/index.html makes GitHub Pages serve that URL with a 200 and the
// correct <head> before a single line of JS runs.
//
// The built dist/index.html is used as the template. Every route is derived
// from it, with the head rewritten from the LocationConfig so the two can't
// drift apart. A closed location's indexable pages become redirect stubs to
// the open location instead (see redirectStub()).
//
// Indexable pages (location homes + policies, root included) also get their
// content baked into <div id="root"> by scripts/prerender-content.tsx, so
// crawlers that don't run JS still see a heading, text and internal links.
//
// 404.html still ships and still handles anything not listed here (admin
// routes, typos), so the SPA fallback is unchanged.

import { createServer, type Plugin } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  LOCATIONS,
  LocationConfig,
  LocationId,
  DaySchedule,
  homePath,
  localizedPath,
} from "../src/config/locations";

// Mirrors the exports of ./prerender-content.tsx. Not imported from there:
// that file is TSX with "@/" imports, which only Vite's SSR loader resolves.
type StaticPage = "home" | "integritetspolicy" | "anvandarvillkor" | "bokningspolicy";
type RenderStaticPage = (locationId: LocationId, page: StaticPage) => Promise<string>;

const ORIGIN = "https://readypixelgo.se";

// Public sub-routes rendered under every location, mirroring publicRoutes in
// App.tsx. `noindex` marks pages that exist for users but shouldn't be in the
// index (transactional / thin content); they're pre-rendered anyway so nobody
// lands on a 404 status.
interface SubPage {
  segment: string;
  title: (c: LocationConfig) => string;
  // Indexable pages: 120–160 characters, or SEO audits flag them as too short.
  description: (c: LocationConfig) => string;
  noindex?: boolean;
  // Bake this page's content into #root for crawlers (indexable pages only).
  content?: StaticPage;
}

const SUB_PAGES: SubPage[] = [
  {
    segment: "integritetspolicy",
    title: (c) => `Integritetspolicy – Ready Pixel Go ${c.city}`,
    description: (c) =>
      `Så samlar Ready Pixel Go i ${c.city} in, använder och skyddar dina personuppgifter vid bokning, nyhetsbrev och besök – och vilka rättigheter du har.`,
    content: "integritetspolicy",
  },
  {
    segment: "anvandarvillkor",
    title: (c) => `Användarvillkor – Ready Pixel Go ${c.city}`,
    description: (c) =>
      `Användarvillkor för Ready Pixel Go i ${c.city}: åldersgräns och ansvar, ankomsttid, utrustning, säkerhet och uppförande när du spelar på LED-golvet.`,
    content: "anvandarvillkor",
  },
  {
    segment: "bokningspolicy",
    title: (c) => `Boknings- och betalningspolicy – Ready Pixel Go ${c.city}`,
    description: (c) =>
      `Så fungerar bokning och betalning hos Ready Pixel Go i ${c.city}: ombokning senast 48 timmar innan, avbokning, återbetalning och utebliven ankomst.`,
    content: "bokningspolicy",
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

  // No hreflang: both languages share one URL (client-side switcher), and
  // hreflang pointing one URL at several languages is an SEO error.

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

  // Social crawlers don't run JS, so the card has to be baked in here rather
  // than left to useSeo(). Swap the template's default card for the location's.
  if (v.geo) {
    const ogImage = `${ORIGIN}${v.geo.seo.ogImage}`;
    metaProp("og:image", ogImage);
    metaProp("og:image:alt", `Ready Pixel Go – LED-arcade i ${v.geo.city}`);
    metaName("twitter:image", ogImage);
    metaName("twitter:image:alt", `Ready Pixel Go – LED-arcade i ${v.geo.city}`);
  }

  // Drop any structured data in the template, then add this route's own.
  html = html.replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, "");
  if (v.jsonLd) {
    html = html.replace(
      /<\/head>/,
      `  <script type="application/ld+json">\n${escJsonLd(v.jsonLd)}\n    </script>\n  </head>`
    );
  }

  return { html, misses };
}

/* -------------------------------- redirects -------------------------------- */

// The open venue that a closed venue's pages move to, or null if none is open.
function movedTo(c: LocationConfig): LocationConfig | null {
  if (!c.closed) return null;
  return Object.values(LOCATIONS).find((l) => l.id !== c.id && l.enabled && !l.closed) ?? null;
}

// A permanent move on a host with no server-side redirects (GitHub Pages).
// Google treats an instant meta refresh as a permanent (301-style) redirect and
// passes the old URL's ranking to the target; the canonical repeats the hint
// for crawlers that ignore refreshes. The script runs first for visitors and
// keeps the query string and hash, which the meta refresh would drop.
function redirectStub(targetPath: string, title: string): string {
  const url = `${ORIGIN}${targetPath}`;
  return `<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <title>${escAttr(title)}</title>
    <link rel="canonical" href="${escAttr(url)}" />
    <meta http-equiv="refresh" content="0; url=${escAttr(targetPath)}" />
    <script type="text/javascript">location.replace(${JSON.stringify(targetPath)} + location.search + location.hash);</script>
  </head>
  <body>
    <p><a href="${escAttr(targetPath)}">${escAttr(title)}</a></p>
  </body>
</html>
`;
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
    // EntertainmentBusiness is a LocalBusiness subtype; the narrower type
    // tells Google what kind of place this is for "aktiviteter"-style searches.
    "@type": "EntertainmentBusiness",
    "@id": `${canonical}#business`,
    name: `Ready Pixel Go ${c.city}`,
    alternateName: "Ready Pixel Go",
    description: c.seo.description,
    image: `${ORIGIN}${c.seo.ogImage}`,
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
    areaServed: c.areaServed.map((name) => ({ "@type": "Place", name })),
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
    // Nearby towns, so the venue is also described for their searches.
    ...c.areaServed
      .filter((town) => town !== c.city && town !== c.regionName)
      .map((town) => `aktiviteter ${town}`),
    "readypixelgo",
    "ready pixel go",
  ].join(", ");

/* ------------------------------- body content ------------------------------ */

const EMPTY_ROOT = '<div id="root"></div>';

function injectBody(html: string, body: string): string {
  if (html.split(EMPTY_ROOT).length !== 2) {
    throw new Error(`prerender-routes: expected exactly one ${EMPTY_ROOT} in index.html`);
  }
  // Function replacer: "$" in the content must not be read as a pattern.
  return html.replace(EMPTY_ROOT, () => `<div id="root">${body}</div>`);
}

// Loads scripts/prerender-content.tsx through a throwaway Vite SSR server so it
// can import the app's own components, translations and "@/" paths.
async function loadContentRenderer(root: string) {
  const server = await createServer({
    configFile: false,
    root,
    mode: "production",
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    resolve: { alias: { "@": path.resolve(root, "src") } },
    esbuild: { jsx: "automatic" },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const mod = await server.ssrLoadModule("/scripts/prerender-content.tsx");
    return { render: mod.renderStaticPage as RenderStaticPage, close: () => server.close() };
  } catch (err) {
    await server.close();
    throw err;
  }
}

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
    closeBundle: {
      // closeBundle hooks run in parallel by default. Run first and make the
      // others wait, so the gzip/brotli plugin compresses the final HTML.
      order: "pre",
      sequential: true,
      async handler() {
        const distDir = path.resolve(root, outDir);
        const template = await fs.readFile(path.join(distDir, "index.html"), "utf8");
        const misses: string[] = [];
        const written: string[] = [];
        const redirects: string[] = [];
        const content = await loadContentRenderer(root);

        const bodyFor = async (location: LocationConfig, page?: StaticPage) =>
          page ? content.render(location.id, page) : null;

        // routePath "" is the site root (dist/index.html).
        const save = async (routePath: string, html: string) => {
          const dir = path.join(distDir, routePath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
          written.push(routePath ? `/${routePath}/` : "/");
        };

        const write = async (routePath: string, values: HeadValues, body: string | null) => {
          const result = rewriteHead(template, values);
          misses.push(...result.misses.map((m) => `${routePath || "/"}: ${m}`));
          await save(routePath, body === null ? result.html : injectBody(result.html, body));
        };

        const redirect = async (routePath: string, targetPath: string, title: string) => {
          await save(routePath, redirectStub(targetPath, title));
          redirects.push(`/${routePath}${routePath ? "/" : ""} -> ${targetPath}`);
        };

        try {
          for (const location of Object.values(LOCATIONS)) {
            const base = location.basePath.replace(/^\//, ""); // "" | "ronneby"
            // A closed venue's indexable pages (home + policies) permanently
            // move to the open venue's, so their ranking carries over instead
            // of competing with it. Its token pages (review, unsubscribe, …)
            // stay real pages so links in already-sent emails keep working.
            const target = movedTo(location);

            // The location home page: dist/index.html for the root location,
            // dist/<base>/index.html for the others.
            if (target) {
              await redirect(base, homePath(target), target.seo.title);
            } else {
              const canonical = base ? `${ORIGIN}/${base}/` : `${ORIGIN}/`;
              await write(
                base,
                {
                  canonical,
                  title: location.seo.title,
                  description: location.seo.description,
                  keywords: keywordsFor(location),
                  geo: location,
                  jsonLd: localBusinessJsonLd(location, canonical),
                },
                await bodyFor(location, "home")
              );
            }

            for (const page of SUB_PAGES) {
              const routePath = base ? `${base}/${page.segment}` : page.segment;
              if (target && page.content) {
                await redirect(routePath, localizedPath(target, `/${page.segment}`), page.title(target));
                continue;
              }
              await write(
                routePath,
                {
                  canonical: `${ORIGIN}/${routePath}/`,
                  title: page.title(location),
                  description: page.description(location),
                  geo: location,
                  noindex: page.noindex,
                },
                await bodyFor(location, page.content)
              );
            }
          }
        } finally {
          await content.close();
        }

        if (misses.length) {
          // A tag the rewriter expected is gone from index.html — fail loudly
          // rather than silently shipping pages with Solna's metadata.
          throw new Error(
            `prerender-routes: could not rewrite these head tags (did index.html change?):\n  ${misses.join("\n  ")}`
          );
        }

        this.info?.(`prerendered ${written.length} routes: ${written.join(" ")}`);
        if (redirects.length) this.info?.(`redirect stubs: ${redirects.join(", ")}`);
      },
    },
  };
}
