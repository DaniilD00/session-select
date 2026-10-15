import { useTranslation } from "react-i18next";
import { Gamepad2, Maximize2, Sparkles, type LucideIcon } from "lucide-react";
import { useSiteLocation } from "@/contexts/LocationContext";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

interface Feature {
  icon: LucideIcon;
  stat: string;
  title: string;
  description: string;
}

// "The experience": what the floor is, led by the three numbers that sell it.
export const FloorInfo = () => {
  const { t } = useTranslation();
  const { config } = useSiteLocation();

  const features: Feature[] = [
    {
      icon: Gamepad2,
      stat: "30+",
      title: t("floor.modes.title"),
      description: `${t("floor.modes.descriptionPre")}30+${t("floor.modes.descriptionPost")}`,
    },
    {
      icon: Maximize2,
      stat: `${config.floorAreaSqm} m²`,
      title: t("floor.size.title"),
      description: `${config.floorSize} · ${t("floor.size.description", { area: config.floorAreaSqm })}`,
    },
    {
      icon: Sparkles,
      stat: `${config.ledTiles}+`,
      title: t("floor.tech.title"),
      description: t("floor.tech.description"),
    },
  ];

  return (
    <section id="upplevelsen" className="relative scroll-mt-20 overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-tile-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.experience.eyebrow")}
            title={t("floor.title")}
            subtitle={t("floor.subtitle")}
          />
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i}>
              <article className="group h-full rounded-2xl border border-border bg-card/60 p-7 transition-colors duration-300 hover:border-primary/40">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-3xl font-bold tracking-tight text-foreground">{f.stat}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{f.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
