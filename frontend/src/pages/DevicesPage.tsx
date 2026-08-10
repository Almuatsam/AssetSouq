import { useTranslation } from "react-i18next";

import { DeviceCard } from "@/components/DeviceCard";
import { RegistrationStatusCard } from "@/components/RegistrationStatusCard";
import { Button } from "@/components/ui/Button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useDevices } from "@/hooks/useDevices";
import { useMyRegistration } from "@/hooks/useMyRegistration";
import { useAuth } from "@/store/AuthContext";

// An employee with an active registration can't register for anything
// else (PRD business rules 2 & 5 — one registration at a time), so this
// shows their status instead of the browsable list in that case.
export default function DevicesPage() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const name = session?.user.role === "EMPLOYEE" ? session.user.employee.name : "";

  const { data: registration, isLoading: isRegistrationLoading } = useMyRegistration();
  const { data: devices, isLoading: isDevicesLoading, isError: isDevicesError } = useDevices();

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">{t("devices.greeting", { name })}</h1>
            <p className="text-sm text-gray">{t("devices.title")}</p>
          </div>
          <Button onClick={logout}>{t("common.logout")}</Button>
        </header>

        {isRegistrationLoading ? (
          <LoadingIndicator />
        ) : registration ? (
          <RegistrationStatusCard registration={registration} />
        ) : isDevicesLoading ? (
          <LoadingIndicator />
        ) : isDevicesError ? (
          <p role="alert" className="text-danger">
            {t("devices.loadError")}
          </p>
        ) : devices && devices.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <p className="text-gray">{t("devices.empty")}</p>
        )}
      </div>
    </main>
  );
}
