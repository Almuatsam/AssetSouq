import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useAdminWinners } from "@/hooks/useAdminWinners";
import { useAuth } from "@/store/AuthContext";
import type { PaymentStatus, WinnerListFilters } from "@/types/winner";

type PaymentStatusFilter = "" | PaymentStatus;

// Read-only for now — recording a payment and the redraw flow (decline/
// no-show/admin override) are a later Phase 4 slice
// (docs/06-Engineering-Plan.md); this page exists so admins can see draw
// results and payment status as soon as a draw runs.
export default function AdminWinnersPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("");

  const filters: WinnerListFilters = { paymentStatus: paymentStatusFilter || undefined };
  const { data: winners, isLoading, isError } = useAdminWinners(filters);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">{t("adminWinners.title")}</h1>
            <p className="text-sm text-gray">{t("adminWinners.subtitle")}</p>
          </div>
          <Button onClick={logout}>{t("common.logout")}</Button>
        </header>

        <div className="flex items-center gap-2">
          <label htmlFor="payment-status-filter" className="text-sm text-gray">
            {t("adminWinners.filterLabel")}
          </label>
          <select
            id="payment-status-filter"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatusFilter)}
            className="rounded-md border border-gray/30 px-3 py-1.5 text-sm"
          >
            <option value="">{t("adminWinners.filterAll")}</option>
            <option value="PENDING">{t("adminWinners.paymentStatusValues.PENDING")}</option>
            <option value="PAID">{t("adminWinners.paymentStatusValues.PAID")}</option>
            <option value="NON_PAYMENT">{t("adminWinners.paymentStatusValues.NON_PAYMENT")}</option>
          </select>
        </div>

        {isLoading ? (
          <LoadingIndicator />
        ) : isError ? (
          <p role="alert" className="text-danger">
            {t("adminWinners.loadError")}
          </p>
        ) : winners && winners.length > 0 ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray/15 text-gray">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminWinners.employee")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminWinners.device")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminWinners.priceDue")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminWinners.drawDate")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminWinners.paymentStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {winners.map((winner) => (
                  <tr key={winner.id} className="border-b border-gray/10 last:border-0">
                    <td className="px-4 py-3">
                      {winner.employee.name}
                      <span className="block text-xs text-gray">{winner.employee.staffNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      {winner.device.assetTag}
                      <span className="block text-xs text-gray">
                        {winner.device.brand} {winner.device.model}
                      </span>
                    </td>
                    <td className="px-4 py-3">{winner.priceDue}</td>
                    <td className="px-4 py-3">{new Date(winner.drawDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={winner.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="text-gray">{t("adminWinners.empty")}</p>
        )}
      </div>
    </main>
  );
}
