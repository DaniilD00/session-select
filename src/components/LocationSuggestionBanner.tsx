import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSiteLocation } from "@/contexts/LocationContext";
import { getLocationById, LOCATIONS } from "@/config/locations";

const CHOICE_KEY = "rpg-location-choice";

// Lightweight, dismissible suggestion shown to Solna visitors who appear to be
// in southern Sweden, nudging them toward the Ronneby location. Detection runs
// server-side via the geo-locate edge function (the page CSP blocks direct
// third-party calls), and the visitor's choice is remembered so it shows once.
export const LocationSuggestionBanner = () => {
  const { config } = useSiteLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only suggest on the public Solna site, and only if Ronneby is live.
    if (config.id !== "solna" || !LOCATIONS.ronneby.enabled) return;
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) return;

    let cancelled = false;

    try {
      if (localStorage.getItem(CHOICE_KEY)) return;
    } catch {
      return; // storage blocked -> skip silently
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("geo-locate");
        if (error || cancelled || !data) return;
        if (data.suggestedLocation === "ronneby") setShow(true);
      } catch {
        // geo-locate unavailable -> no suggestion
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.id]);

  const remember = (value: string) => {
    try {
      localStorage.setItem(CHOICE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  const goToRonneby = () => {
    remember("ronneby");
    setShow(false);
    navigate(getLocationById("ronneby").basePath || "/ronneby");
  };

  const dismiss = () => {
    remember("solna");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] bg-primary text-primary-foreground shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 text-sm">
        <MapPin className="h-4 w-4 shrink-0" />
        <p className="flex-1">
          {t(
            "geoBanner.message",
            "Det ser ut som att du är nära Ronneby. Vill du boka där istället?"
          )}
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={goToRonneby}
          className="h-8 shrink-0"
        >
          {t("geoBanner.goRonneby", "Till Ronneby")}
        </Button>
        <button
          onClick={dismiss}
          aria-label={t("geoBanner.dismiss", "Stäng")}
          className="shrink-0 rounded p-1 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
