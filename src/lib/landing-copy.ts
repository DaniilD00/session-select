// Location-specific landing copy, shared by the live page and the crawlable
// HTML that scripts/prerender-content.tsx bakes into each page at build time.
// Keeping it here means both always say the same thing.

import type { LocationConfig } from "@/config/locations";

type Translate = (key: string, opts?: Record<string, unknown>) => unknown;

// "Every day 11:00–20:00", or the weekday/weekend split for locations whose
// hours differ.
export function scheduleLines(config: LocationConfig, t: Translate): string[] {
  const range = (d: LocationConfig["timeSlotRule"]["weekday"]) =>
    d.hours?.length
      ? { start: `${String(Math.min(...d.hours)).padStart(2, "0")}:00`, end: `${String(Math.max(...d.hours)).padStart(2, "0")}:00` }
      : { start: d.start ?? "", end: d.end ?? "" };
  const weekday = range(config.timeSlotRule.weekday);
  const weekend = range(config.timeSlotRule.weekend);
  if (weekday.start === weekend.start && weekday.end === weekend.end) {
    return [String(t("landing.location.everyDay", weekday))];
  }
  return [String(t("landing.location.weekdays", weekday)), String(t("landing.location.weekends", weekend))];
}

export interface FaqItem {
  question: string;
  answer: string;
}

// The FAQ list with this location's details filled in.
export function faqItems(config: LocationConfig, t: Translate): FaqItem[] {
  // returnObjects skips interpolation, so substitute location-specific values here.
  const findUs = String(t(config.id === "ronneby" ? "faq.findUsRonneby" : "faq.findUsSolna"));
  // Locations that brief guests inside the session time say so; the others get
  // an empty note so their answers read exactly as before.
  const sessionNote = config.briefingIncluded ? String(t("faq.sessionNoteBriefing")) : "";
  const arrival = String(
    t(config.briefingIncluded ? "faq.arrivalBriefingIncluded" : "faq.arrival", {
      minutes: config.sessionMinutes,
    })
  );
  const fill = (s: string) =>
    s
      .replace(/\{\{minutes\}\}/g, String(config.sessionMinutes))
      .replace(/\{\{city\}\}/g, config.city)
      .replace(/\{\{findUs\}\}/g, findUs)
      .replace(/\{\{sessionNote\}\}/g, sessionNote)
      .replace(/\{\{arrival\}\}/g, arrival);

  const raw = t("faq.items", { returnObjects: true });
  if (!Array.isArray(raw)) return [];
  return (raw as FaqItem[]).map((item) => ({
    question: fill(item.question),
    answer: fill(item.answer),
  }));
}
