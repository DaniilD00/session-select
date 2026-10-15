import { useTranslation } from "react-i18next";
import { Briefcase, Cake, Heart, Users, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

const ICONS: LucideIcon[] = [Cake, Heart, Users, Briefcase];

// Who it's for — doubles as the page's keyword-rich "barnkalas / teambuilding"
// section.
export function Occasions() {
  const { t } = useTranslation();
  const raw = t("landing.occasions.items", { returnObjects: true });
  const items = Array.isArray(raw) ? (raw as { title: string; description: string }[]) : [];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.occasions.eyebrow")}
            title={t("landing.occasions.title")}
            subtitle={t("landing.occasions.subtitle")}
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <Reveal key={item.title} delay={i}>
                <article className="h-full rounded-2xl border border-border bg-gradient-to-b from-card to-card/40 p-6 transition-colors duration-300 hover:border-primary/40">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{item.description}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
