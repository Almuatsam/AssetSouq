import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { DeviceStatusBadge } from "@/components/DeviceStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useAdminDevices, useUpdateDevice } from "@/hooks/useAdminDevices";
import { useRunDraw } from "@/hooks/useAdminDraws";
import { useAuth } from "@/store/AuthContext";
import type { DeviceStatus } from "@/types/device";

const STATUS_OPTIONS: DeviceStatus[] = ["AVAILABLE", "REMOVED", "DRAWN", "SOLD"];

export default function AdminDevicesPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "">("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [drawWinnerNames, setDrawWinnerNames] = useState<string[] | null>(null);

  const { data: devices, isLoading, isError } = useAdminDevices(statusFilter || undefined);
  const updateDevice = useUpdateDevice();
  const runDraw = useRunDraw();
  const isActionPending = updateDevice.isPending || runDraw.isPending;

  // Only AVAILABLE <-> REMOVED is ever offered here — the backend's state
  // machine (deviceService.updateDevice) reserves DRAWN/SOLD exclusively
  // for the draw/payment workflow, so there's nothing for this page to
  // expose for those statuses beyond viewing them.
  const handleToggleStatus = async (id: number, nextStatus: DeviceStatus, confirmMessage: string) => {
    if (!window.confirm(confirmMessage)) return;
    setActionError(null);
    setDrawWinnerNames(null);
    try {
      await updateDevice.mutateAsync({ id, data: { status: nextStatus } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("adminDevices.actionError"));
    }
  };

  const handleRunDraw = async (id: number) => {
    if (!window.confirm(t("adminDevices.confirmRunDraw"))) return;
    setActionError(null);
    setDrawWinnerNames(null);
    try {
      const draw = await runDraw.mutateAsync(id);
      setDrawWinnerNames(draw.winners.map((winner) => winner.employee.name));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("adminDevices.actionError"));
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{t("adminDevices.title")}</h1>
            <p className="text-sm text-gray">{t("adminDevices.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/devices/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t("adminDevices.addDevice")}
            </Link>
            <Button onClick={logout}>{t("common.logout")}</Button>
          </div>
        </header>

        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm text-gray">
            {t("adminDevices.filterLabel")}
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | "")}
            className="rounded-md border border-gray/30 px-3 py-1.5 text-sm"
          >
            <option value="">{t("adminDevices.filterAll")}</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t(`deviceStatus.${status}`)}
              </option>
            ))}
          </select>
        </div>

        {actionError && (
          <p role="alert" className="text-sm text-danger">
            {actionError}
          </p>
        )}

        {drawWinnerNames && (
          <p role="status" className="text-sm text-success">
            {t("adminDevices.drawComplete", { names: drawWinnerNames.join(", ") })}{" "}
            <Link to="/admin/winners" className="underline">
              {t("adminDevices.viewWinners")}
            </Link>
          </p>
        )}

        {isLoading ? (
          <LoadingIndicator />
        ) : isError ? (
          <p role="alert" className="text-danger">
            {t("adminDevices.loadError")}
          </p>
        ) : devices && devices.length > 0 ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray/15 text-gray">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminDevices.assetTag")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminDevices.device")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminDevices.price")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminDevices.status")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminDevices.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="border-b border-gray/10 last:border-0">
                    <td className="px-4 py-3">{device.assetTag}</td>
                    <td className="px-4 py-3">
                      {device.brand} {device.model}
                    </td>
                    <td className="px-4 py-3">{device.price}</td>
                    <td className="px-4 py-3">
                      <DeviceStatusBadge status={device.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        <Link to={`/admin/devices/${device.id}/edit`} className="text-primary hover:underline">
                          {t("adminDevices.edit")}
                        </Link>
                        {device.status === "AVAILABLE" && (
                          <button
                            type="button"
                            className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isActionPending}
                            onClick={() => handleRunDraw(device.id)}
                          >
                            {t("adminDevices.runDraw")}
                          </button>
                        )}
                        {device.status === "AVAILABLE" && (
                          <button
                            type="button"
                            className="text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isActionPending}
                            onClick={() =>
                              handleToggleStatus(device.id, "REMOVED", t("adminDevices.confirmRemove"))
                            }
                          >
                            {t("adminDevices.remove")}
                          </button>
                        )}
                        {device.status === "REMOVED" && (
                          <button
                            type="button"
                            className="text-success hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isActionPending}
                            onClick={() =>
                              handleToggleStatus(device.id, "AVAILABLE", t("adminDevices.confirmRestore"))
                            }
                          >
                            {t("adminDevices.restore")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="text-gray">{t("adminDevices.empty")}</p>
        )}
      </div>
    </main>
  );
}
