import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { LocationConfig, LOCATIONS, DaySchedule, isAfterLastBookableDate } from "@/config/locations";

export interface TimeSlot {
  time: string;
  available: boolean;
}

export const useAvailableTimeSlots = (
  selectedDate: Date | null,
  config: LocationConfig = LOCATIONS.solna
) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      // Generate default time slots when no date selected
      setTimeSlots(generateDefaultTimeSlots(null, config));
      return;
    }

    // Past the venue's closing date there is nothing to offer, and no reason to
    // query. The modal shows the closing notice instead of an empty grid.
    if (isAfterLastBookableDate(config, selectedDate)) {
      setTimeSlots([]);
      return;
    }

    const fetchAvailableSlots = async () => {
      setLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        // Release pending bookings that have expired before fetching
        try {
          await supabase.functions.invoke("release-stale-bookings", {
            body: { date: dateStr, location: config.id },
          });
        } catch (cleanupError) {
          console.warn("Failed to release stale bookings", cleanupError);
        }

        // Query bookings for the selected date.
        // Any non-cancelled/non-failed booking should block the slot.
        const { data: bookings, error } = await supabase
          .from(config.tables.bookings as "bookings")
          .select("time_slot, payment_status")
          .eq("booking_date", dateStr)
          .not("payment_status", "in", "(cancelled,failed)");

        if (error) {
          console.error("Error fetching bookings:", error);
          setTimeSlots(applyLeadTimeFilter(
            generateDefaultTimeSlots(selectedDate, config),
            selectedDate,
            config.bookingLeadTimeHours
          ));
          return;
        }

        // Fetch manual overrides for this date
        const { data: overrides, error: overridesError } = await supabase
          .from(config.tables.overrides as "time_slot_overrides")
          .select("time_slot, is_active")
          .eq("slot_date", dateStr);

        if (overridesError) {
          console.error("Error fetching time slot overrides:", overridesError);
        }

        const overrideMap = new Map<string, boolean>();
        overrides?.forEach((item) => {
          overrideMap.set(item.time_slot, item.is_active);
        });

        // Get booked time slots
        const bookedSlots = new Set(
          bookings?.map((booking) => booking.time_slot) || []
        );

        // Generate time slots with availability
        let defaultSlots = generateDefaultTimeSlots(selectedDate, config);

        // Add any active overrides that are not in the default slots
        const defaultTimes = new Set(defaultSlots.map((s) => s.time));
        overrides?.forEach((item) => {
          if (item.is_active && !defaultTimes.has(item.time_slot)) {
            defaultSlots.push({ time: item.time_slot, available: true });
          }
        });

        // Sort the slots by time
        defaultSlots.sort((a, b) => a.time.localeCompare(b.time));

        let slots = defaultSlots.map((slot) => ({
          ...slot,
          available:
            !bookedSlots.has(slot.time) &&
            (overrideMap.has(slot.time) ? overrideMap.get(slot.time)! : true),
        }));

        // Filter out past time slots + the location's lead-time buffer
        slots = applyLeadTimeFilter(slots, selectedDate, config.bookingLeadTimeHours);

        setTimeSlots(slots);
      } catch (error) {
        console.error("Error in fetchAvailableSlots:", error);
        setTimeSlots(applyLeadTimeFilter(
            generateDefaultTimeSlots(selectedDate, config),
            selectedDate,
            config.bookingLeadTimeHours
          ));
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();

    // Set up real-time subscription for booking updates
    // Wrapped in try-catch: Safari/iOS may block the WebSocket and throw
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`bookings-changes-${config.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: config.tables.bookings,
            filter: `booking_date=eq.${format(selectedDate, "yyyy-MM-dd")}`,
          },
          () => {
            // Refetch when bookings change
            fetchAvailableSlots();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime subscription failed (WebSocket may be blocked):", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {
          // ignore cleanup errors
        }
      }
    };
  }, [selectedDate, config]);

  return { timeSlots, loading };
};

// Mark slots starting sooner than the location's lead time as unavailable.
// Applied on every path (including the no-bookings fallback) so a slot staff
// can't prepare for is never bookable.
export const applyLeadTimeFilter = (
  slots: TimeSlot[],
  selectedDate: Date,
  leadTimeHours: number
): TimeSlot[] => {
  const now = new Date();
  return slots.map((slot) => {
    const [hours, minutes] = slot.time.split(":").map(Number);
    const slotTime = new Date(selectedDate);
    slotTime.setHours(hours, minutes, 0, 0);
    const diffHours = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < leadTimeHours ? { ...slot, available: false } : slot;
  });
};

const pad = (n: number) => n.toString().padStart(2, "0");

// Build the bookable times for a single day from its schedule rule.
const buildSlotsFromSchedule = (schedule: DaySchedule): TimeSlot[] => {
  const slots: TimeSlot[] = [];

  if (schedule.hours && schedule.hours.length) {
    for (const hour of schedule.hours) {
      slots.push({ time: `${pad(hour)}:00`, available: true });
    }
    return slots;
  }

  if (schedule.start && schedule.end) {
    const [sh, sm] = schedule.start.split(":").map(Number);
    const [eh, em] = schedule.end.split(":").map(Number);
    const interval = schedule.intervalMinutes ?? 60;
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur <= end) {
      slots.push({ time: `${pad(Math.floor(cur / 60))}:${pad(cur % 60)}`, available: true });
      cur += interval;
    }
  }

  return slots;
};

// Generate the default (unbooked) time slots for a location on a given date.
// Solna uses a weekday/weekend split; Ronneby uses the same interval every day.
// With no date, falls back to the weekend schedule for the preview list.
export const generateDefaultTimeSlots = (
  date?: Date | null,
  config: LocationConfig = LOCATIONS.solna
): TimeSlot[] => {
  const rule = config.timeSlotRule;

  if (date) {
    const day = date.getDay();
    const schedule = day >= 1 && day <= 5 ? rule.weekday : rule.weekend;
    return buildSlotsFromSchedule(schedule);
  }

  return buildSlotsFromSchedule(rule.weekend);
};
