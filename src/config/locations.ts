// Central source of truth for all per-location configuration.
//
// The app is a single config-driven codebase: the frontend derives the active
// location from the URL path, and everything (pricing, session length, time
// slots, database tables, background, address, admin path, launch badge) reads
// from the LocationConfig returned here. Everything defaults to "solna" so the
// original single-location flow is unchanged.
//
// Edge functions have a parallel, self-contained copy of the pricing/table
// mapping in supabase/functions/_shared/locations.ts (Deno can't import from
// src/). Keep the two in sync when changing pricing or table names.

export type LocationId = "solna" | "ronneby";

export interface PricingConfig {
  // Tiered per-person rates. Index 0 = 1-2 people, 1 = 3-4, 2 = 5-6.
  adultRates: [number, number, number];
  childRates: [number, number, number];
}

// A day's bookable times: either explicit on-the-hour hours, or an interval range.
export interface DaySchedule {
  hours?: number[]; // e.g. [19, 20] -> 19:00, 20:00
  start?: string; // "HH:MM"
  end?: string; // "HH:MM" (inclusive)
  intervalMinutes?: number; // e.g. 30 -> 11:00, 11:30, ...
}

export interface TimeSlotRule {
  weekday: DaySchedule; // Mon-Fri (getDay() 1-5)
  weekend: DaySchedule; // Sat-Sun (getDay() 0 or 6)
}

export interface LocationTables {
  bookings: string;
  overrides: string;
  waitlist: string;
  reviews: string;
}

export interface LocationConfig {
  id: LocationId;
  name: string; // "Solna" | "Ronneby"
  basePath: string; // "" for Solna (root), "/ronneby" for Ronneby
  enabled: boolean; // publicly bookable (flip to soft-launch a location)
  isNew: boolean; // show launch badge + confetti
  // Pre-launch teaser: the booking modal still opens, but the whole booking UI
  // is frosted over with a "coming soon" message so nothing can be booked yet.
  // Flip to false on opening day to go live — nothing else needs to change.
  // Copy lives under the "comingSoon" i18n key (incl. the loose opening ETA).
  comingSoon: boolean;
  pricing: PricingConfig;
  sessionMinutes: number;
  // true  -> the instructions walkthrough happens inside the booked session
  //          time (Ronneby), so the copy says so wherever the length is shown.
  // false -> guests are briefed before the session starts (Solna).
  briefingIncluded: boolean;
  // How far ahead a slot must start to still be bookable. Slots closer than
  // this are shown as unavailable, so guests can't book a session that staff
  // have no time to prepare for.
  bookingLeadTimeHours: number;
  // Closing date, as "YYYY-MM-DD". The last day guests can book — every later
  // date stays visible in the calendar but offers no times, showing the
  // closing notice instead. Leave unset for locations that aren't closing.
  lastBookableDate?: string;
  timeSlotRule: TimeSlotRule;
  tables: LocationTables;
  background: {
    // "r, g, b" string dropped straight into rgba() by PixelBackground
    pixelColor: string;
    clearColor: string;
  };
  // Physical venue specs shown in the floor section.
  floorSize: string; // e.g. "4.8m × 9.6m"
  floorAreaSqm: number; // playable area in m², interpolated into the floor copy
  ledTiles: number; // number of LED tiles (badge shows "{n}+ ...")
  adminSchedulePath: string; // "/admin101" | "/admin102"
  // Contact / location details
  addressLine: string;
  // addressLine split into parts for the LocalBusiness structured data emitted
  // by scripts/prerender-routes.ts. Keep these identical to what the Google
  // Business Profile says — Google matches the two when ranking local results.
  streetAddress: string;
  postalCode?: string;
  city: string;
  // Display name of the surrounding region/metro, used in marketing copy
  // (Solna -> "Stockholm", Ronneby -> "Blekinge"). Chosen so the existing
  // Solna strings reproduce byte-for-byte after interpolation.
  regionName: string;
  // Optional directions line. When set it overrides the i18n directions text
  // (used for locations that need their own wording, e.g. Ronneby).
  directions?: string;
  mapsQuery: string; // used for Google/Apple maps links + embed
  coords: { lat: number; lng: number };
  geoRegion: string; // ISO 3166-2:SE code, used for SEO geo.region meta
  // Per-location SEO copy applied to the document head (title/description/og).
  // ogImage is an absolute-from-root path to a real 1200x630 card built by
  // scripts/optimize-social-cards.mjs — link previews need that exact ratio.
  seo: { title: string; description: string; ogImage: string };
  email: string;
  phone: string;
  // Geo routing: SE subdivision (ISO 3166-2:SE) codes whose visitors are
  // suggested this location. Solna is the implicit default for anything else.
  regions: string[];
}

const COMMON = {
  email: "info@readypixelgo.se",
  phone: "+46 76-614 77 30",
};

export const LOCATIONS: Record<LocationId, LocationConfig> = {
  solna: {
    id: "solna",
    name: "Solna",
    basePath: "",
    enabled: true,
    isNew: false,
    comingSoon: false,
    pricing: {
      adultRates: [349, 329, 299],
      childRates: [299, 279, 249],
    },
    sessionMinutes: 45,
    briefingIncluded: false,
    bookingLeadTimeHours: 24,
    lastBookableDate: "2026-09-24", // venue closes after this date
    timeSlotRule: {
      // Weekdays: evenings only. Weekends: hourly 10:00-20:00.
      weekday: { hours: [19, 20] },
      weekend: { start: "10:00", end: "20:00", intervalMinutes: 60 },
    },
    tables: {
      bookings: "bookings",
      overrides: "time_slot_overrides",
      waitlist: "waitlist",
      reviews: "reviews",
    },
    background: { pixelColor: "220, 38, 38", clearColor: "#0a0a0a" }, // red
    floorSize: "4.8m × 9.6m",
    floorAreaSqm: 48,
    ledTiles: 450,
    adminSchedulePath: "/admin101",
    addressLine: "Sundbybergsvägen 1F, 171 73 Solna",
    streetAddress: "Sundbybergsvägen 1F",
    postalCode: "171 73",
    city: "Solna",
    regionName: "Stockholm",
    mapsQuery: "Sundbybergsvägen 1f Solna",
    coords: { lat: 59.3618, lng: 18.0006 },
    geoRegion: "SE-AB", // Stockholm county
    seo: {
      title: "Ready Pixel Go – LED-Arcade aktivitet i Solna, Stockholm",
      description:
        "Ready Pixel Go är Stockholms första interaktiva LED-arcade i Solna. Perfekt för teambuilding, familjeaktivitet och barnkalas – boka din aktivitet idag!",
      ogImage: "/social/og-solna.jpg",
    },
    email: COMMON.email,
    phone: COMMON.phone,
    regions: [], // default fallback location
  },
  ronneby: {
    id: "ronneby",
    name: "Ronneby",
    basePath: "/ronneby",
    enabled: true,
    isNew: true,
    comingSoon: false, // open for booking since 2026-08-07
    pricing: {
      adultRates: [329, 299, 249],
      childRates: [279, 249, 199],
    },
    sessionMinutes: 30, // includes the instructions walkthrough
    briefingIncluded: true,
    bookingLeadTimeHours: 12,
    timeSlotRule: {
      // Same hours every day: 11:00-20:00 every 30 minutes.
      weekday: { start: "11:00", end: "20:00", intervalMinutes: 30 },
      weekend: { start: "11:00", end: "20:00", intervalMinutes: 30 },
    },
    tables: {
      bookings: "bookings_ronneby",
      overrides: "time_slot_overrides_ronneby",
      waitlist: "waitlist_ronneby",
      reviews: "reviews_ronneby",
    },
    background: { pixelColor: "34, 197, 94", clearColor: "#08120b" }, // green
    floorSize: "3.1m × 9.1m",
    floorAreaSqm: 28,
    ledTiles: 350,
    adminSchedulePath: "/admin102",
    addressLine: "Karlskronagatan 32, 372 30 Ronneby",
    streetAddress: "Karlskronagatan 32",
    postalCode: "372 30",
    city: "Ronneby",
    regionName: "Blekinge",
    directions: "Centralt i Ronneby – nära buss och parkering.",
    mapsQuery: "Karlskronagatan 32 Ronneby",
    coords: { lat: 56.20962931949452, lng: 15.279178103376813 },
    geoRegion: "SE-K", // Blekinge county
    seo: {
      title: "Ready Pixel Go – LED-Arcade aktivitet i Ronneby, Blekinge",
      description:
        "Ready Pixel Go i Ronneby – interaktiv LED-arcade. Perfekt för teambuilding, familjeaktivitet och barnkalas – boka din aktivitet i Blekinge idag!",
      ogImage: "/social/og-ronneby.jpg",
    },
    email: COMMON.email,
    phone: COMMON.phone,
    // Southern Sweden: Blekinge, Skåne (incl. Malmö), Kronoberg, Kalmar.
    regions: ["SE-K", "SE-M", "SE-G", "SE-H"],
  },
};

export const DEFAULT_LOCATION: LocationId = "solna";

// True once `date` falls after the location's last bookable day. Compared on
// calendar days in local time, so the closing day itself stays bookable right
// up to its last slot. Always false for locations with no closing date.
export function isAfterLastBookableDate(
  config: LocationConfig,
  date: Date | null | undefined
): boolean {
  if (!config.lastBookableDate || !date) return false;
  const [y, m, d] = config.lastBookableDate.split("-").map(Number);
  const cutoff = new Date(y, m - 1, d, 23, 59, 59, 999);
  return date.getTime() > cutoff.getTime();
}

export function getLocationById(id: string | null | undefined): LocationConfig {
  if (id && (id === "solna" || id === "ronneby")) return LOCATIONS[id];
  return LOCATIONS[DEFAULT_LOCATION];
}

// Resolve the active location from a URL pathname.
// Ronneby owns "/ronneby/*" and the "/admin102" schedule route; everything
// else (including the "/solna" alias and "/admin101") is Solna.
export function getLocationFromPath(pathname: string): LocationConfig {
  const p = (pathname || "/").toLowerCase();
  if (p === "/ronneby" || p.startsWith("/ronneby/") || p.startsWith("/admin102")) {
    return LOCATIONS.ronneby;
  }
  return LOCATIONS.solna;
}

// Map a detected ISO 3166-2:SE subdivision code to the suggested location.
export function getLocationForRegion(subdivisionCode: string | null | undefined): LocationConfig {
  const code = (subdivisionCode || "").toUpperCase();
  const normalized = code.startsWith("SE-") ? code : `SE-${code}`;
  if (LOCATIONS.ronneby.regions.includes(normalized)) return LOCATIONS.ronneby;
  return LOCATIONS.solna;
}

// Prefix an internal absolute path ("/bokningspolicy") with the location's base
// path so links stay within the active location ("/ronneby/bokningspolicy").
export function localizedPath(config: LocationConfig, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!config.basePath) return clean;
  // Root of the location ("/") maps to the base path itself ("/ronneby").
  if (clean === "/") return config.basePath;
  return `${config.basePath}${clean}`;
}
