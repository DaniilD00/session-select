import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, MapPin, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteLocation } from "@/contexts/LocationContext";
import { LOCATIONS } from "@/config/locations";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const logo = "/logotyp_1.svg";

// In-page sections on the landing page, in page order.
const SECTIONS = [
  { id: "upplevelsen", key: "landing.nav.experience" },
  { id: "sa-funkar-det", key: "landing.nav.howItWorks" },
  { id: "priser", key: "landing.nav.pricing" },
  { id: "faq", key: "landing.nav.faq" },
  { id: "hitta-hit", key: "landing.nav.findUs" },
] as const;

export const Navbar = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVillkorOpen, setIsVillkorOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { config, to: lp } = useSiteLocation();

  // Home path for the active location ("/" for Solna, "/ronneby" for Ronneby).
  const home = lp("/") || "/";
  const isHome = location.pathname === home || location.pathname === `${home}/`;
  const openLocations = Object.values(LOCATIONS).filter((l) => l.enabled && !l.closed);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the menu whenever the route changes, and on Escape.
  useEffect(() => {
    setIsMenuOpen(false);
    setIsVillkorOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  // The landing page has a hero built to sit under the bar, so it is always
  // shown there (transparent until scrolled). Other pages have no room for
  // it at the top, so it only slides in once the visitor scrolls.
  const isVisible = isHome || scrollY > 100 || isMenuOpen;
  const isSolid = !isHome || scrollY > 24 || isMenuOpen;

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsVillkorOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeMenu();
  };

  const goToSection = (id: string) => {
    closeMenu();
    if (isHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`${home}#${id}`);
    }
  };

  const handleBooking = () => {
    if (config.closed) return;
    if (isHome) {
      window.dispatchEvent(new CustomEvent("open-booking-modal"));
    } else {
      navigate(`${home}?action=book`);
    }
    closeMenu();
  };

  const toggleLanguage = () => {
    const next = i18n.language === "en" ? "sv" : "en";
    i18n.changeLanguage(next);
    try {
      localStorage.setItem("language", next);
    } catch {
      /* storage blocked — the choice just won't be remembered */
    }
  };

  const bookLabel = config.closed ? t("closedLocation.bookingClosed") : t("landing.nav.book");

  return (
    <nav
      className={cn(
        "theme-venue fixed inset-x-0 top-0 z-50 text-foreground transition-[transform,background-color,border-color] duration-300",
        isVisible ? "translate-y-0" : "-translate-y-full",
        isSolid
          ? "border-b border-border bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6 md:h-20">
        <Link to={home} onClick={scrollToTop} className="flex shrink-0 items-center transition-opacity hover:opacity-80">
          <img src={logo} alt="Ready Pixel Go" className="h-9 w-auto md:h-11" width={132} height={44} />
        </Link>

        {isHome && (
          <ul className="hidden items-center gap-1 lg:flex">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goToSection(s.id)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
                >
                  {t(s.key)}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={toggleLanguage}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground sm:flex"
            title={i18n.language === "en" ? "Byt till svenska" : "Switch to English"}
          >
            <Globe className="h-4 w-4" />
            {i18n.language === "en" ? "SV" : "EN"}
          </button>
          <button
            type="button"
            onClick={handleBooking}
            disabled={config.closed}
            className="hidden h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
          >
            {bookLabel}
          </button>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "rounded-lg p-2 text-foreground transition-colors hover:bg-foreground/10",
              isHome && "lg:hidden"
            )}
            aria-label={isMenuOpen ? t("landing.nav.closeMenu") : t("landing.nav.menu")}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 sm:px-6">
            {isHome ? (
              SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSection(s.id)}
                  className="rounded-lg py-2.5 text-left font-medium text-foreground/85 transition-colors hover:text-foreground"
                >
                  {t(s.key)}
                </button>
              ))
            ) : (
              <Link to={home} onClick={scrollToTop} className="rounded-lg py-2.5 font-medium text-foreground/85 hover:text-foreground">
                {t("landing.nav.home")}
              </Link>
            )}

            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setIsVillkorOpen(!isVillkorOpen)}
                aria-expanded={isVillkorOpen}
                className="flex items-center justify-between rounded-lg py-2.5 text-left font-medium text-foreground/85 transition-colors hover:text-foreground"
              >
                {t("landing.nav.terms")}
                <ChevronDown className={cn("h-4 w-4 transition-transform", isVillkorOpen && "rotate-180")} />
              </button>
              {isVillkorOpen && (
                <div className="mb-2 flex flex-col gap-2 border-l border-border pl-4">
                  <Link to={lp("/bokningspolicy")} onClick={scrollToTop} className="py-1 text-sm text-foreground/70 hover:text-foreground">
                    {t("landing.nav.bookingPolicy")}
                  </Link>
                  <Link to={lp("/anvandarvillkor")} onClick={scrollToTop} className="py-1 text-sm text-foreground/70 hover:text-foreground">
                    {t("landing.nav.termsOfService")}
                  </Link>
                  <Link to={lp("/integritetspolicy")} onClick={scrollToTop} className="py-1 text-sm text-foreground/70 hover:text-foreground">
                    {t("landing.nav.privacy")}
                  </Link>
                </div>
              )}
            </div>

            {/* Location switcher — closed venues are left out. */}
            {openLocations.length > 1 && (
              <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {t("landing.nav.location")}
                </span>
                {openLocations.map((l) => (
                  <Link
                    key={l.id}
                    to={l.basePath || "/"}
                    onClick={scrollToTop}
                    aria-current={l.id === config.id ? "page" : undefined}
                    className={cn(
                      "py-1.5 text-sm transition-colors",
                      l.id === config.id ? "font-semibold text-primary" : "text-foreground/75 hover:text-foreground"
                    )}
                  >
                    {l.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={handleBooking}
                disabled={config.closed}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary px-5 font-semibold text-primary-foreground transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bookLabel}
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-foreground/85 hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                {i18n.language === "en" ? "Svenska" : "English"}
              </button>
              <ThemeToggle withLabel />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
