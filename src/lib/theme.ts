import { useSyncExternalStore } from "react";

// Visitor-chosen colour theme for the landing page and booking window.
// Dark is the default look; the choice is remembered in localStorage and
// mirrored onto <html data-theme>, which the .theme-venue tokens key off.
// index.html sets the attribute before first paint so there's no flash.

export type Theme = "dark" | "light";

const STORAGE_KEY = "rpg-theme";
const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let current: Theme = typeof window === "undefined" ? "dark" : readStored();

function apply(theme: Theme) {
  if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;
}
apply(current);

export function setTheme(theme: Theme) {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked — the choice just won't be remembered */
  }
  listeners.forEach((notify) => notify());
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => current,
    () => "dark" as Theme
  );
  return [theme, setTheme];
}
