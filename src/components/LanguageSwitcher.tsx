import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { LOCATIONS } from "@/config/locations";

// Location home pages (the landing pages) have the switch built into the
// navbar, so this floating pill only shows on the other pages.
const HOME_PATHS = new Set(Object.values(LOCATIONS).flatMap((l) => (l.basePath ? [l.basePath, `${l.basePath}/`] : ["/"])));

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'sv' : 'en';
    i18n.changeLanguage(newLang);
    try {
      localStorage.setItem('language', newLang);
    } catch {
      /* storage blocked — the choice just won't be remembered */
    }
  };

  if (HOME_PATHS.has(pathname)) return null;

  return (
    <Button
      type="button"
      onClick={toggleLanguage}
      variant="ghost"
      size="sm"
      className="fixed top-24 right-4 z-[100] bg-white/90 backdrop-blur-sm hover:bg-white shadow-md rounded-full px-4"
      title={i18n.language === 'en' ? 'Switch to Swedish' : 'Byt till Engelska'}
    >
      {i18n.language === 'en' ? (
        <span className="flex items-center gap-2">
          🇸🇪 <span className="text-sm font-medium">Svenska</span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          🇬🇧 <span className="text-sm font-medium">English</span>
        </span>
      )}
    </Button>
  );
};
