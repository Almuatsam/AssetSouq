import { useTranslation } from "react-i18next";

// role="status" + aria-live="polite" so a screen reader announces the
// loading -> loaded/error transition — without it, that content swap is
// silent to assistive tech even though sighted users see it instantly.
export function LoadingIndicator() {
  const { t } = useTranslation();

  return (
    <p role="status" aria-live="polite" className="text-gray">
      {t("common.loading")}
    </p>
  );
}
