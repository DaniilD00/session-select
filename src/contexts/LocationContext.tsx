import { createContext, useContext, useMemo, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  LocationConfig,
  getLocationFromPath,
  localizedPath as buildPath,
} from "@/config/locations";

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
