import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { useAuth } from "@/store/AuthContext";
import type { AuditLogListFilters } from "@/types/auditLog";

export default function AdminAuditLogPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [entityFilter, setEntityFilter] = useState("");

  const filters: AuditLogListFilters = { entity: entityFilter.trim() || undefined };
  const { data: auditLogs, isLoading, isError } = useAdminAuditLogs(filters);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">{t("adminAuditLog.title")}</h1>
            <p className="text-sm text-gray">{t("adminAuditLog.subtitle")}</p>
          </div>
          <Button onClick={logout}>{t("common.logout")}</Button>
        </header>

        <div className="flex items-center gap-2">
          <label htmlFor="entity-filter" className="text-sm text-gray">
            {t("adminAuditLog.filterLabel")}
          </label>
          <input
            id="entity-filter"
            type="search"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder={t("adminAuditLog.filterPlaceholder")}
            className="rounded-md border border-gray/30 px-3 py-1.5 text-sm"
          />
        </div>

        {isLoading ? (
          <LoadingIndicator />
        ) : isError ? (
          <p role="alert" className="text-danger">
            {t("adminAuditLog.loadError")}
          </p>
        ) : auditLogs && auditLogs.length > 0 ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray/15 text-gray">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminAuditLog.timestamp")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminAuditLog.admin")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminAuditLog.action")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminAuditLog.entity")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminAuditLog.entityId")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray/10 last:border-0">
                    <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">{log.admin?.username ?? t("adminAuditLog.unknownAdmin")}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.entity}</td>
                    <td className="px-4 py-3">{log.entityId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="text-gray">{t("adminAuditLog.empty")}</p>
        )}
      </div>
    </main>
  );
}
