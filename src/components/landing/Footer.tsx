import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, MapPin } from "lucide-react";
import { useSiteLocation } from "@/contexts/LocationContext";
import { SOCIAL_LINKS } from "@/config/social";
import { openConsentSettings } from "@/lib/consent";

export function Footer() {
  const { t } = useTranslation();
  const { config, to } = useSiteLocation();
  const year = new Date().getFullYear();

  const infoLinks = [
    { label: t("landing.nav.bookingPolicy"), href: to("/bokningspolicy") },
    { label: t("landing.nav.termsOfService"), href: to("/anvandarvillkor") },
    { label: t("landing.nav.privacy"), href: to("/integritetspolicy") },
  ];

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <img src="/logotyp_1.svg" alt="Ready Pixel Go" className="h-10 w-auto" width={120} height={40} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{t("landing.footer.tagline")}</p>
          <div className="mt-5 flex gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="rounded-lg opacity-80 transition-opacity hover:opacity-100"
              >
                <img src={s.icon} alt="" className="h-9 w-9 rounded-lg" width={36} height={36} loading="lazy" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("landing.footer.visit")}</h3>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(config.mapsQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {config.streetAddress}
              <br />
              {config.postalCode} {config.city}
            </span>
          </a>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("landing.footer.contact")}</h3>
          <a
            href={`mailto:${config.email}`}
            className="mt-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mail className="h-4 w-4 shrink-0 text-primary" />
            {config.email}
          </a>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("landing.footer.info")}</h3>
          <ul className="mt-4 space-y-2.5">
            {infoLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={openConsentSettings}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("cookie.settings")}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground sm:px-6">
          © {year} Ready Pixel Go. {t("landing.footer.rights")}
        </p>
      </div>
    </footer>
  );
}
