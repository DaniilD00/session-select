import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Cookie, ChevronDown } from "lucide-react";

const CONSENT_KEY = "rpg-cookie-consent"; // "all" | "necessary"
const CS_SCRIPT_URL = "https://t.contentsquare.net/uxa/c904a8b227c7c.js";

/** Inject ContentSquare analytics script once */
const loadAnalytics = () => {
  if (document.querySelector(`script[src="${CS_SCRIPT_URL}"]`)) return;
  const s = document.createElement("script");
  s.src = CS_SCRIPT_URL;
  s.async = true;
  document.head.appendChild(s);
};

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent) {
      // Returning visitor — load analytics if they previously accepted
      if (consent === "all") loadAnalytics();
      return;
    }
    // First visit — show banner after short delay
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "all");
    loadAnalytics();
    setVisible(false);
  };

  const save = () => {
    localStorage.setItem(CONSENT_KEY, analyticsOn ? "all" : "necessary");
    if (analyticsOn) loadAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
        {/* Main row */}
        <div className="px-4 py-3 flex items-center gap-3">
          <Cookie className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground leading-snug flex-1">
            {t("cookie.message")}
          </p>
          <button
            onClick={accept}
            className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            {t("cookie.accept")}
          </button>
        </div>

        {/* Settings toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground pb-2 transition-colors"
        >
          {t("cookie.more")}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {/* Expanded settings panel */}
        {expanded && (
          <div className="border-t border-border px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Necessary — always on */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">{t("cookie.necessary")}</p>
                <p className="text-[11px] text-muted-foreground">{t("cookie.necessaryDesc")}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                {t("cookie.alwaysOn")}
              </span>
            </div>

            {/* Analytics — toggleable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">{t("cookie.analytics")}</p>
                <p className="text-[11px] text-muted-foreground">{t("cookie.analyticsDesc")}</p>
              </div>
              <button
                onClick={() => setAnalyticsOn(!analyticsOn)}
                className={`relative w-9 h-5 rounded-full transition-colors ${analyticsOn ? "bg-primary" : "bg-muted-foreground/30"}`}
                aria-label="Toggle analytics"
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${analyticsOn ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>

            {/* Save button */}
            <button
              onClick={save}
              className="w-full bg-primary text-primary-foreground text-xs font-semibold py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              {t("cookie.save")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
