import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <div>
        <h1 className="text-3xl font-bold text-ink">{t("app.name")}</h1>
        <p className="mt-2 text-gray">{t("landing.tagline")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t("landing.employeeCta")}
        </Link>
        <Link
          to="/admin/login"
          className="inline-flex items-center justify-center rounded-md border border-gray/30 px-4 py-2 text-sm font-medium text-gray transition hover:bg-gray/10"
        >
          {t("landing.adminCta")}
        </Link>
      </div>
    </main>
  );
}
