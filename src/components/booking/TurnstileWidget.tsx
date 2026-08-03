import { useEffect, useRef } from "react";

// Cloudflare Turnstile CAPTCHA widget.
// Enabled by setting VITE_TURNSTILE_SITE_KEY (and TURNSTILE_SECRET_KEY on the
// create-payment edge function). When the site key is missing the widget is
// not rendered and the booking flow works exactly as before.

const SITE_KEY = (import.meta as unknown as { env?: Record<string, string | undefined> })
  ?.env?.VITE_TURNSTILE_SITE_KEY;

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
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;

    let widgetId: string | null = null;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
          theme: "auto",
        });
      })
      .catch(() => {
        // Script blocked/unreachable — leave token null; server decides policy.
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // widget already gone
        }
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="flex justify-center min-h-[65px]" />;
}
