// Build-time only: renders the crawlable HTML that scripts/prerender-routes.ts
// bakes into each public page's <div id="root">. Loaded through Vite's SSR
// module loader during `vite build`; nothing here ships in the app bundle.
//
// Why: the site is a client-rendered SPA, so without this every page's raw
// HTML is an empty <div id="root">. Crawlers that don't run JavaScript (SEO
// auditors, Bing's first pass, link-preview bots) then find no heading, no
// text and no links, and report every page as empty and orphaned.
//
// The copy comes from the same sources the app renders: sv.json, the location
// config, and the policy page components themselves. createRoot() clears it
// when the app mounts, and index.html hides it while JS is running, so
// visitors never see it.

/* eslint-disable react-refresh/only-export-components -- build-time module, never hot-reloaded */

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import i18next from "i18next";
import sv from "@/i18n/locales/sv.json";
import { LOCATIONS, homePath, localizedPath, type LocationConfig, type LocationId } from "@/config/locations";
import { SOCIAL_LINKS } from "@/config/social";
import { LocationProvider } from "@/contexts/LocationContext";
import { faqItems, scheduleLines } from "@/lib/landing-copy";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import BookingPolicy from "@/pages/BookingPolicy";

export type StaticPage = "home" | "integritetspolicy" | "anvandarvillkor" | "bokningspolicy";

const i18n = i18next.createInstance();
const ready = i18n.init({
  lng: "sv",
  resources: { sv: { translation: sv } },
  // React escapes text itself, same as the app's i18n config.
  interpolation: { escapeValue: false },
});
const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as unknown as string;
const list = <T,>(key: string): T[] => {
  const raw = i18n.t(key, { returnObjects: true }) as unknown;
  return Array.isArray(raw) ? (raw as T[]) : [];
};

const openLocations = () => Object.values(LOCATIONS).filter((l) => l.enabled && !l.closed);

const POLICY_LINKS: { page: Exclude<StaticPage, "home">; labelKey: string }[] = [
  { page: "bokningspolicy", labelKey: "landing.nav.bookingPolicy" },
  { page: "anvandarvillkor", labelKey: "landing.nav.termsOfService" },
  { page: "integritetspolicy", labelKey: "landing.nav.privacy" },
];

// Header + footer around every page, mirroring the app's Navbar location
// switcher (open venues only) and Footer info links.
function Layout({ config, children }: { config: LocationConfig; children: ReactNode }) {
  const others = openLocations().filter((l) => l.id !== config.id);
  return (
    <div className="rpg-static">
      <header>
        <nav aria-label="Ready Pixel Go">
          <a href={homePath(config)}>Ready Pixel Go {config.city}</a>
          {others.map((l) => (
            <a key={l.id} href={homePath(l)}>
              Ready Pixel Go {l.city}
            </a>
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>{t("landing.footer.tagline")}</p>
        <nav aria-label={t("landing.footer.info")}>
          <ul>
            {POLICY_LINKS.map((p) => (
              <li key={p.page}>
                <a href={localizedPath(config, `/${p.page}`)}>{t(p.labelKey)}</a>
              </li>
            ))}
          </ul>
        </nav>
        <p>
          {config.addressLine} · <a href={`mailto:${config.email}`}>{config.email}</a>
        </p>
        <ul>
          {SOCIAL_LINKS.map((s) => (
            <li key={s.name}>
              <a href={s.href} rel="noopener noreferrer">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
        <p>
          © {new Date().getFullYear()} Ready Pixel Go. {t("landing.footer.rights")}
        </p>
      </footer>
    </div>
  );
}

const TIERS = ["1–2", "3–4", "5–6"];

// The landing page's sections as plain HTML, in the same order as Index.tsx.
function Home({ config }: { config: LocationConfig }) {
  const others = openLocations().filter((l) => l.id !== config.id);
  const lowestPrice = Math.min(...config.pricing.adultRates, ...config.pricing.childRates);
  const steps = list<{ title: string; description: string }>("landing.steps.items");
  const occasions = list<{ title: string; description: string }>("landing.occasions.items");

  return (
    <>
      <p>
        {config.closed
          ? t("closedLocation.bookingClosed")
          : t("landing.hero.eyebrow", { address: `${config.streetAddress}, ${config.city}` })}
      </p>
      <h1>
        {t("landing.hero.title")} {t("landing.hero.titleHighlight", { city: config.city })}
      </h1>
      {config.closed &&
        others.map((l) => (
          <p key={l.id}>
            <strong>{t("closedLocation.title", { city: config.city })}</strong>{" "}
            {t("closedLocation.body", { city: config.city, target: l.city })}{" "}
            <a href={homePath(l)}>{t("closedLocation.cta", { target: l.city })}</a>
          </p>
        ))}
      <p>{t("landing.hero.subtitle", { region: config.regionName, city: config.city })}</p>
      {!config.closed && <p>{t("landing.hero.priceFrom", { price: lowestPrice })}</p>}
      <ul>
        <li>
          {config.sessionMinutes} {t("landing.hero.stats.minutes")}
        </li>
        <li>1–6 {t("landing.hero.stats.players")}</li>
        <li>
          {config.ledTiles}+ {t("landing.hero.stats.tiles")}
        </li>
        <li>30+ {t("landing.hero.stats.levels")}</li>
      </ul>

      <section>
        <h2>{t("floor.title")}</h2>
        <p>{t("floor.subtitle")}</p>
        <h3>{t("floor.modes.title")}</h3>
        <p>
          {t("floor.modes.descriptionPre")}30+{t("floor.modes.descriptionPost")}
        </p>
        <h3>{t("floor.size.title")}</h3>
        <p>
          {config.floorSize} · {t("floor.size.description", { area: config.floorAreaSqm })}
        </p>
        <h3>{t("floor.tech.title")}</h3>
        <p>
          {t("floor.tech.badge", { tiles: config.ledTiles })}. {t("floor.tech.description")}
        </p>
      </section>

      <section>
        <h2>{t("landing.steps.title")}</h2>
        <ol>
          {steps.map((s) => (
            <li key={s.title}>
              <strong>{s.title}</strong> – {s.description}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>{t("landing.occasions.title")}</h2>
        <p>{t("landing.occasions.subtitle")}</p>
        <ul>
          {occasions.map((o) => (
            <li key={o.title}>
              <strong>{o.title}</strong> – {o.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t("pricing.title")}</h2>
        <p>{t("pricing.subtitle")}</p>
        <ul>
          {TIERS.map((tier, i) => (
            <li key={tier}>
              {tier} {t("pricing.guests")}: {config.pricing.adultRates[i]} {t("landing.pricing.perPerson")} (
              {t("landing.pricing.adult")}), {config.pricing.childRates[i]} kr ({t("landing.pricing.child")})
            </li>
          ))}
        </ul>
        <ul>
          <li>{t("landing.pricing.private")}</li>
          <li>{t("landing.pricing.session", { minutes: config.sessionMinutes })}</li>
          <li>{t("landing.pricing.payment")}</li>
        </ul>
        <p>
          {t("pricing.note")} {t("pricing.groupNote")} <a href={`mailto:${config.email}`}>{config.email}</a>
        </p>
      </section>

      <section>
        <h2>{t("faq.title")}</h2>
        <p>{t("faq.subtitle")}</p>
        <dl>
          {faqItems(config, t).map((item) => (
            <div key={item.question}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>{t("location.title")}</h2>
        <p>{t(config.id === "ronneby" ? "location.descriptionRonneby" : "location.description")}</p>
        <dl>
          <dt>{t("location.address")}</dt>
          <dd>{config.addressLine}</dd>
          <dt>{t("landing.location.gettingThere")}</dt>
          <dd>{config.directions ?? t("location.directionsValue")}</dd>
          <dt>{t("landing.location.hours")}</dt>
          {scheduleLines(config, t).map((line) => (
            <dd key={line}>{line}</dd>
          ))}
        </dl>
        {others.map((l) => (
          <p key={l.id}>
            <a href={homePath(l)}>{t("location.otherLocation", { city: l.city })}</a>
          </p>
        ))}
        <p>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(config.mapsQuery)}`} rel="noopener noreferrer">
            {t("location.googleMaps")}
          </a>
        </p>
      </section>
    </>
  );
}

const POLICY_PAGES = {
  integritetspolicy: PrivacyPolicy,
  anvandarvillkor: TermsOfService,
  bokningspolicy: BookingPolicy,
};

// Inner HTML for <div id="root"> on one location's page.
export async function renderStaticPage(locationId: LocationId, page: StaticPage): Promise<string> {
  await ready;
  const config = LOCATIONS[locationId];

  let body: ReactNode;
  if (page === "home") {
    body = <Home config={config} />;
  } else {
    // The real page component, so the legal text can never drift from what
    // visitors see. The router + provider give it the right location.
    const Policy = POLICY_PAGES[page];
    body = (
      <MemoryRouter initialEntries={[localizedPath(config, `/${page}`)]}>
        <LocationProvider>
          <Policy />
        </LocationProvider>
      </MemoryRouter>
    );
  }

  return renderToStaticMarkup(<Layout config={config}>{body}</Layout>);
}
