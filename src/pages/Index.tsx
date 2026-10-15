import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Check, Clock, Mail, MapPin, Navigation } from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";
import { BookingErrorBoundary } from "@/components/BookingErrorBoundary";
import { PixelBackground } from "@/components/PixelBackground";
import { ImageGallery } from "@/components/ImageGallery";
import { FloorInfo } from "@/components/FloorInfo";
import { FAQSection } from "@/components/FAQSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Occasions } from "@/components/landing/Occasions";
import { Footer } from "@/components/landing/Footer";
import { SOCIAL_LINKS } from "@/config/social";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSiteLocation } from "@/contexts/LocationContext";
import { LOCATIONS, LocationConfig } from "@/config/locations";
import { LaunchBadge } from "@/components/LaunchBadge";
import { useSeo } from "@/hooks/useSeo";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { saveConsent, useConsent } from "@/lib/consent";

const TIERS = ["1–2", "3–4", "5–6"] as const;

// "Every day 11:00–20:00", or the weekday/weekend split for locations whose
// hours differ.
function scheduleLines(config: LocationConfig, t: (key: string, opts?: Record<string, unknown>) => string): string[] {
  const range = (d: LocationConfig["timeSlotRule"]["weekday"]) =>
    d.hours?.length
      ? { start: `${String(Math.min(...d.hours)).padStart(2, "0")}:00`, end: `${String(Math.max(...d.hours)).padStart(2, "0")}:00` }
      : { start: d.start ?? "", end: d.end ?? "" };
  const weekday = range(config.timeSlotRule.weekday);
  const weekend = range(config.timeSlotRule.weekend);
  if (weekday.start === weekend.start && weekday.end === weekend.end) {
    return [t("landing.location.everyDay", weekday)];
  }
  return [t("landing.location.weekdays", weekday), t("landing.location.weekends", weekend)];
}

const Index = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { t } = useTranslation();
  const { config } = useSiteLocation();
  useSeo(config);
  const [searchParams, setSearchParams] = useSearchParams();
  const { hash } = useLocation();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { choice: consent } = useConsent();
  const mapAllowed = consent?.external === true;
  // Closed locations stay browsable, but nothing can open the booking modal.
  const bookingClosed = config.closed;
  const openBooking = () => {
    if (!bookingClosed) setIsBookingModalOpen(true);
  };
  const bookLabel = bookingClosed ? t('closedLocation.bookingClosed') : t('hero.bookButton');
  const openLocation = LOCATIONS.ronneby;
  const lowestPrice = Math.min(...config.pricing.adultRates, ...config.pricing.childRates);

  useEffect(() => {
    // Check for search param from navigation
    if (searchParams.get("action") === "book") {
      if (!bookingClosed) setIsBookingModalOpen(true);
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("action");
      setSearchParams(newParams, { replace: true });
    }

    // Check for custom event from Navbar on same page
    const handleOpenModal = () => {
      if (!bookingClosed) setIsBookingModalOpen(true);
    };
    window.addEventListener("open-booking-modal", handleOpenModal);

    return () => {
      window.removeEventListener("open-booking-modal", handleOpenModal);
    };
  }, [searchParams, setSearchParams, bookingClosed]);

  // Section links from other pages arrive as "/ronneby#priser".
  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  // Match the body to the page so overscroll doesn't flash another colour.
  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = isDark ? "hsl(240 10% 4%)" : "hsl(240 10% 98%)";
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, [isDark]);

  const bookButton = (className?: string) => (
    <Button
      onClick={openBooking}
      disabled={bookingClosed}
      size="lg"
      className={cn(
        "h-12 rounded-full px-7 text-base font-semibold shadow-[0_0_40px_-10px_hsl(var(--primary)/0.8)] transition-[filter,transform] hover:bg-primary hover:brightness-110 active:scale-[0.98]",
        className
      )}
    >
      <Calendar className="h-5 w-5" />
      {bookLabel}
    </Button>
  );

  // Closed locations swap the secondary CTA for a way to the open venue.
  const secondaryCta = (fallback: ReactNode) =>
    bookingClosed ? (
      <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-border bg-transparent px-7 text-base font-semibold hover:bg-accent">
        <Link to={openLocation.basePath}>
          <MapPin className="h-5 w-5" />
          {t('closedLocation.bookElsewhere', { target: openLocation.city })}
        </Link>
      </Button>
    ) : (
      fallback
    );

  const stats = [
    { value: String(config.sessionMinutes), label: t('landing.hero.stats.minutes') },
    { value: "1–6", label: t('landing.hero.stats.players') },
    { value: `${config.ledTiles}+`, label: t('landing.hero.stats.tiles') },
    { value: "30+", label: t('landing.hero.stats.levels') },
  ];

  return (
    <div className="theme-venue min-h-screen bg-background font-sans text-foreground antialiased">
      <LaunchBadge />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className={cn("absolute inset-0 -z-10", isDark ? "opacity-40" : "opacity-60")} aria-hidden="true">
          <PixelBackground
            pixelColor={config.background.pixelColor}
            clearColor={isDark ? "#09090b" : "#fafafa"}
          />
        </div>
        {/* Vignette: keeps the LED grid alive at the edges, quiet behind the text. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,hsl(var(--background)/0.92)_0%,hsl(var(--background)/0.55)_60%,transparent_100%)]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background" />

        <div className="mx-auto flex min-h-[min(88svh,56rem)] max-w-6xl flex-col items-center justify-center px-5 pb-16 pt-32 text-center sm:px-6 md:pt-40">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              {!bookingClosed && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
              )}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", bookingClosed ? "bg-muted-foreground" : "bg-primary")} />
            </span>
            {bookingClosed
              ? t('closedLocation.bookingClosed')
              : t('landing.hero.eyebrow', { address: `${config.streetAddress}, ${config.city}` })}
          </p>

          <h1 className="mt-8 font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
            {t('landing.hero.title')}
            <span className="mt-2 block text-gradient-accent">
              {t('landing.hero.titleHighlight', { city: config.city })}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {t('landing.hero.subtitle', { region: config.regionName, city: config.city })}
          </p>

          <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            {bookButton("w-full sm:w-auto")}
            {secondaryCta(
              <Button asChild size="lg" variant="ghost" className="h-12 w-full rounded-full px-6 text-base font-semibold text-foreground hover:bg-accent sm:w-auto">
                <a href="#priser">
                  {t('landing.hero.secondaryCta')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          {!bookingClosed && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t('landing.hero.priceFrom', { price: lowestPrice })}
            </p>
          )}

          <dl className="mt-14 grid w-full max-w-3xl grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur md:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "px-4 py-5",
                  i % 2 === 1 && "border-l border-border",
                  i >= 2 && "border-t border-border md:border-t-0",
                  i === 2 && "md:border-l"
                )}
              >
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-2xl font-bold text-foreground md:text-3xl">{s.value}</dd>
                <dd className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <ImageGallery />

      <FloorInfo />

      <HowItWorks />

      <Occasions />

      {/* Pricing */}
      <section id="priser" className="relative scroll-mt-20 overflow-hidden border-y border-border bg-card/30 py-24 md:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow={t('landing.pricing.eyebrow')}
              title={t('pricing.title')}
              subtitle={t('pricing.subtitle')}
            />
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-5xl items-stretch gap-5 md:grid-cols-3">
            {TIERS.map((tier, i) => {
              const featured = i === 1;
              return (
                <Reveal key={tier} delay={i}>
                  <button
                    type="button"
                    onClick={openBooking}
                    disabled={bookingClosed}
                    className={cn(
                      "relative flex h-full w-full flex-col rounded-3xl border p-7 text-left transition-[border-color,transform] duration-300 disabled:cursor-default",
                      featured
                        ? "border-primary/60 bg-gradient-to-b from-primary/10 to-card shadow-[0_0_60px_-20px_hsl(var(--primary)/0.6)]"
                        : "border-border bg-card",
                      !bookingClosed && "hover:-translate-y-1 hover:border-primary/60"
                    )}
                  >
                    {featured && (
                      <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                        {t('pricing.popular')}
                      </span>
                    )}
                    <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {tier} {t('pricing.guests')}
                    </span>
                    <span className="mt-4 flex items-baseline gap-2">
                      <span className="font-display text-5xl font-bold tracking-tight text-foreground">
                        {config.pricing.adultRates[i]}
                      </span>
                      <span className="text-sm text-muted-foreground">{t('landing.pricing.perPerson')}</span>
                    </span>
                    <span className="mt-1 text-sm text-muted-foreground">{t('landing.pricing.adult')}</span>
                    <span className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
                      <span className="text-muted-foreground">{t('landing.pricing.child')}</span>
                      <span className="font-semibold text-primary">{config.pricing.childRates[i]} kr</span>
                    </span>
                  </button>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="mx-auto mt-10 max-w-5xl">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              {[
                t('landing.pricing.private'),
                t('landing.pricing.session', { minutes: config.sessionMinutes }),
                t('landing.pricing.payment'),
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex justify-center">{bookButton()}</div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {t('pricing.note')} {t('pricing.groupNote')}{" "}
              <a href={`mailto:${config.email}`} className="font-medium text-primary hover:underline">
                {config.email}
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      <FAQSection />

      {/* Social */}
      <section className="border-t border-border py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <SectionHeading eyebrow="@readypixelgo_swe" title={t('social.title')} subtitle={t('social.subtitle')} />
          </Reveal>

          {/* A swipeable row on phones instead of three screen-tall cards. */}
          <div className="-mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 md:mx-auto md:grid md:max-w-5xl md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            <Reveal className="w-[72%] shrink-0 snap-center md:w-auto aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card">
              {/* The poster carries the card visually, so no video
                  bytes are fetched until someone presses play. */}
              <video controls className="h-full w-full object-cover" poster="/social/excite-poster.webp" preload="none" playsInline>
                <source src="/social/excite.mp4" type="video/mp4" />
              </video>
            </Reveal>

            <Reveal delay={1} className="w-[72%] shrink-0 snap-center md:w-auto aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card">
              <a href={SOCIAL_LINKS[0].href} target="_blank" rel="noopener noreferrer" className="group block h-full w-full">
                {/* Same photo as the gallery's head-to-head shot, so it
                    reuses that responsive set instead of a second copy. */}
                <picture>
                  <source
                    type="image/avif"
                    srcSet="/carousel_media/solna/solna-head-to-head-480.avif 480w, /carousel_media/solna/solna-head-to-head-800.avif 800w"
                    sizes="(min-width: 768px) 33vw, 90vw"
                  />
                  <source
                    type="image/webp"
                    srcSet="/carousel_media/solna/solna-head-to-head-480.webp 480w, /carousel_media/solna/solna-head-to-head-800.webp 800w"
                    sizes="(min-width: 768px) 33vw, 90vw"
                  />
                  <img
                    src="/carousel_media/solna/solna-head-to-head-800.webp"
                    alt="ReadyPixelGo in action"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </picture>
              </a>
            </Reveal>

            <Reveal delay={2} className="w-[72%] shrink-0 snap-center md:w-auto aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card">
              <video controls className="h-full w-full object-cover" poster="/social/run-poster.webp" preload="none" playsInline>
                <source src="/social/run.mp4" type="video/mp4" />
              </video>
            </Reveal>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
              >
                <img src={s.icon} alt="" className="h-5 w-5 rounded" width={20} height={20} loading="lazy" />
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="hitta-hit" className="scroll-mt-20 border-t border-border bg-card/30 py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow={t('landing.location.eyebrow', { city: config.city })}
              title={t('location.title')}
              subtitle={t(config.id === 'ronneby' ? 'location.descriptionRonneby' : 'location.description')}
            />
            <dl className="mt-8 space-y-5">
              <div className="flex gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <dt className="font-semibold text-foreground">{t('location.address')}</dt>
                  <dd className="text-muted-foreground">{config.addressLine}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <Navigation className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <dt className="font-semibold text-foreground">{t('landing.location.gettingThere')}</dt>
                  <dd className="text-muted-foreground">{config.directions ?? t('location.directionsValue')}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <dt className="font-semibold text-foreground">{t('landing.location.hours')}</dt>
                  {scheduleLines(config, t).map((line) => (
                    <dd key={line} className="text-muted-foreground">{line}</dd>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <dt className="font-semibold text-foreground">{t('location.email').replace(/:$/, '')}</dt>
                  <dd>
                    <a href={`mailto:${config.email}`} className="text-muted-foreground transition-colors hover:text-primary">
                      {config.email}
                    </a>
                  </dd>
                </div>
              </div>
            </dl>
            {/* Crawlable link between locations. The Navbar's switcher only
                mounts once the menu is opened, so this is the one <a href> that
                lets search engines discover the other location's page. */}
            {Object.values(LOCATIONS)
              .filter((l) => l.enabled && !l.closed && l.id !== config.id)
              .map((l) => (
                <p key={l.id} className="mt-6">
                  <Link to={l.basePath || "/"} className="font-medium text-primary hover:underline">
                    {t('location.otherLocation', { city: l.city })}
                  </Link>
                </p>
              ))}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(config.mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('location.googleMaps')}
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-border bg-transparent hover:bg-accent">
                <a
                  href={`https://maps.apple.com/?q=${encodeURIComponent(config.mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('location.appleMaps')}
                </a>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={1} className="min-h-[380px] overflow-hidden rounded-3xl border border-border bg-card">
            {mapAllowed ? (
              <iframe
                title={`Map showing ${config.addressLine}`}
                // Search for the business itself, not just the street address: the
                // pin then snaps onto the venue's own listing instead of showing an
                // address pin plus a separate business marker next to it.
                src={`https://maps.google.com/maps?q=${encodeURIComponent(`Ready Pixel Go, ${config.addressLine}`)}&t=&z=17&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                // Dark theme map: invert, then rotate hues back so water stays blue.
                className={cn(
                  "h-full min-h-[380px] w-full border-0",
                  isDark && "[filter:invert(0.9)_hue-rotate(180deg)_saturate(0.6)]"
                )}
              />
            ) : (
              // Google Maps sets its own cookies, so it waits for consent.
              <div className="relative flex h-full min-h-[380px] flex-col items-center justify-center gap-4 p-8 text-center">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-tile-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
                <MapPin className="relative h-8 w-8 text-primary" />
                <div className="relative max-w-sm">
                  <p className="font-semibold text-foreground">{t('cookie.mapBlockedTitle')}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('cookie.mapBlockedBody')}</p>
                </div>
                <Button
                  variant="outline"
                  className="relative rounded-full border-border bg-transparent hover:bg-accent"
                  onClick={() => saveConsent({ analytics: consent?.analytics ?? false, external: true })}
                >
                  {t('cookie.mapShow')}
                </Button>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* Final call to action */}
      <section className="px-5 py-24 sm:px-6 md:py-32">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-16 text-center md:px-16 md:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-tile-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t('landing.finalCta.eyebrow')}</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t('finalCta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t('finalCta.subtitle', { city: config.city })}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {bookButton()}
              {secondaryCta(null)}
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />

      {!bookingClosed && (
        <BookingErrorBoundary onReset={() => setIsBookingModalOpen(false)}>
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
          />
        </BookingErrorBoundary>
      )}
    </div>
  );
};

export default Index;
