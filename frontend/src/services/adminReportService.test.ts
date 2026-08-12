import { beforeEach, describe, expect, it, vi } from "vitest";

import { adminReportService } from "@/services/adminReportService";
import { apiClient } from "@/services/apiClient";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

describe("adminReportService.download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom doesn't implement Blob URLs — stub both so triggerBlobDownload
    // can run without throwing "not implemented".
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("requests the report as a blob and triggers a download with the expected filename", async () => {
    // Arrange
    const blob = new Blob(["fake-xlsx-bytes"]);
    mockedGet.mockResolvedValue({ data: blob });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    // Act
    await adminReportService.download("winners");

    // Assert
    expect(mockedGet).toHaveBeenCalledWith("/admin/reports/winners", { responseType: "blob" });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    // The temporary <a> must not linger in the DOM after triggering the
    // download.
    expect(document.querySelector("a[download]")).not.toBeInTheDocument();
    // revokeObjectURL is deferred to the next tick (see triggerBlobDownload's
    // comment) — wait for it rather than asserting immediately.
    await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url"));

    // Cleanup
    clickSpy.mockRestore();
  });

  it("requests each report type from its own endpoint", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: new Blob(["x"]) });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    // Act
    await adminReportService.download("devices");
    await adminReportService.download("employees");
    await adminReportService.download("registrations");

    // Assert
    expect(mockedGet).toHaveBeenNthCalledWith(1, "/admin/reports/devices", { responseType: "blob" });
    expect(mockedGet).toHaveBeenNthCalledWith(2, "/admin/reports/employees", { responseType: "blob" });
    expect(mockedGet).toHaveBeenNthCalledWith(3, "/admin/reports/registrations", { responseType: "blob" });
  });

  it("normalizes a generic network failure into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminReportService.download("devices")).rejects.toThrow(/went wrong/i);
  });

  it("decodes a JSON error message out of a blob error response (e.g. a rate limit)", async () => {
    // Arrange — mirrors what axios delivers for a failed request when
    // responseType: "blob" was set: the JSON error body arrives as a Blob,
    // not already parsed. jsdom's Blob has no .text() implementation at
    // all (only slice()), unlike every real browser, so it's stubbed on
    // this one instance rather than changing production code to work
    // around a test-environment gap.
    const errorBlob = new Blob([JSON.stringify({ success: false, error: "Too many requests." })], {
      type: "application/json",
    });
    errorBlob.text = async () => JSON.stringify({ success: false, error: "Too many requests." });
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { status: 429, data: errorBlob },
    });

    // Act / Assert
    await expect(adminReportService.download("devices")).rejects.toThrow("Too many requests.");
  });

  it("falls back to the generic error when the blob error body isn't valid JSON", async () => {
    // Arrange
    const errorBlob = new Blob(["not json"]);
    errorBlob.text = async () => "not json";
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: errorBlob },
    });

    // Act / Assert
    await expect(adminReportService.download("devices")).rejects.toThrow(/went wrong/i);
  });
});
