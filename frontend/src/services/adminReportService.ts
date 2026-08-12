import { isAxiosError } from "axios";

import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ReportType } from "@/types/report";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const REPORT_FILENAMES: Record<ReportType, string> = {
  devices: "devices-report.xlsx",
  employees: "employees-report.xlsx",
  registrations: "registrations-report.xlsx",
  winners: "winners-report.xlsx",
};

// A failed request with responseType: "blob" still arrives as a Blob in
// err.response.data (axios doesn't know it's JSON until told) — the
// backend's { success: false, error } body is in there, just not parsed
// yet, so toUserFacingError()'s normal err.response.data.error read would
// always miss it. This decodes that blob back to text/JSON first so a
// real backend error message (e.g. a rate-limit 429) still reaches the
// user instead of falling through to a generic one.
async function extractBlobErrorMessage(blob: Blob): Promise<string | null> {
  try {
    const parsed = JSON.parse(await blob.text()) as { error?: string };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Deferred rather than revoked immediately after click() — some
  // browsers have historically raced the revocation against the download
  // actually starting from the blob: URL; a 0ms timeout pushes the revoke
  // to the next tick, after the browser has already begun the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const adminReportService = {
  async download(reportType: ReportType): Promise<void> {
    try {
      const res = await apiClient.get<Blob>(`/admin/reports/${reportType}`, { responseType: "blob" });
      triggerBlobDownload(new Blob([res.data], { type: XLSX_CONTENT_TYPE }), REPORT_FILENAMES[reportType]);
    } catch (err) {
      if (isAxiosError(err) && err.response?.data instanceof Blob) {
        const message = await extractBlobErrorMessage(err.response.data);
        if (message) throw new Error(message);
      }
      throw toUserFacingError(err);
    }
  },
};
