import { createContext, useContext, useLayoutEffect, useMemo, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  LocationConfig,
  getLocationFromPath,
  localizedPath as buildPath,
} from "@/config/locations";
import { accentTokens } from "@/lib/accent";

interface SiteLocationContextValue {
  config: LocationConfig;
  // Build a location-scoped internal path, e.g. to("/bokningspolicy").
  to: (path: string) => string;
}

const SiteLocationContext = createContext<SiteLocationContextValue | null>(null);

// Derives the active location from the current route and exposes it to the tree.
// Must be rendered inside <BrowserRouter> (it uses useLocation()).
export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();

  const value = useMemo<SiteLocationContextValue>(() => {
    const config = getLocationFromPath(pathname);
    return { config, to: (path: string) => buildPath(config, path) };
  }, [pathname]);

  // Theme the whole app in the location's own colour. Light surfaces read the
  // standard tokens; the dark landing page (.theme-venue) reads --venue-*.
  const pixelColor = value.config.background.pixelColor;
  useLayoutEffect(() => {
    const { light, dark } = accentTokens(pixelColor);
    const root = document.documentElement.style;
    root.setProperty("--primary", light.primary);
    root.setProperty("--primary-hover", light.primaryHover);
    root.setProperty("--ring", light.primary);
    root.setProperty("--accent", light.primary);
    root.setProperty("--gradient-primary", light.gradient);
    root.setProperty("--venue-primary", dark.primary);
    root.setProperty("--venue-primary-hover", dark.primaryHover);
    root.setProperty("--venue-gradient", dark.gradient);
    root.setProperty("--venue-primary-on-light", light.primary);
    root.setProperty("--venue-primary-on-light-hover", light.primaryHover);
    root.setProperty("--venue-gradient-on-light", light.gradient);
  }, [pixelColor]);

  return (
    <SiteLocationContext.Provider value={value}>
      {children}
    </SiteLocationContext.Provider>
  );
};

export function useSiteLocation(): SiteLocationContextValue {
  const ctx = useContext(SiteLocationContext);
  if (ctx) return ctx;
  // Defensive fallback if used outside the provider.
  const config = getLocationFromPath(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  return { config, to: (path: string) => buildPath(config, path) };
}
