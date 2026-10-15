import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";

// Cloudflare Turnstile CAPTCHA widget.
// Enabled by setting VITE_TURNSTILE_SITE_KEY at build time (GitHub secret) and
// TURNSTILE_SECRET_KEY on the edge functions, which verify every token. When
// the site key is missing the widget is not rendered and the flows work as
// before. A token is single-use: after a failed attempt, remount the widget
// (change its `key`) to get a fresh one.

// Must be written exactly as `import.meta.env.VITE_…`: Vite only substitutes
// that literal form. The previous `import.meta?.env?.…` was never replaced,
// so the key was always undefined and the CAPTCHA could never switch on.
const SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export const isCaptchaEnabled = Boolean(SITE_KEY);

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Failed to load Turnstile"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface TurnstileWidgetProps {
  /** Called with the token when solved, and with null when it expires/errors. */
  onToken: (token: string | null) => void;
  /** Which form this protects; the server checks it so tokens can't be reused across forms. */
  action: "booking" | "waitlist";
  /** Force a look for pages that don't follow the site theme. */
  theme?: "light" | "dark";
}

export function TurnstileWidget({ onToken, action, theme: forcedTheme }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const { i18n } = useTranslation();
  const [siteTheme] = useTheme();
  const theme = forcedTheme ?? siteTheme;
  const language = i18n.language === "en" ? "en" : "sv";

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;

    let widgetId: string | null = null;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          action,
          theme,
          language,
          "refresh-expired": "auto",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "timeout-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        // Script blocked/unreachable — leave token null; server decides policy.
      });

    return () => {
      cancelled = true;
      onTokenRef.current(null);
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // widget already gone
        }
      }
    };
    // Re-render in the new theme/language; this also issues a fresh token.
  }, [action, theme, language]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="flex justify-center min-h-[65px]" />;
}
