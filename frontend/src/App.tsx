import { useTranslation } from "react-i18next";

export default function App() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-primary">{t("app.name")}</h1>
    </main>
  );
}
