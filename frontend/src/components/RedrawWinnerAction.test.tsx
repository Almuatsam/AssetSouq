import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RedrawWinnerAction } from "@/components/RedrawWinnerAction";
import { adminWinnerService } from "@/services/adminWinnerService";
import { renderWithProviders } from "@/test/renderWithProviders";

vi.mock("@/services/adminWinnerService");

const mockedAdminWinnerService = adminWinnerService as unknown as { redraw: ReturnType<typeof vi.fn> };

describe("RedrawWinnerAction", () => {
  const confirmSpy = vi.spyOn(window, "confirm");
  const onSuccess = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => confirmSpy.mockReset());

  it("redraws with the default reason after confirmation and calls onSuccess", async () => {
    // Arrange
    confirmSpy.mockReturnValue(true);
    mockedAdminWinnerService.redraw.mockResolvedValue({ id: 2 });
    const user = userEvent.setup();
    renderWithProviders(<RedrawWinnerAction winnerId={1} onSuccess={onSuccess} onError={onError} />);

    // Act
    await user.click(screen.getByRole("button", { name: /redraw/i }));

    // Assert
    expect(mockedAdminWinnerService.redraw).toHaveBeenCalledWith(1, "NON_PAYMENT");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("redraws with the selected reason", async () => {
    // Arrange
    confirmSpy.mockReturnValue(true);
    mockedAdminWinnerService.redraw.mockResolvedValue({ id: 2 });
    const user = userEvent.setup();
    renderWithProviders(<RedrawWinnerAction winnerId={1} onSuccess={onSuccess} onError={onError} />);

    // Act
    await user.selectOptions(screen.getByLabelText(/redraw reason/i), "DECLINED");
    await user.click(screen.getByRole("button", { name: /redraw/i }));

    // Assert
    expect(mockedAdminWinnerService.redraw).toHaveBeenCalledWith(1, "DECLINED");
  });

  it("does nothing when the confirmation is declined", async () => {
    // Arrange
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    renderWithProviders(<RedrawWinnerAction winnerId={1} onSuccess={onSuccess} onError={onError} />);

    // Act
    await user.click(screen.getByRole("button", { name: /redraw/i }));

    // Assert
    expect(mockedAdminWinnerService.redraw).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("calls onError with the failure message when the redraw fails", async () => {
    // Arrange
    confirmSpy.mockReturnValue(true);
    mockedAdminWinnerService.redraw.mockRejectedValue(
      new Error("No remaining eligible candidates in the waiting list"),
    );
    const user = userEvent.setup();
    renderWithProviders(<RedrawWinnerAction winnerId={1} onSuccess={onSuccess} onError={onError} />);

    // Act
    await user.click(screen.getByRole("button", { name: /redraw/i }));

    // Assert
    expect(onError).toHaveBeenCalledWith("No remaining eligible candidates in the waiting list");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("disables the reason select and the button while the redraw is in flight", async () => {
    // Arrange
    confirmSpy.mockReturnValue(true);
    let resolveRedraw!: (value: unknown) => void;
    mockedAdminWinnerService.redraw.mockReturnValue(
      new Promise((resolve) => {
        resolveRedraw = resolve;
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RedrawWinnerAction winnerId={1} onSuccess={onSuccess} onError={onError} />);
    const button = screen.getByRole("button", { name: /redraw/i });

    // Act
    await user.click(button);

    // Assert — still mid-flight, must not accept a second click
    expect(button).toBeDisabled();
    expect(screen.getByLabelText(/redraw reason/i)).toBeDisabled();

    // Cleanup — resolve so the mutation doesn't leak into the next test
    resolveRedraw({ id: 2 });
  });
});
