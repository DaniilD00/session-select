import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSiteLocation } from "@/contexts/LocationContext";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

export function FAQSection() {
  const { t } = useTranslation();
  const { config } = useSiteLocation();

  // Use returnObjects: true to get the array from translation files.
  // returnObjects skips interpolation, so substitute location-specific values here.
  const findUs = t(config.id === "ronneby" ? "faq.findUsRonneby" : "faq.findUsSolna");
  // Locations that brief guests inside the session time say so; the others get
  // an empty note so their answers read exactly as before.
  const sessionNote = config.briefingIncluded ? t("faq.sessionNoteBriefing") : "";
  const arrival = t(config.briefingIncluded ? "faq.arrivalBriefingIncluded" : "faq.arrival", {
    minutes: config.sessionMinutes,
  });
  const fill = (s: string) =>
    s
      .replace(/\{\{minutes\}\}/g, String(config.sessionMinutes))
      .replace(/\{\{city\}\}/g, config.city)
      .replace(/\{\{findUs\}\}/g, findUs)
      .replace(/\{\{sessionNote\}\}/g, sessionNote)
      .replace(/\{\{arrival\}\}/g, arrival);
  const faqItems = (t('faq.items', { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>);

  return (
    <section id="faq" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow={t("landing.faq.eyebrow")}
            title={t("faq.title")}
            subtitle={t("faq.subtitle")}
          />
          <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6">
            <p className="font-semibold text-foreground">{t("landing.faq.contactTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("landing.faq.contactBody")}</p>
            <a
              href={`mailto:${config.email}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              {config.email}
            </a>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <Accordion type="single" collapsible className="divide-y divide-border border-y border-border">
            {Array.isArray(faqItems) && faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-0">
                <AccordionTrigger className="py-5 text-left text-base font-medium text-foreground hover:no-underline hover:text-primary sm:text-lg">
                  {fill(item.question)}
                </AccordionTrigger>
                <AccordionContent className="pb-5 pr-8 text-base leading-relaxed text-muted-foreground">
                  {fill(item.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
