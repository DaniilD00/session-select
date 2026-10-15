import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Cookie, X } from "lucide-react";
import { useSiteLocation } from "@/contexts/LocationContext";
import {
  closeConsentSettings,
  ConsentChoice,
  initConsent,
  saveConsent,
  useConsent,
} from "@/lib/consent";
import { cn } from "@/lib/utils";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// First visit: a small card with "Accept all" and "Only necessary" side by side
// (refusing is as easy as accepting), plus "Customise". Reopened from the
// footer's "Cookie settings" link to change or withdraw consent.
export const CookieConsent = () => {
  const { t } = useTranslation();
  const { to } = useSiteLocation();
  const { choice, settingsOpen } = useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [draft, setDraft] = useState<ConsentChoice>({ analytics: false, external: false });

  useEffect(() => {
    initConsent();
  }, []);

  // Reopening shows the detailed view with the current choice filled in.
  useEffect(() => {
    if (settingsOpen) {
      setDraft(choice ?? { analytics: false, external: false });
      setShowDetails(true);
    }
  }, [settingsOpen, choice]);

  const visible = choice === null || settingsOpen;
  if (!visible) return null;

  const acceptAll = () => saveConsent({ analytics: true, external: true });
  const onlyNecessary = () => saveConsent({ analytics: false, external: false });

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="theme-venue fixed inset-x-3 bottom-3 z-[70] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[26rem]"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card/95 text-foreground shadow-2xl backdrop-blur-md">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 id="cookie-title" className="font-semibold">{t("cookie.title")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("cookie.message")}{" "}
                <Link to={to("/integritetspolicy")} className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
                  {t("cookie.readMore")}
                </Link>
              </p>
            </div>
            {settingsOpen && choice !== null && (
              <button
                type="button"
                onClick={closeConsentSettings}
                aria-label={t("cookie.close")}
                className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showDetails && (
            <ul className="mt-5 space-y-4 border-t border-border pt-4">
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("cookie.necessary")}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t("cookie.necessaryDesc")}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("cookie.alwaysOn")}
                </span>
              </li>
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("cookie.analytics")}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t("cookie.analyticsDesc")}</p>
                </div>
                <Switch
                  checked={draft.analytics}
                  onChange={(analytics) => setDraft((d) => ({ ...d, analytics }))}
                  label={t("cookie.analytics")}
                />
              </li>
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("cookie.external")}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t("cookie.externalDesc")}</p>
                </div>
                <Switch
                  checked={draft.external}
                  onChange={(external) => setDraft((d) => ({ ...d, external }))}
                  label={t("cookie.external")}
                />
              </li>
            </ul>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            {showDetails ? (
              <button
                type="button"
                onClick={() => saveConsent(draft)}
                className="h-10 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-foreground/5"
              >
                {t("cookie.save")}
              </button>
            ) : (
              <button
                type="button"
                onClick={onlyNecessary}
                className="h-10 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-foreground/5"
              >
                {t("cookie.onlyNecessary")}
              </button>
            )}
            <button
              type="button"
              onClick={acceptAll}
              className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
            >
              {t("cookie.acceptAll")}
            </button>
          </div>
          {!showDetails && (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="mt-3 w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("cookie.customise")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
