import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EmployeeStatusBadges } from "@/components/EmployeeStatusBadges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useAdminEmployees, useImportEmployees, useUpdateEmployee } from "@/hooks/useAdminEmployees";
import { useAuth } from "@/store/AuthContext";
import type { EmployeeImportSummary, EmployeeListFilters } from "@/types/employee";

// "" means "no filter" — kept as a string (not boolean|undefined directly)
// because that's what a native <select>'s value can hold.
type TriStateFilter = "" | "true" | "false";

function toBooleanFilter(value: TriStateFilter): boolean | undefined {
  return value === "" ? undefined : value === "true";
}

export default function AdminEmployeesPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [activeFilter, setActiveFilter] = useState<TriStateFilter>("");
  const [eligibleFilter, setEligibleFilter] = useState<TriStateFilter>("");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filters: EmployeeListFilters = {
    active: toBooleanFilter(activeFilter),
    eligible: toBooleanFilter(eligibleFilter),
    search: search.trim() || undefined,
  };

  const { data: employees, isLoading, isError } = useAdminEmployees(filters);
  const updateEmployee = useUpdateEmployee();

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<EmployeeImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const importEmployees = useImportEmployees();

  // Only the active/inactive toggle lives here as a one-click action —
  // eligible/laptopHolder are informational attributes edited through the
  // form, not lifecycle state with a natural "undo this" quick action.
  const handleToggleActive = async (id: number, nextActive: boolean, confirmMessage: string) => {
    if (!window.confirm(confirmMessage)) return;
    setActionError(null);
    try {
      await updateEmployee.mutateAsync({ id, data: { active: nextActive } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("adminEmployees.actionError"));
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportError(null);
    setImportSummary(null);
    try {
      const summary = await importEmployees.mutateAsync(importFile);
      setImportSummary(summary);
      setImportFile(null);
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("adminEmployees.importError"));
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">{t("adminEmployees.title")}</h1>
            <p className="text-sm text-gray">{t("adminEmployees.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/employees/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t("adminEmployees.addEmployee")}
            </Link>
            <Button onClick={logout}>{t("common.logout")}</Button>
          </div>
        </header>

        <Card className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium text-primary">{t("adminEmployees.importTitle")}</h2>
            <p className="text-xs text-gray">{t("adminEmployees.importDescription")}</p>
          </div>
          <form
            className="flex flex-wrap items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleImport();
            }}
          >
            <label htmlFor="employee-import-file" className="sr-only">
              {t("adminEmployees.importTitle")}
            </label>
            <input
              id="employee-import-file"
              ref={importFileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <Button type="submit" isLoading={importEmployees.isPending} disabled={!importFile}>
              {t("adminEmployees.import")}
            </Button>
          </form>
          {importError && (
            <p role="alert" className="text-sm text-danger">
              {importError}
            </p>
          )}
          {importSummary && (
            <div role="status" className="text-sm">
              <p className="text-success">
                {t("adminEmployees.importSummary", {
                  created: importSummary.created,
                  updated: importSummary.updated,
                })}
              </p>
              {importSummary.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-danger">
                  {importSummary.errors.map((rowError) => (
                    <li key={rowError.row}>
                      {t("adminEmployees.importRowError", { row: rowError.row, message: rowError.message })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="active-filter" className="text-sm text-gray">
              {t("adminEmployees.activeFilterLabel")}
            </label>
            <select
              id="active-filter"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as TriStateFilter)}
              className="rounded-md border border-gray/30 px-3 py-1.5 text-sm"
            >
              <option value="">{t("adminEmployees.filterAll")}</option>
              <option value="true">{t("employeeStatus.active")}</option>
              <option value="false">{t("employeeStatus.inactive")}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="eligible-filter" className="text-sm text-gray">
              {t("adminEmployees.eligibleFilterLabel")}
            </label>
            <select
              id="eligible-filter"
              value={eligibleFilter}
              onChange={(e) => setEligibleFilter(e.target.value as TriStateFilter)}
              className="rounded-md border border-gray/30 px-3 py-1.5 text-sm"
            >
              <option value="">{t("adminEmployees.filterAll")}</option>
              <option value="true">{t("employeeStatus.eligible")}</option>
              <option value="false">{t("employeeStatus.ineligible")}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="employee-search" className="text-sm text-gray">
              {t("adminEmployees.searchLabel")}
            </label>
            <input
              id="employee-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("adminEmployees.searchPlaceholder")}
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
            {t("adminEmployees.loadError")}
          </p>
        ) : employees && employees.length > 0 ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray/15 text-gray">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminEmployees.staffNumber")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminEmployees.name")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminEmployees.department")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminEmployees.email")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminEmployees.status")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("adminEmployees.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray/10 last:border-0">
                    <td className="px-4 py-3">{employee.staffNumber}</td>
                    <td className="px-4 py-3">{employee.name}</td>
                    <td className="px-4 py-3">{employee.department}</td>
                    <td className="px-4 py-3">{employee.email}</td>
                    <td className="px-4 py-3">
                      <EmployeeStatusBadges employee={employee} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={`/admin/employees/${employee.id}/edit`}
                          className="text-primary hover:underline"
                        >
                          {t("adminEmployees.edit")}
                        </Link>
                        {employee.active ? (
                          <button
                            type="button"
                            className="text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={updateEmployee.isPending}
                            onClick={() =>
                              handleToggleActive(employee.id, false, t("adminEmployees.confirmDeactivate"))
                            }
                          >
                            {t("adminEmployees.deactivate")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-success hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={updateEmployee.isPending}
                            onClick={() =>
                              handleToggleActive(employee.id, true, t("adminEmployees.confirmActivate"))
                            }
                          >
                            {t("adminEmployees.activate")}
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
          <p className="text-gray">{t("adminEmployees.empty")}</p>
        )}
      </div>
    </main>
  );
}
