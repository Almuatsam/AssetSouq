import { useMutation } from "@tanstack/react-query";

import { adminReportService } from "@/services/adminReportService";
import type { ReportType } from "@/types/report";

// No cache invalidation here (unlike the other admin mutations in this
// codebase) — a report download has no server state to invalidate; it's a
// side-effecting export, not a write. useMutation is used purely for its
// isPending/error tracking so the page can disable a button mid-download
// and surface a failure.
export function useDownloadReport() {
  return useMutation({
    mutationFn: (reportType: ReportType) => adminReportService.download(reportType),
  });
}
