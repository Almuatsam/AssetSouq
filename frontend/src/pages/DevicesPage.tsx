import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/AuthContext";

// Placeholder landing page for a logged-in employee. The real device
// listing is Phase 2 work (docs/06-Engineering-Plan.md) — this exists so
// the login flow has somewhere real to redirect to.
export default function DevicesPage() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const name = session?.user.role === "EMPLOYEE" ? session.user.employee.name : "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold text-primary">{t("devices.welcome", { name })}</h1>
      <p className="text-gray">{t("devices.comingSoon")}</p>
      <Button onClick={logout}>{t("common.logout")}</Button>
    </main>
  );
}
