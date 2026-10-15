import { useSyncExternalStore } from "react";

// Cookie consent, following the GDPR / ePrivacy rules the Swedish IMY applies:
// - nothing optional runs before the visitor chooses; every category starts off
// - refusing is as easy as accepting (both buttons on the first layer)
// - the choice can be changed or withdrawn at any time (footer link)
// - a choice is re-asked after 12 months, or when the categories change
//
// Strictly necessary storage needs no consent and is always on: this choice
// itself, theme and language preferences, and the booking flow's security
// and payment providers (Cloudflare Turnstile, Stripe).

export interface ConsentChoice {
  analytics: boolean; // Contentsquare
  external: boolean; // Google Maps embed
}

interface StoredConsent extends ConsentChoice {
  v: number;
  ts: number; // when the choice was made (ms)
}

const STORAGE_KEY = "rpg-cookie-consent";
// Bump when categories change so everyone is asked again.
const CONSENT_VERSION = 2;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const CONTENTSQUARE_SRC = "https://t.contentsquare.net/uxa/c904a8b227c7c.js";

type State = { choice: ConsentChoice | null; settingsOpen: boolean };

const listeners = new Set<() => void>();
let state: State = { choice: readStored(), settingsOpen: false };

function readStored(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // Choices saved by the old banner ("all" / "necessary") predate the map
    // category and a real opt-in, so they are asked again.
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed?.v !== CONSENT_VERSION || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return { analytics: parsed.analytics === true, external: parsed.external === true };
  } catch {
    return null;
  }
}

function emit(next: State) {
  state = next;
  listeners.forEach((notify) => notify());
}

function loadContentsquare() {
  if (document.querySelector(`script[src="${CONTENTSQUARE_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = CONTENTSQUARE_SRC;
  s.async = true;
  document.head.appendChild(s);
}

// Contentsquare's own cookies. Removed when analytics consent is withdrawn.
function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (!name.startsWith("_cs_")) return;
    domains.forEach((d) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    });
  });
}

export function saveConsent(choice: ConsentChoice) {
  const hadAnalytics = state.choice?.analytics === true;
  try {
    const stored: StoredConsent = { ...choice, v: CONSENT_VERSION, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage blocked — the choice holds for this visit only */
  }
  emit({ choice, settingsOpen: false });

  if (choice.analytics) {
    loadContentsquare();
  } else if (hadAnalytics) {
    // A loaded script can't be unloaded; clear its cookies and reload so it's gone.
    clearAnalyticsCookies();
    window.location.reload();
  }
}

export function openConsentSettings() {
  emit({ ...state, settingsOpen: true });
}

export function closeConsentSettings() {
  emit({ ...state, settingsOpen: false });
}

// Run once at startup: returning visitors who opted in get analytics again.
export function initConsent() {
  if (state.choice?.analytics) loadContentsquare();
}

export function useConsent() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => state,
    () => state
  );
}
