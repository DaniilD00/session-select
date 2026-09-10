import { Button } from "@/components/ui/button";
import { CalendarOff, Sparkles, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useSiteLocation } from "@/contexts/LocationContext";

// Shown in place of the time slots when a guest picks a date after the venue's
// last bookable day. Explains the closure and points at what comes next. The
// campaign code is deliberately not printed here — it goes out on social only.
export const ClosingNotice = () => {
  const { t, i18n } = useTranslation();
  const { config, to } = useSiteLocation();

  if (!config.lastBookableDate) return null;

  const [y, m, d] = config.lastBookableDate.split("-").map(Number);
  const lastDay = format(new Date(y, m - 1, d), "d MMMM yyyy", {
    locale: i18n.language === "sv" ? sv : enUS,
  });

  return (
    <div className="booking-card rounded-xl p-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CalendarOff className="h-7 w-7" />
      </div>

      <h4 className="text-xl font-semibold text-foreground">
        {t("closing.title", { city: config.city })}
      </h4>

      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted-foreground">
        {t("closing.body", { city: config.city, date: lastDay })}
      </p>

      {/* Plain text, not a pill — the only button here is the notify CTA. */}
      <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4 shrink-0" />
        {t("closing.newLocations")}
      </p>

      <Button asChild variant="outline" className="mt-6 gap-2">
        <Link to={to("/launch")}>
          <Bell className="h-4 w-4" />
          {t("closing.notifyCta")}
        </Link>
      </Button>
    </div>
  );
};
