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

        // Query bookings for the selected date
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("time_slot, payment_status")
          .eq("booking_date", dateStr)
          .in("payment_status", ["paid", "pending"]); // Consider both paid and pending bookings

        if (error) {
          console.error("Error fetching bookings:", error);
          setTimeSlots(generateDefaultTimeSlots());
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
        const slots = generateDefaultTimeSlots().map((slot) => ({
          ...slot,
          available:
            !bookedSlots.has(slot.time) &&
            (overrideMap.has(slot.time) ? overrideMap.get(slot.time)! : true),
        }));

        setTimeSlots(slots);
      } catch (error) {
        console.error("Error in fetchAvailableSlots:", error);
        setTimeSlots(generateDefaultTimeSlots());
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();

    // Set up real-time subscription for booking updates
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  return { timeSlots, loading };
};

// Generate default time slots (10:00 to 19:00, every hour)
export const generateDefaultTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 10; hour <= 19; hour++) {
    slots.push({
      time: `${hour.toString().padStart(2, "0")}:00`,
      available: true,
    });
  }
  return slots;
};
