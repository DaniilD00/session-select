import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { BookingCalendar } from "./BookingCalendar";
import { TimeSlotSelector } from "./TimeSlotSelector";
import { BookingForm } from "./BookingForm";

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Generate time slots (10:00 to 20:00, every hour)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 10; hour <= 19; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        available: Math.random() > 0.3, // Simulate availability
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

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
              {showBookingForm ? "Complete Your Booking" : "Book Your Session"}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pb-8 min-h-0">
            {!showBookingForm ? (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Calendar */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Select Date</h3>
                  <BookingCalendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>

                {/* Time Slots */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Available Times</h3>
                  {selectedDate ? (
                    <TimeSlotSelector
                      timeSlots={timeSlots}
                      selectedDate={selectedDate}
                      onTimeSlotSelect={handleTimeSlotSelect}
                    />
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <p>Please select a date to view available time slots</p>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};