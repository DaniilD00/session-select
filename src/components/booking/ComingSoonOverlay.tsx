import { Button } from "@/components/ui/button";
import { X, Sparkles, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSiteLocation } from "@/contexts/LocationContext";
import { cn } from "@/lib/utils";

interface ComingSoonOverlayProps {
  onClose: () => void;
  className?: string;
}

// Pre-launch teaser layered on top of the booking UI for locations flagged
// `comingSoon` in config/locations.ts. The booking calendar stays visible but
// blurred underneath, so visitors see what's coming without being able to book.
export const ComingSoonOverlay = ({ onClose, className }: ComingSoonOverlayProps) => {
  const { t } = useTranslation();
  const { config, to } = useSiteLocation();

  // Accent glow follows the location's own background colour ("r, g, b").
  const accent = (alpha: number) => `rgba(${config.background.pixelColor}, ${alpha})`;
  // Darkened variant for text — the raw accent is too light to read on the
  // (white) frosted layer.
  const accentText = (() => {
    const [r, g, b] = config.background.pixelColor.split(",").map((n) => Number(n.trim()) * 0.55);
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  })();

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex items-center justify-center overflow-hidden",
        "bg-background/70 backdrop-blur-xl",
        "animate-in fade-in duration-300",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label={t("comingSoon.title")}
    >
      {/* Soft animated glow behind the message */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl animate-pulse"
        style={{
          background: `radial-gradient(circle, ${accent(0.28)} 0%, transparent 65%)`,
          animationDuration: "4s",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl animate-pulse"
        style={{
          background: `radial-gradient(circle, ${accent(0.22)} 0%, transparent 60%)`,
          animationDuration: "6s",
          animationDelay: "1.2s",
        }}
      />

      {/* Positioned to land exactly on the Dialog's own (frosted-over) close X. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("comingSoon.close")}
        className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-10 mx-auto max-h-full w-full max-w-lg overflow-y-auto px-6 py-10 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Pixel loader — on-brand nod to the LED floor */}
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-[3px] animate-pulse"
              style={{
                backgroundColor: accent(0.95),
                boxShadow: `0 0 12px ${accent(0.8)}`,
                animationDuration: "1.4s",
                animationDelay: `${i * 140}ms`,
              }}
            />
          ))}
        </div>

        <span
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em]"
          style={{
            borderColor: accent(0.5),
            backgroundColor: accent(0.12),
            color: accentText,
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t("comingSoon.badge", { city: config.city })}
        </span>

        <h2 className="mt-6 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          {t("comingSoon.title")}
        </h2>

        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {t("comingSoon.body", { city: config.city })}
        </p>

        <p
          className="mx-auto mt-6 inline-block rounded-2xl border px-5 py-3 text-base font-semibold text-foreground"
          style={{ borderColor: accent(0.35), backgroundColor: accent(0.1) }}
        >
          {t("comingSoon.eta")}
        </p>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          {t("comingSoon.hint")}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="booking-gradient w-full text-white sm:w-auto">
            <Link to={to("/launch")} onClick={onClose}>
              <Bell className="mr-2 h-5 w-5" />
              {t("comingSoon.notifyCta")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <a href="https://instagram.com/readypixelgo_swe" target="_blank" rel="noreferrer">
              <img
                src="/social/instagram-rounded-small.png"
                alt=""
                aria-hidden="true"
                className="mr-2 h-5 w-5 rounded"
              />
              {t("comingSoon.followCta")}
            </a>
          </Button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t("comingSoon.close")}
        </button>
      </div>
    </div>
  );
};
