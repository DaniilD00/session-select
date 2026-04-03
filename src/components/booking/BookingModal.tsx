import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X, Mail, Loader2, CalendarSearch } from "lucide-react";
import { BookingCalendar } from "./BookingCalendar";
import { TimeSlotSelector } from "./TimeSlotSelector";
import { BookingForm } from "./BookingForm";
import { useAvailableTimeSlots, generateDefaultTimeSlots } from "@/hooks/useAvailableTimeSlots";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingDetails {
  date: Date | null;
  timeSlot: string | null;
  adults: number;
  children: number;
  totalPrice: number;
}

export const BookingModal = ({ isOpen, onClose }: BookingModalProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [highlightedTime, setHighlightedTime] = useState<string | null>(null);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(1);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isFindingNextDate, setIsFindingNextDate] = useState(false);

  // Fetch available time slots from Supabase
  const { timeSlots, loading } = useAvailableTimeSlots(selectedDate);

  const handleFindNextAvailable = async () => {
    setIsFindingNextDate(true);
    setHighlightedTime(null);
    try {
      // If we already have a selected date, search starting from tomorrow
      // so clicking "again" gives the next available day.
      const startDate = selectedDate ? new Date(selectedDate) : new Date();
      if (selectedDate) {
        startDate.setDate(startDate.getDate() + 1);
      }
      
      // Look up to 90 days ahead
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 90);

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      // Query bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("booking_date, time_slot")
        .gte("booking_date", startDateStr)
        .lte("booking_date", endDateStr)
        .not("payment_status", "in", "(cancelled,failed)");

      // Query overrides
      const { data: overrides } = await supabase
        .from("time_slot_overrides")
        .select("slot_date, time_slot, is_active")
        .gte("slot_date", startDateStr)
        .lte("slot_date", endDateStr);

      let foundDate: Date | null = null;
      let foundTime: string | null = null;
      const now = new Date();

      for (let i = 0; i <= 90; i++) {
        const currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        const dayBookings = bookings?.filter((b: any) => b.booking_date === dateStr) || [];
        const dayOverrides = overrides?.filter((o: any) => o.slot_date === dateStr) || [];

        const bookedSlots = new Set(dayBookings.map((b: any) => b.time_slot));
        const overrideMap = new Map<string, boolean>();
        dayOverrides.forEach((o: any) => overrideMap.set(o.time_slot, o.is_active));

        let generatedSlots = generateDefaultTimeSlots(currentDate);

        if (generatedSlots.length === 0) continue;

        let processedSlots = generatedSlots.map((slot: any) => ({
          ...slot,
          available:
            !bookedSlots.has(slot.time) &&
            (overrideMap.has(slot.time) ? overrideMap.get(slot.time)! : true),
        }));

        processedSlots = processedSlots.map((slot: any) => {
          const [hours, minutes] = slot.time.split(":").map(Number);
          const slotTime = new Date(currentDate);
          slotTime.setHours(hours, minutes, 0, 0);

          const diffMs = slotTime.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours < 22) {
            return { ...slot, available: false };
          }
          return slot;
        });

        const availableSlot = processedSlots.find((slot: any) => slot.available);
        if (availableSlot) {
          foundDate = currentDate;
          foundTime = availableSlot.time;
          break;
        }
      }

      if (foundDate) {
        setSelectedDate(foundDate);
        setHighlightedTime(foundTime);
      } else if (selectedDate) {
        // If we searched from selectedDate+1 and found nothing, maybe fallback to today?
        // Let's just reset the search to today if we hit the limit
        setSelectedDate(null);
      }
    } catch (error) {
      console.error("Error finding next available date:", error);
    } finally {
      setIsFindingNextDate(false);
    }
  };

  const calculatePrice = (adults: number, children: number): number => {
    const totalPeople = adults + children;
    const tier = totalPeople <= 2 ? 0 : totalPeople <= 4 ? 1 : 2;

    const adultRates = [349, 329, 299];
    const childRates = [299, 279, 249];

    const adultTotal = adults * adultRates[tier];
    const childTotal = children * childRates[tier];

    return adultTotal + childTotal;
  };

  const bookingDetails: BookingDetails = {
    date: selectedDate,
    timeSlot: selectedTimeSlot,
    adults,
    children,
    totalPrice: calculatePrice(adults, children),
  };

  const handleTimeSlotSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setShowBookingForm(true);
  };

  const handleBackToCalendar = () => {
    setShowBookingForm(false);
    setSelectedTimeSlot(null);
  };

  const resetModal = () => {
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setHighlightedTime(null);
    setAdults(1);
    setChildren(0);
    setShowBookingForm(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  /* -------- shared inner content used by both Dialog and Drawer -------- */
  const bookingContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-background z-10 shrink-0">
        <h2 className="text-2xl font-semibold">
          {showBookingForm ? t('booking.completeTitle') : t('booking.bookSessionTitle')}
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-6 pb-8 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {!showBookingForm ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Calendar */}
            <div>
              <h3 className="text-xl font-semibold mb-4">{t('booking.selectDateHeader')}</h3>
              <BookingCalendar
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setHighlightedTime(null);
                }}
              />
            </div>

            {/* Time Slots */}
            <div>
              <h3 className="text-xl font-semibold mb-4">{t('booking.availableTimesHeader')}</h3>
              {selectedDate ? (
                loading ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <p>{t('booking.loadingTimes')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <TimeSlotSelector
                      timeSlots={timeSlots}
                      selectedDate={selectedDate}
                      onTimeSlotSelect={handleTimeSlotSelect}
                      highlightedTime={highlightedTime}
                    />
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        onClick={handleFindNextAvailable}
                        disabled={isFindingNextDate}
                        className="gap-2"
                      >
                        {isFindingNextDate ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CalendarSearch className="w-4 h-4" />
                        )}
                        {t('booking.findNextAvailable', 'Find next available slot')}
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center space-y-6">
                  <p>{t('booking.selectDatePrompt')}</p>
                  <Button 
                    onClick={handleFindNextAvailable}
                    disabled={isFindingNextDate}
                    className="gap-2"
                  >
                    {isFindingNextDate ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CalendarSearch className="w-4 h-4" />
                    )}
                    {t('booking.findNextAvailable', 'Find next available slot')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <BookingForm
            bookingDetails={bookingDetails}
            adults={adults}
            children={children}
            onAdultsChange={setAdults}
            onChildrenChange={setChildren}
            onBack={handleBackToCalendar}
            onClose={handleClose}
          />
        )}

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
          <span className="text-muted-foreground font-medium">{t('location.contact')}:</span>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a href="mailto:info@readypixelgo.se" className="hover:text-primary transition-colors font-medium">
                info@readypixelgo.se
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  /* -------- Mobile: Drawer (bottom sheet) — avoids iOS Safari fixed+transform bug -------- */
  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => { if (!open) handleClose(); }}
        shouldScaleBackground={false}
      >
        <DrawerContent className="max-h-[85dvh] max-h-[85vh] h-[85dvh] h-[85vh] flex flex-col p-0">
          {bookingContent}
        </DrawerContent>
      </Drawer>
    );
  }

  /* -------- Desktop: Dialog (centered modal) -------- */
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
        {bookingContent}
      </DialogContent>
    </Dialog>
  );
};  