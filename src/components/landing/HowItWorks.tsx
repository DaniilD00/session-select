import { useTranslation } from "react-i18next";
import { CalendarCheck, Clock, Footprints, Trophy } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

const ICONS = [CalendarCheck, Clock, Footprints, Trophy];

// Four numbered steps from booking to playing.
export function HowItWorks() {
  const { t } = useTranslation();
  const raw = t("landing.steps.items", { returnObjects: true });
  const steps = Array.isArray(raw) ? (raw as { title: string; description: string }[]) : [];

  return (
    <section id="sa-funkar-det" className="scroll-mt-20 border-y border-border bg-card/30 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading eyebrow={t("landing.steps.eyebrow")} title={t("landing.steps.title")} />
        </Reveal>

        <div className="relative mt-14">
          {/* Connector line behind the step badges (desktop only). */}
          <div
            aria-hidden="true"
            className="absolute left-[12%] right-[12%] top-6 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block"
          />
          <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
          {steps.map((step, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <li key={step.title} className="relative">
                <Reveal delay={i} className="flex gap-4 md:flex-col md:items-center md:text-center">
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:mt-5">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
    </section>
  );
}
