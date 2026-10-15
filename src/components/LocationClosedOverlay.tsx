import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteLocation } from "@/contexts/LocationContext";
import { LOCATIONS } from "@/config/locations";

// Full-screen notice for locations flagged `closed` in config/locations.ts,
// pointing visitors to the open location. Dismissing it lets them browse the
// page (booking stays disabled there); it stays dismissed while they navigate
// within the site and shows again on the next visit.
export const LocationClosedOverlay = () => {
  const { t } = useTranslation();
  const { config } = useSiteLocation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const target = LOCATIONS.ronneby;
  const open = config.closed && !dismissed && !pathname.startsWith("/admin");

  // Accent follows the target location's colour ("r, g, b").
  const accent = (alpha: number) => `rgba(${target.background.pixelColor}, ${alpha})`;

  const goToTarget = () => {
    setDismissed(true);
    navigate(target.basePath);
    window.scrollTo({ top: 0 });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && setDismissed(true)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 px-6 py-10 text-center shadow-2xl sm:px-10"
            style={{ boxShadow: `0 0 80px ${accent(0.18)}` }}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${accent(0.35)} 0%, transparent 65%)` }}
            />

            <DialogPrimitive.Close
              aria-label={t("closedLocation.close")}
              className="absolute right-3 top-3 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>

            <div className="relative">
              <div
                className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: accent(0.15), color: `rgb(${target.background.pixelColor})` }}
              >
                <MapPin className="h-7 w-7" />
              </div>

              <DialogPrimitive.Title className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                {t("closedLocation.title", { city: config.city })}
              </DialogPrimitive.Title>

              <DialogPrimitive.Description className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-white/70">
                {t("closedLocation.body", { city: config.city, target: target.city })}
              </DialogPrimitive.Description>

              <Button
                onClick={goToTarget}
                size="lg"
                className="mt-8 h-auto w-full px-8 py-4 text-lg font-semibold text-white shadow-lg transition-opacity hover:opacity-90 sm:w-auto"
                style={{ backgroundColor: `rgb(${target.background.pixelColor})` }}
              >
                {t("closedLocation.cta", { target: target.city })}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <DialogPrimitive.Close className="mt-5 block w-full text-sm font-medium text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline">
                {t("closedLocation.continue", { city: config.city })}
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
