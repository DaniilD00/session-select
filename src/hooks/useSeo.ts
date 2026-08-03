import { useEffect } from "react";
import { LocationConfig } from "@/config/locations";

const SITE_ORIGIN = "https://readypixelgo.se";

const setAttr = (selector: string, attr: string, value: string) => {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

// Updates the document head with per-location SEO metadata. The base values in
// index.html are Solna's; this keeps Solna identical and overrides for Ronneby.
// Called from the home page (the SEO-critical landing for each location).
export function useSeo(config: LocationConfig) {
  useEffect(() => {
    const canonical = config.basePath ? `${SITE_ORIGIN}${config.basePath}` : `${SITE_ORIGIN}/`;

    document.title = config.seo.title;
    setAttr('meta[name="description"]', "content", config.seo.description);
    setAttr('link[rel="canonical"]', "href", canonical);

    // Local-search geo targeting
    setAttr('meta[name="geo.region"]', "content", config.geoRegion);
    setAttr('meta[name="geo.placename"]', "content", config.city);
    setAttr('meta[name="geo.position"]', "content", `${config.coords.lat};${config.coords.lng}`);
    setAttr('meta[name="ICBM"]', "content", `${config.coords.lat}, ${config.coords.lng}`);

    // Open Graph
    setAttr('meta[property="og:url"]', "content", canonical);
    setAttr('meta[property="og:title"]', "content", config.seo.title);
    setAttr('meta[property="og:description"]', "content", config.seo.description);
  }, [config]);
}
