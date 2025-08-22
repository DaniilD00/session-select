import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | undefined) => void;
}

export const BookingCalendar = ({ selectedDate, onDateSelect }: BookingCalendarProps) => {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3); // Allow bookings up to 3 months in advance

  return (
    <div className="booking-card rounded-xl p-4">
      <Calendar
        mode="single"
        selected={selectedDate || undefined}
        onSelect={onDateSelect}
        disabled={(date) => date < today || date > maxDate}
        className={cn("pointer-events-auto")}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-lg font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: "h-7 w-7 bg-transparent p-0 hover:bg-accent hover:text-accent-foreground rounded-md booking-transition",
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative booking-transition hover:bg-accent hover:text-accent-foreground rounded-md",
          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 booking-transition",
          day_range_end: "day-range-end",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
      />
    </div>
  );
};