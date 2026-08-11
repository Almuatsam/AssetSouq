import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RegistrationStatusBadge } from "@/components/RegistrationStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useAdminRegistrations, useUpdateRegistrationStatus } from "@/hooks/useAdminRegistrations";
import { useAuth } from "@/store/AuthContext";
import type { RegistrationListFilters, RegistrationStatus } from "@/types/device";

// Pure UX — mirrors (but does not enforce) the backend's own
// ALLOWED_REGISTRATION_TRANSITIONS state machine
// (backend/src/services/registrationService.ts). Only offers what the
// backend would actually accept; the backend remains the sole authority
// and re-validates every transition itself. PENDING is included for
// completeness even though registerInterest() always writes ELIGIBLE
// directly today, so a PENDING row is not something this UI expects to
// see in practice.
const NEXT_ACTIONS: Partial<
  Record<RegistrationStatus, { target: RegistrationStatus; labelKey: string; confirmKey: string }[]>
> = {
  PENDING: [
    { target: "ELIGIBLE", labelKey: "adminRegistrations.markEligible", confirmKey: "adminRegistrations.confirmMarkEligible" },
    { target: "INELIGIBLE", labelKey: "adminRegistrations.markIneligible", confirmKey: "adminRegistrations.confirmMarkIneligible" },
    { target: "WITHDRAWN", labelKey: "adminRegistrations.withdraw", confirmKey: "adminRegistrations.confirmWithdraw" },
  ],
  ELIGIBLE: [
    { target: "INELIGIBLE", labelKey: "adminRegistrations.markIneligible", confirmKey: "adminRegistrations.confirmMarkIneligible" },
    { target: "WITHDRAWN", labelKey: "adminRegistrations.withdraw", confirmKey: "adminRegistrations.confirmWithdraw" },
  ],
};

type StatusFilter = "" | RegistrationStatus;

export default function AdminRegistrationsPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filters: RegistrationListFilters = {
    status: statusFilter || undefined,
    search: search.trim() || undefined,
  };

  const { data: registrations, isLoading, isError } = useAdminRegistrations(filters);
  const updateStatus = useUpdateRegistrationStatus();

  const handleAction = async (id: number, target: RegistrationStatus, confirmMessage: string) => {
    if (!window.confirm(confirmMessage)) return;
    setActionError(null);
    try {
      await updateStatus.mutateAsync({ id, status: target });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("adminRegistrations.actionError"));
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">{t("adminRegistrations.title")}</h1>
            <p className="text-sm text-gray">{t("adminRegistrations.subtitle")}</p>
          </div>
          <Button onClick={logout}>{t("common.logout")}</Button>
        </header>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="registration-status-filter" className="text-sm text-gray">
              {t("adminRegistrations.filterLabel")}
            </label>
            <select
              id="registration-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-gray/30 px-3 py-1.5 text-sm"
            >
              <option value="">{t("adminRegistrations.filterAll")}</option>
              <option value="PENDING">{t("adminRegistrations.statusValues.PENDING")}</option>
              <option value="ELIGIBLE">{t("adminRegistrations.statusValues.ELIGIBLE")}</option>
              <option value="INELIGIBLE">{t("adminRegistrations.statusValues.INELIGIBLE")}</option>
              <option value="WITHDRAWN">{t("adminRegistrations.statusValues.WITHDRAWN")}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="registration-search" className="text-sm text-gray">
              {t("adminRegistrations.searchLabel")}
            </label>
            <input
              id="registration-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("adminRegistrations.searchPlaceholder")}
              className="rounded-md border border-gray/30 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {actionError && (
          <p role="alert" className="text-sm text-danger">
            {actionError}
          </p>
        )}

        {isLoading ? (
          <LoadingIndicator />
        ) : isError ? (
          <p role="alert" className="text-danger">
            {t("adminRegistrations.loadError")}
          </p>
        ) : registrations && registrations.length > 0 ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray/15 text-gray">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminRegistrations.employee")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminRegistrations.department")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminRegistrations.device")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminRegistrations.price")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminRegistrations.submitted")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminRegistrations.status")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminRegistrations.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr key={registration.id} className="border-b border-gray/10 last:border-0">
                    <td className="px-4 py-3">
                      {registration.employee.name}
                      <span className="block text-xs text-gray">{registration.employee.staffNumber}</span>
                    </td>
                    <td className="px-4 py-3">{registration.employee.department}</td>
                    <td className="px-4 py-3">
                      {registration.device.assetTag}
                      <span className="block text-xs text-gray">
                        {registration.device.brand} {registration.device.model}
                      </span>
                    </td>
                    <td className="px-4 py-3">{registration.device.price}</td>
                    <td className="px-4 py-3">{new Date(registration.submittedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <RegistrationStatusBadge status={registration.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        {(NEXT_ACTIONS[registration.status] ?? []).map((action) => (
                          <button
                            key={action.target}
                            type="button"
                            className="text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={updateStatus.isPending}
                            onClick={() => handleAction(registration.id, action.target, t(action.confirmKey))}
                          >
                            {t(action.labelKey)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="text-gray">{t("adminRegistrations.empty")}</p>
        )}
      </div>
    </main>
  );
}
