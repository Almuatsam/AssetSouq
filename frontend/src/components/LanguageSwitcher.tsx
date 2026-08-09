import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-2">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          aria-pressed={i18n.language === code}
          className={`rounded-md px-3 py-1 text-sm ${
            i18n.language === code ? "bg-primary text-white" : "text-gray hover:bg-gray/10"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
