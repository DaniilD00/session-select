import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSiteLocation } from "@/contexts/LocationContext";

// Celebratory confetti burst (canvas-confetti is loaded lazily and is optional —
// if it ever fails to load the badge still renders).
const fireConfetti = async () => {
  try {
    const { default: confetti } = await import("canvas-confetti");
    const colors = ["#22c55e", "#16a34a", "#ffffff", "#bbf7d0"];
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.25 }, colors });
    setTimeout(
      () => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.4 }, colors }),
      180
    );
    setTimeout(
      () => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.4 }, colors }),
      360
    );
  } catch {
    /* confetti is optional */
  }
};

// Top-left corner ribbon shown for newly launched locations, plus a one-time
// confetti burst (once per browser session per location).
export const LaunchBadge = () => {
  const { config } = useSiteLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (!config.isNew) return;
    try {
      const key = `rpg-confetti-${config.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return; // storage blocked -> skip confetti
    }
    fireConfetti();
  }, [config.id, config.isNew]);

  if (!config.isNew) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[60] h-28 w-28 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -left-12 top-5 w-44 -rotate-45 bg-gradient-to-r from-emerald-500 to-green-600 py-1.5 text-center text-sm font-bold uppercase tracking-wider text-white shadow-lg">
        {t("launchBadge.new", "Nytt")}
      </div>
    </div>
  );
};
