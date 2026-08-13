// Shared per-location config for Supabase edge functions (Deno runtime).
// Edge functions cannot import from the frontend src/, so this mirrors the
// relevant parts of src/config/locations.ts. Keep the two in sync when changing
// table names or pricing.
//
// Every function defaults to "solna" when no/invalid location is supplied, so
// the original single-location behaviour is fully backwards compatible.

export type LocationId = "solna" | "ronneby";

// A day's bookable times: either explicit on-the-hour hours, or an interval
// range. Mirrors DaySchedule/TimeSlotRule in src/config/locations.ts.
export interface DaySchedule {
  hours?: number[]; // e.g. [19, 20] -> 19:00, 20:00
  start?: string; // "HH:MM"
  end?: string; // "HH:MM" (inclusive)
  intervalMinutes?: number; // e.g. 30 -> 11:00, 11:30, ...
}

export interface TimeSlotRule {
  weekday: DaySchedule; // Mon-Fri
  weekend: DaySchedule; // Sat-Sun
}

export interface EdgeLocation {
  id: LocationId;
  basePath: string; // "" for Solna (root), "/ronneby" for Ronneby
  sessionMinutes: number;
  address: string; // venue address used in emails / calendar invites
  timeSlotRule: TimeSlotRule;
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
    timeSlotRule: {
      weekday: { hours: [19, 20] },
      weekend: { start: "10:00", end: "20:00", intervalMinutes: 60 },
    },
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
    address: "Karlskronagatan 32, 372 30 Ronneby",
    timeSlotRule: {
      weekday: { start: "11:00", end: "20:00", intervalMinutes: 30 },
      weekend: { start: "11:00", end: "20:00", intervalMinutes: 30 },
    },
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

/* ===================================================================
 * Time-slot grid helpers
 *
 * Mirrors generateDefaultTimeSlots() in src/hooks/useAvailableTimeSlots.ts.
 * Used to work out which bookable slots a session actually occupies, so a
 * booking longer than the location's default session length blocks every
 * slot it runs over instead of only its start time.
 * =================================================================== */

const pad = (n: number) => n.toString().padStart(2, "0");

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (total: number): string => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

function buildDaySlots(schedule: DaySchedule): string[] {
  if (schedule.hours && schedule.hours.length) {
    return schedule.hours.map((hour) => `${pad(hour)}:00`);
  }

  const slots: string[] = [];
  if (schedule.start && schedule.end) {
    const interval = schedule.intervalMinutes ?? 60;
    const end = toMinutes(schedule.end);
    for (let cur = toMinutes(schedule.start); cur <= end; cur += interval) {
      slots.push(fromMinutes(cur));
    }
  }
  return slots;
}

/**
 * The location's default bookable start times for a given "YYYY-MM-DD".
 * Parsed as UTC so the weekday never shifts with the server's timezone.
 */
export function defaultSlotsForDate(location: string | null | undefined, dateStr: string): string[] {
  const rule = getLocation(location).timeSlotRule;
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const schedule = day >= 1 && day <= 5 ? rule.weekday : rule.weekend;
  return buildDaySlots(schedule);
}

/**
 * Every slot a session occupies: its own start time, plus each of the
 * location's default slots that begins inside [start, start + duration).
 *
 * The end is exclusive — a 12:00-14:00 booking occupies 12:00 and 13:00 at
 * Solna (hourly) or 12:00/12:30/13:00/13:30 at Ronneby (half-hourly), and
 * leaves 14:00 free for the next guests.
 *
 * The start time is always included even when it is off-grid (e.g. an admin
 * booking a custom 18:30 slot at Solna), so the booking still occupies the
 * exact time it was made for.
 */
export function coveredSlotTimes(
  location: string | null | undefined,
  dateStr: string,
  startTime: string,
  durationMinutes: number
): string[] {
  const start = toMinutes(startTime);
  const end = start + Math.max(1, durationMinutes);

  const covered = new Set<string>([startTime]);
  for (const slot of defaultSlotsForDate(location, dateStr)) {
    const slotStart = toMinutes(slot);
    if (slotStart >= start && slotStart < end) covered.add(slot);
  }

  return [...covered].sort((a, b) => toMinutes(a) - toMinutes(b));
}
