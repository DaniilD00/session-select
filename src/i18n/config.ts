import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sv from './locales/sv.json';

// The language switcher stores the visitor's choice; honour it on the next
// visit. Storage can be blocked (private mode), so fall back to Swedish.
const storedLanguage = (() => {
  try {
    const value = localStorage.getItem('language');
    return value === 'en' || value === 'sv' ? value : null;
  } catch {
    return null;
  }
})();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sv: { translation: sv },
    },
    lng: storedLanguage ?? 'sv', // Default language is Swedish
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Keep <html lang> in step so screen readers and translators use the right language.
const syncHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
};
syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
