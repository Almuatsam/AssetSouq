import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/AuthContext";

// Placeholder landing page for a logged-in admin. The real dashboard is
// Phase 3 work (docs/06-Engineering-Plan.md) — this exists so the login
// flow has somewhere real to redirect to.
export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const username = session?.user.role === "ADMIN" ? session.user.admin.username : "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold text-primary">
        {t("adminDashboard.welcome", { username })}
      </h1>
      <p className="text-gray">{t("adminDashboard.comingSoon")}</p>
      <Button onClick={logout}>{t("common.logout")}</Button>
    </main>
  );
}
