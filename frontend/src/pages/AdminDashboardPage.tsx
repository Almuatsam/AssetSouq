import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/store/AuthContext";

// Real navigation hub; the dashboard's own stats/charts are future Phase
// 3 work (docs/06-Engineering-Plan.md) — this exists so admins have
// somewhere real to land after login and reach what's built so far.
export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const username = session?.user.role === "ADMIN" ? session.user.admin.username : "";

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-primary">
            {t("adminDashboard.welcome", { username })}
          </h1>
          <Button onClick={logout}>{t("common.logout")}</Button>
        </header>

        <Card className="flex flex-col gap-2">
          <Link to="/admin/devices" className="font-medium text-primary hover:underline">
            {t("adminDashboard.manageDevices")}
          </Link>
          <Link to="/admin/employees" className="font-medium text-primary hover:underline">
            {t("adminDashboard.manageEmployees")}
          </Link>
          <Link to="/admin/registrations" className="font-medium text-primary hover:underline">
            {t("adminDashboard.manageRegistrations")}
          </Link>
        </Card>

        <p className="text-sm text-gray">{t("adminDashboard.comingSoon")}</p>
      </div>
    </main>
  );
}
