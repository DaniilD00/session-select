import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Mail } from "lucide-react";
import { BookingCalendar } from "./BookingCalendar";
import { TimeSlotSelector } from "./TimeSlotSelector";
import { BookingForm } from "./BookingForm";
import { useAvailableTimeSlots } from "@/hooks/useAvailableTimeSlots";
import { useTranslation } from "react-i18next";

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(1);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Fetch available time slots from Supabase
  const { timeSlots, loading } = useAvailableTimeSlots(selectedDate);

  const calculatePrice = (adults: number, children: number): number => {
    const totalPeople = adults + children;
    const tier = totalPeople <= 2 ? 0 : totalPeople <= 4 ? 1 : 2;

    const adultRates = [350, 330, 300];
    const childRates = [300, 280, 250];

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
    setAdults(1);
    setChildren(0);
    setShowBookingForm(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background z-10">
            <h2 className="text-2xl font-semibold">
              {showBookingForm ? t('booking.completeTitle') : t('booking.bookSessionTitle')}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pb-8 min-h-0">
            {!showBookingForm ? (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Calendar */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('booking.selectDateHeader')}</h3>
                  <BookingCalendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
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
                      <TimeSlotSelector
                        timeSlots={timeSlots}
                        selectedDate={selectedDate}
                        onTimeSlotSelect={handleTimeSlotSelect}
                      />
                    )
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <p>{t('booking.selectDatePrompt')}</p>
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

            <div className="mt-8 pt-6 border-t flex justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{t('location.contact')}: </span>
                <a href="mailto:info@readypixelgo.se" className="hover:text-primary transition-colors font-medium">
                  info@readypixelgo.se
                </a>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};