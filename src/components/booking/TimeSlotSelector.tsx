import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotSelectorProps {
  timeSlots: TimeSlot[];
  selectedDate: Date;
  onTimeSlotSelect: (timeSlot: string) => void;
}

export const TimeSlotSelector = ({
  timeSlots,
  selectedDate,
  onTimeSlotSelect,
}: TimeSlotSelectorProps) => {
  const { t, i18n } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div className="booking-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          <span>{t('calendar.availableTimes', { date: format(selectedDate, "d MMMM yyyy", { locale: i18n.language === 'sv' ? sv : enUS }) })}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {timeSlots.map((slot) => (
            <Button
              key={slot.time}
              variant={slot.available ? "outline" : "secondary"}
              disabled={!slot.available}
              onClick={() => onTimeSlotSelect(slot.time)}
              className={`booking-transition hover:scale-105 ${
                slot.available
                  ? "hover:bg-primary hover:text-primary-foreground border-primary/20"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              {slot.time}
            </Button>
          ))}
        </div>
      </div>

      <div className="booking-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Users className="h-4 w-4 text-primary" />
          {t('booking.sessionDetails')}
        </div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>{t('booking.durationDetail')}</li>
          <li>{t('booking.playersDetail')}</li>
          <li>{t('booking.welcomeDetail')}</li>
        </ul>
      </div>
    </div>
  );
};