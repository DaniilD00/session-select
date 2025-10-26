import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";
import { format } from "date-fns";

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
  return (
    <div className="space-y-4">
      <div className="booking-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          <span>Available times for {format(selectedDate, "MMMM d, yyyy")}</span>
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
          Session Details
        </div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 45-minute session duration</li>
          <li>• Interactive game for 1-6 players</li>
          <li>• Adults and children are welcome</li>
        </ul>
      </div>
    </div>
  );
};