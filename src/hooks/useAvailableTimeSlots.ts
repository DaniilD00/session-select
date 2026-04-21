import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface TimeSlot {
  time: string;
  available: boolean;
}

export const useAvailableTimeSlots = (selectedDate: Date | null) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      // Generate default time slots when no date selected
      setTimeSlots(generateDefaultTimeSlots());
      return;
    }

    const fetchAvailableSlots = async () => {
      setLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        // Release pending bookings that have expired before fetching
        try {
          await supabase.functions.invoke("release-stale-bookings", {
            body: { date: dateStr },
          });
        } catch (cleanupError) {
          console.warn("Failed to release stale bookings", cleanupError);
        }

        // Query bookings for the selected date.
        // Any non-cancelled/non-failed booking should block the slot.
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("time_slot, payment_status")
          .eq("booking_date", dateStr)
          .not("payment_status", "in", "(cancelled,failed)");

        if (error) {
          console.error("Error fetching bookings:", error);
          setTimeSlots(generateDefaultTimeSlots(selectedDate));
          return;
        }

        // Fetch manual overrides for this date
        const { data: overrides, error: overridesError } = await supabase
          .from("time_slot_overrides")
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
        let defaultSlots = generateDefaultTimeSlots(selectedDate);
        
        // Add any active overrides that are not in the default slots
        const defaultTimes = new Set(defaultSlots.map(s => s.time));
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

        // Filter out past time slots + 22 hours buffer
        const now = new Date();
        slots = slots.map((slot) => {
          const [hours, minutes] = slot.time.split(":").map(Number);
          const slotTime = new Date(selectedDate);
          slotTime.setHours(hours, minutes, 0, 0);

          // Calculate difference in milliseconds
          const diffMs = slotTime.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours < 22) {
            return { ...slot, available: false };
          }
          return slot;
        });

        setTimeSlots(slots);
      } catch (error) {
        console.error("Error in fetchAvailableSlots:", error);
        setTimeSlots(generateDefaultTimeSlots(selectedDate));
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
        .channel("bookings-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
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
  }, [selectedDate]);

  return { timeSlots, loading };
};

// Generate default time slots
// Weekdays (Mon-Fri): 19:00 and 20:00 only
// Weekends (Sat-Sun): 10:00 to 20:00
export const generateDefaultTimeSlots = (date?: Date | null): TimeSlot[] => {
  const slots: TimeSlot[] = [];

  if (date) {
    const day = date.getDay();
    // Monday (1) to Friday (5)
    if (day >= 1 && day <= 5) {
      for (const hour of [19, 20]) {
        slots.push({
          time: `${hour.toString().padStart(2, "0")}:00`,
          available: true,
        });
      }
      return slots;
    }
  }

  // Weekends (or no date): 10:00 to 20:00
  for (let hour = 10; hour <= 20; hour++) {
    slots.push({
      time: `${hour.toString().padStart(2, "0")}:00`,
      available: true,
    });
  }
  return slots;
};
