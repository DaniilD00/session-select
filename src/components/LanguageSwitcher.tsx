import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'sv' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <Button
      type="button"
      onClick={toggleLanguage}
      variant="ghost"
      size="sm"
      className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
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
