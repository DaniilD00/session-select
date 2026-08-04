// Shared per-location config for Supabase edge functions (Deno runtime).
// Edge functions cannot import from the frontend src/, so this mirrors the
// relevant parts of src/config/locations.ts. Keep the two in sync when changing
// table names or pricing.
//
// Every function defaults to "solna" when no/invalid location is supplied, so
// the original single-location behaviour is fully backwards compatible.

export type LocationId = "solna" | "ronneby";

export interface EdgeLocation {
  id: LocationId;
  basePath: string; // "" for Solna (root), "/ronneby" for Ronneby
  sessionMinutes: number;
  address: string; // venue address used in emails / calendar invites
  tables: {
    bookings: string;
    overrides: string;
    waitlist: string;
    reviews: string;
  };
  pricing: {
    adultRates: [number, number, number]; // tiers 1-2 / 3-4 / 5-6
    childRates: [number, number, number];
  };
}

export const LOCATIONS: Record<LocationId, EdgeLocation> = {
  solna: {
    id: "solna",
    basePath: "",
    sessionMinutes: 45,
    address: "Sundbybergsvägen 1F, 171 73 Solna",
    tables: {
      bookings: "bookings",
      overrides: "time_slot_overrides",
      waitlist: "waitlist",
      reviews: "reviews",
    },
    pricing: { adultRates: [349, 329, 299], childRates: [299, 279, 249] },
  },
  ronneby: {
    id: "ronneby",
    basePath: "/ronneby",
    sessionMinutes: 30, // includes the instructions walkthrough
    address: "Karlskronagatan 32, Ronneby",
    tables: {
      bookings: "bookings_ronneby",
      overrides: "time_slot_overrides_ronneby",
      waitlist: "waitlist_ronneby",
      reviews: "reviews_ronneby",
    },
    pricing: { adultRates: [329, 299, 249], childRates: [279, 249, 199] },
  },
};

export const ALL_LOCATIONS: LocationId[] = ["solna", "ronneby"];

export function getLocation(location?: string | null): EdgeLocation {
  return location === "ronneby" ? LOCATIONS.ronneby : LOCATIONS.solna;
}

export function getTables(location?: string | null) {
  return getLocation(location).tables;
}

export function getPricing(location?: string | null) {
  return getLocation(location).pricing;
}
