// Helpers for displaying a booking's time slot alongside a custom session
// duration (e.g. admin assigns a birthday party 2 hours instead of the usual
// 45-minute slot, or a Ronneby customer books several consecutive 30-minute
// slots back to back).
//
// A session longer than the location's default occupies every slot it runs
// over: the backend reserves one booking row per covered slot, so those times
// stop being bookable by anyone else. coveredSlotTimes() below mirrors that
// server-side rule (see coveredSlotTimes in supabase/functions/_shared/
// locations.ts) so the admin panel can preview exactly what will be taken.
//
// Also mirrored in supabase/functions/send-booking-confirmation/template.ts
// for the confirmation email, since edge functions can't import from src/.

export const addMinutesToTime = (time: string, minutes: number): string => {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
};

export const formatDurationLabel = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

// Plain start time when there's no custom duration (or it matches the
// location default), otherwise "18:00-20:30 (2h 30min)".
export const formatSlotLabel = (
  startTime: string,
  durationMinutes: number | null | undefined,
  defaultMinutes: number
): string => {
  if (!durationMinutes || durationMinutes === defaultMinutes) return startTime;
  const endTime = addMinutesToTime(startTime, durationMinutes);
  return `${startTime}-${endTime} (${formatDurationLabel(durationMinutes)})`;
};

// Every slot a session occupies: its own start time, plus each of the given
// day's default slots starting inside [start, start + duration). The end is
// exclusive, so a 12:00-14:00 booking takes 12:00 and 13:00 (hourly) and
// leaves 14:00 free. Pass `daySlots` from generateDefaultTimeSlots().
export const coveredSlotTimes = (
  daySlots: string[],
  startTime: string,
  durationMinutes: number
): string[] => {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const start = toMin(startTime);
  const end = start + Math.max(1, durationMinutes);

  const covered = new Set<string>([startTime]);
  for (const slot of daySlots) {
    const slotStart = toMin(slot);
    if (slotStart >= start && slotStart < end) covered.add(slot);
  }

  return [...covered].sort((a, b) => toMin(a) - toMin(b));
};

// Common duration choices offered in admin dropdowns, in minutes.
export const DURATION_OPTIONS_MINUTES = [
  15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240,
];

// Broad half-hour time grid (08:00-23:30) used by admin time-slot pickers so
// any custom/off-grid booking time (e.g. 18:30) can always be selected,
// regardless of the location's normal public schedule.
export const ADMIN_TIME_OPTIONS: string[] = Array.from({ length: 32 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30;
  const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
  const m = (totalMin % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
});
