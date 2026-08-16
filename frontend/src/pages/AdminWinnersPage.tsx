import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { RedrawWinnerAction } from "@/components/RedrawWinnerAction";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useAdminWinners, useRecordHandover, useRecordPayment } from "@/hooks/useAdminWinners";
import { useAuth } from "@/store/AuthContext";
import type { PaymentStatus, WinnerListFilters } from "@/types/winner";

type PaymentStatusFilter = "" | PaymentStatus;

export default function AdminWinnersPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filters: WinnerListFilters = { paymentStatus: paymentStatusFilter || undefined };
  const { data: winners, isLoading, isError } = useAdminWinners(filters);
  const recordPayment = useRecordPayment();
  const recordHandover = useRecordHandover();

  // recordPayment/recordHandover are single, page-wide mutation instances
  // (not one per row), so `.isPending` alone would disable every row's
  // buttons while any one row's mutation is in flight. Scope the disabled
  // state to the row whose id the in-flight mutation was actually called
  // with, so acting on one winner doesn't freeze the rest of the table.
  const isRowActionPending = (id: number): boolean =>
    (recordPayment.isPending && recordPayment.variables?.id === id) ||
    (recordHandover.isPending && recordHandover.variables === id);

  // Best-effort only — the current page/filter may not include every
  // winner row (e.g. filtered to PENDING hides a PAID replacement), so
  // this can under-detect an already-redrawn slot and still show the
  // Redraw action for it. That's fine: the backend is the real authority
  // and rejects an already-redrawn winner with a 409 regardless of what
  // this hides or shows — this only saves a round trip in the common case.
  const redrawnWinnerIds = new Set(
    (winners ?? []).map((winner) => winner.redrawOf).filter((id): id is number => id !== null),
  );

  const handleMarkPaid = async (id: number) => {
    if (!window.confirm(t("adminWinners.confirmMarkPaid"))) return;
    const paymentMethod = window.prompt(t("adminWinners.paymentMethodPrompt")) ?? "";
    setActionError(null);
    try {
      await recordPayment.mutateAsync({
        id,
        data: { paymentStatus: "PAID", paymentMethod: paymentMethod.trim() || undefined },
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("adminWinners.actionError"));
    }
  };

  const handleMarkNonPayment = async (id: number) => {
    if (!window.confirm(t("adminWinners.confirmMarkNonPayment"))) return;
    setActionError(null);
    try {
      await recordPayment.mutateAsync({ id, data: { paymentStatus: "NON_PAYMENT" } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("adminWinners.actionError"));
    }
  };

  const handleRecordHandover = async (id: number) => {
    if (!window.confirm(t("adminWinners.confirmHandover"))) return;
    setActionError(null);
    try {
      await recordHandover.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("adminWinners.actionError"));
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{t("adminWinners.title")}</h1>
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

        {actionError && (
          <p role="alert" className="text-sm text-danger">
            {actionError}
          </p>
        )}

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
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminWinners.actions")}
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
                      {winner.handoverDate && (
                        <span className="block text-xs text-gray">
                          {t("adminWinners.handedOverOn", {
                            date: new Date(winner.handoverDate).toLocaleDateString(),
                          })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {winner.handoverDate ? null : (
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Also excludes an already-redrawn row here, not
                              just from the Redraw action below — the
                              backend now rejects recording payment against
                              a superseded winner row (see
                              winnerService.recordPayment()'s
                              findByRedrawOf guard), so hiding Mark Paid/
                              Mark Non-Payment for it too keeps the UI from
                              offering an action that can no longer
                              succeed. */}
                          {winner.paymentStatus !== "PAID" && !redrawnWinnerIds.has(winner.id) && (
                            <>
                              <button
                                type="button"
                                className="text-success hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isRowActionPending(winner.id)}
                                onClick={() => handleMarkPaid(winner.id)}
                              >
                                {t("adminWinners.markPaid")}
                              </button>
                              <button
                                type="button"
                                className="text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isRowActionPending(winner.id)}
                                onClick={() => handleMarkNonPayment(winner.id)}
                              >
                                {t("adminWinners.markNonPayment")}
                              </button>
                              <RedrawWinnerAction
                                winnerId={winner.id}
                                onSuccess={() => setActionError(null)}
                                onError={setActionError}
                              />
                            </>
                          )}
                          {winner.paymentStatus === "PAID" && (
                            <button
                              type="button"
                              className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isRowActionPending(winner.id)}
                              onClick={() => handleRecordHandover(winner.id)}
                            >
                              {t("adminWinners.recordHandover")}
                            </button>
                          )}
                        </div>
                      )}
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
