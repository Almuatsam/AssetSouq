import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useDownloadReport } from "@/hooks/useAdminReports";
import { useAuth } from "@/store/AuthContext";
import type { ReportType } from "@/types/report";

const REPORT_TYPES: ReportType[] = ["devices", "employees", "registrations", "winners"];

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  // Keyed per report type, not one shared string — with 4 independently
  // clickable downloads, a shared error slot would let a second failure
  // silently overwrite the first's message with no indication of which
  // report it belonged to.
  const [downloadErrors, setDownloadErrors] = useState<Partial<Record<ReportType, string>>>({});

  // One mutation instance per report type (not one shared instance) so
  // downloading one report doesn't disable the others' buttons while it's
  // in flight — see AdminWinnersPage's RedrawWinnerAction for the same
  // per-item-hook pattern, adopted here after a shared-flag mutation was
  // flagged as a bug on that page.
  const devicesDownload = useDownloadReport();
  const employeesDownload = useDownloadReport();
  const registrationsDownload = useDownloadReport();
  const winnersDownload = useDownloadReport();

  const mutationsByType: Record<ReportType, ReturnType<typeof useDownloadReport>> = {
    devices: devicesDownload,
    employees: employeesDownload,
    registrations: registrationsDownload,
    winners: winnersDownload,
  };

  const handleDownload = async (reportType: ReportType) => {
    setDownloadErrors((prev) => ({ ...prev, [reportType]: undefined }));
    try {
      await mutationsByType[reportType].mutateAsync(reportType);
    } catch (err) {
      setDownloadErrors((prev) => ({
        ...prev,
        [reportType]: err instanceof Error ? err.message : t("adminReports.downloadError"),
      }));
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">{t("adminReports.title")}</h1>
            <p className="text-sm text-gray">{t("adminReports.subtitle")}</p>
          </div>
          <Button onClick={logout}>{t("common.logout")}</Button>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORT_TYPES.map((reportType) => {
            const titleId = `${reportType}-report-title`;
            return (
              <Card key={reportType} className="flex flex-col gap-3">
                <h2 id={titleId} className="text-lg font-semibold text-primary">
                  {t(`adminReports.${reportType}Title`)}
                </h2>
                <p className="text-sm text-gray">{t(`adminReports.${reportType}Description`)}</p>
                {downloadErrors[reportType] && (
                  <p role="alert" className="text-sm text-danger">
                    {downloadErrors[reportType]}
                  </p>
                )}
                {/* Four cards would otherwise render four buttons with the
                    identical accessible name "Download" — aria-labelledby
                    combines the card's own heading with the button's
                    visible text so a screen reader hears e.g. "Devices
                    Report Download" for each one, not four indistinguishable
                    "Download, button" announcements. */}
                <Button
                  aria-labelledby={`${titleId} ${reportType}-download-label`}
                  isLoading={mutationsByType[reportType].isPending}
                  onClick={() => handleDownload(reportType)}
                >
                  <span id={`${reportType}-download-label`}>{t("adminReports.download")}</span>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
