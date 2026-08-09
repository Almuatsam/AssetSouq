import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import ar from "@/locales/ar.json";
import en from "@/locales/en.json";

// i18n.init() always returns a Promise, which by JS semantics resolves at
// least one microtask after this module finishes loading synchronously —
// true regardless of initImmediate. react-i18next's useTranslation() checks
// readiness at mount and re-renders once that promise settles, so a
// component that mounts in the same tick this module is imported can catch
// i18next mid-initialization and trigger a state update after a
// synchronously-asserting test has already finished (a React "not wrapped
// in act()" warning). Exported so tests can await real readiness before
// rendering (see src/test/setup.ts) instead of racing it.
export const i18nReady = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    interpolation: { escapeValue: false },
  });

// Keep <html dir="rtl|ltr" lang="..."> in sync with the active language.
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
});

export default i18n;
