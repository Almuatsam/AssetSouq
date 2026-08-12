import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/store/AuthContext";
import type { DeviceStatus, RegistrationStatus } from "@/types/device";

const DEVICE_STATUSES: DeviceStatus[] = ["AVAILABLE", "REMOVED", "DRAWN", "SOLD"];
const REGISTRATION_STATUSES: RegistrationStatus[] = ["PENDING", "ELIGIBLE", "INELIGIBLE", "WITHDRAWN"];

// Fixed dimensions rather than recharts' <ResponsiveContainer> — the
// container-measuring approach needs a real layout engine (ResizeObserver
// + non-zero getBoundingClientRect), neither of which jsdom provides, so
// it renders as a blank 0x0 SVG under Vitest. A fixed size sidesteps that
// entirely and is simple to reason about; the surrounding Card scrolls
// horizontally (see AdminDevicesPage's table for the same overflow-x-auto
// pattern) rather than the chart itself trying to be fluid.
const CHART_WIDTH = 480;
const CHART_HEIGHT = 240;

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const username = session?.user.role === "ADMIN" ? session.user.admin.username : "";
  const { data: stats, isError } = useDashboardStats();

  const deviceChartData = DEVICE_STATUSES.map((status) => ({
    status: t(`deviceStatus.${status}`),
    count: stats?.devices[status] ?? 0,
  }));
  const registrationChartData = REGISTRATION_STATUSES.map((status) => ({
    status: t(`adminRegistrations.statusValues.${status}`),
    count: stats?.registrations[status] ?? 0,
  }));

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
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
          <Link to="/admin/winners" className="font-medium text-primary hover:underline">
            {t("adminDashboard.viewWinners")}
          </Link>
          <Link to="/admin/reports" className="font-medium text-primary hover:underline">
            {t("adminDashboard.viewReports")}
          </Link>
          <Link to="/admin/audit-log" className="font-medium text-primary hover:underline">
            {t("adminDashboard.viewAuditLog")}
          </Link>
        </Card>

        {stats ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="flex flex-col gap-1">
                <span className="text-sm text-gray">{t("adminDashboard.totalDevices")}</span>
                <span className="text-3xl font-semibold text-primary">{stats.devices.total}</span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-sm text-gray">{t("adminDashboard.totalEmployees")}</span>
                <span className="text-3xl font-semibold text-primary">{stats.employees.total}</span>
                <span className="text-xs text-gray">
                  {t("adminDashboard.activeEligibleEmployees", {
                    active: stats.employees.active,
                    eligible: stats.employees.eligible,
                  })}
                </span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-sm text-gray">{t("adminDashboard.totalRegistrations")}</span>
                <span className="text-3xl font-semibold text-primary">{stats.registrations.total}</span>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="overflow-x-auto">
                <h2 id="devices-chart-title" className="mb-4 text-sm font-medium text-gray">
                  {t("adminDashboard.devicesByStatus")}
                </h2>
                {/* role="img" + aria-labelledby scoped to just the chart
                    (not the whole Card) — putting role="img" on an
                    ancestor of the <h2> would flatten the heading out of
                    the accessibility tree along with the chart, removing
                    it as a navigable heading for screen reader users. */}
                <div role="img" aria-labelledby="devices-chart-title">
                  <BarChart
                    width={CHART_WIDTH}
                    height={CHART_HEIGHT}
                    data={deviceChartData}
                    accessibilityLayer
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" name={t("adminDashboard.devicesByStatus")} />
                  </BarChart>
                </div>
              </Card>
              <Card className="overflow-x-auto">
                <h2 id="registrations-chart-title" className="mb-4 text-sm font-medium text-gray">
                  {t("adminDashboard.registrationsByStatus")}
                </h2>
                <div role="img" aria-labelledby="registrations-chart-title">
                  <BarChart
                    width={CHART_WIDTH}
                    height={CHART_HEIGHT}
                    data={registrationChartData}
                    accessibilityLayer
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" name={t("adminDashboard.registrationsByStatus")} />
                  </BarChart>
                </div>
              </Card>
            </div>
          </>
        ) : isError ? (
          <p role="alert" className="text-danger">
            {t("adminDashboard.statsLoadError")}
          </p>
        ) : (
          <LoadingIndicator />
        )}
      </div>
    </main>
  );
}
