import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { onboardingService } from "@/services/onboardingService";
import { AuthProvider } from "@/store/AuthContext";
import { TourProvider, useTour } from "@/store/TourContext";
import { adminTour } from "@/tours/adminTour";
import { employeeTour } from "@/tours/employeeTour";
import * as registry from "@/tours/registry";
import type { AuthSession } from "@/types/auth";
import type { OnboardingProgress } from "@/types/onboarding";

vi.mock("@/services/onboardingService", () => ({
  onboardingService: { getMine: vi.fn(), updateMine: vi.fn() },
}));

vi.mock("@/tours/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/tours/registry")>();
  return {
    ...actual,
    hasUnseenWhatsNew: vi.fn(actual.hasUnseenWhatsNew),
    resolveTour: vi.fn(actual.resolveTour),
  };
});

const mockedService = onboardingService as unknown as {
  getMine: ReturnType<typeof vi.fn>;
  updateMine: ReturnType<typeof vi.fn>;
};
const mockedHasUnseenWhatsNew = registry.hasUnseenWhatsNew as unknown as ReturnType<typeof vi.fn>;
const mockedResolveTour = registry.resolveTour as unknown as ReturnType<typeof vi.fn>;

const employeeSession: AuthSession = {
  token: "tok",
  user: {
    role: "EMPLOYEE",
    employee: { id: 10, staffNumber: "S1001", name: "Jane", department: "IT", email: "j@x.com", active: true },
  },
};

function notStartedProgress(): OnboardingProgress {
  return {
    status: "not_started",
    currentStepId: null,
    tourVersion: null,
    whatsNewSeenVersion: null,
    checklist: { dismissed: false, items: {} },
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TourProvider>{children}</TourProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("useTour", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    // Real behavior by default — individual tests override for just their
    // own assertions (see the What's New test below). Awaited so the reset
    // always completes before the test body runs (clearAllMocks strips the
    // implementation set by the vi.mock factory too, not just call counts).
    const actual = await vi.importActual<typeof import("@/tours/registry")>("@/tours/registry");
    mockedHasUnseenWhatsNew.mockImplementation(actual.hasUnseenWhatsNew);
    mockedResolveTour.mockImplementation(actual.resolveTour);
  });

  it("throws when used outside a TourProvider", () => {
    // Act / Assert
    expect(() => renderHook(() => useTour())).toThrow(/within a TourProvider/);
  });

  it("does not auto-start a tour when there is no session", async () => {
    // Arrange
    mockedService.getMine.mockResolvedValue(notStartedProgress());

    // Act
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await act(async () => {});

    // Assert
    expect(result.current.isActive).toBe(false);
  });

  it("auto-starts the employee tour for a brand-new, not_started user", async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());

    // Act
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });

    // Assert
    await waitFor(() => expect(result.current.isActive).toBe(true));
    expect(result.current.currentTourId).toBe("employee-onboarding");
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.totalSteps).toBe(employeeTour.steps.length);
    await waitFor(() =>
      expect(mockedService.updateMine).toHaveBeenCalledWith({
        action: "start",
        currentStepId: employeeTour.steps[0].id,
      }),
    );
  });

  it("does not auto-start when the user already completed onboarding and there's no new content", async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue({
      ...notStartedProgress(),
      status: "completed",
      whatsNewSeenVersion: 1,
    });

    // Act
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await act(async () => {});

    // Assert
    expect(result.current.isActive).toBe(false);
  });

  it("auto-starts What's New for an already-onboarded user when unseen tagged content exists", async () => {
    // Arrange — the real registry has no isNewInVersion-tagged steps yet
    // (nothing has shipped a "what's new" update), so this simulates the
    // mechanism directly rather than waiting for real tagged content.
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue({
      ...notStartedProgress(),
      status: "completed",
      whatsNewSeenVersion: 0,
    });
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    mockedHasUnseenWhatsNew.mockReturnValue(true);
    mockedResolveTour.mockImplementation((id) =>
      id === "employee-whats-new"
        ? { id, steps: [{ id: "fake-new-step", titleKey: "x", bodyKey: "y", placement: "center" as const }] }
        : employeeTour,
    );

    // Act
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });

    // Assert
    await waitFor(() => expect(result.current.isActive).toBe(true));
    expect(result.current.currentTourId).toBe("employee-whats-new");
  });

  it("next() advances to the next step and persists currentStepId", async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isActive).toBe(true));

    // Act
    act(() => result.current.next());

    // Assert
    expect(result.current.currentStepIndex).toBe(1);
    await waitFor(() =>
      expect(mockedService.updateMine).toHaveBeenCalledWith(
        expect.objectContaining({ currentStepId: employeeTour.steps[1].id }),
      ),
    );
  });

  it("previous() is a no-op on the first step", async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isActive).toBe(true));

    // Act
    act(() => result.current.previous());

    // Assert
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("skip() ends the tour and sends action: skip", async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isActive).toBe(true));

    // Act
    act(() => result.current.skip());

    // Assert
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentTourId).toBeNull();
    await waitFor(() => expect(mockedService.updateMine).toHaveBeenCalledWith({ action: "skip" }));
  });

  it("next() on the last step finishes the tour with action: complete", async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isActive).toBe(true));

    // Act
    act(() => result.current.goToStep(employeeTour.steps.length - 1));
    act(() => result.current.next());

    // Assert
    expect(result.current.isActive).toBe(false);
    await waitFor(() => expect(mockedService.updateMine).toHaveBeenCalledWith({ action: "complete" }));
  });

  it('opens the help popover when entering a step with sideEffect "open-help-popover"', async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isActive).toBe(true));
    const helpMenuIndex = employeeTour.steps.findIndex((step) => step.id === "employee-help-menu");

    // Act
    act(() => result.current.goToStep(helpMenuIndex));

    // Assert
    expect(result.current.isHelpPopoverOpen).toBe(true);
  });

  it('closes the help popover on the "complete" step (sideEffect: close-help-popover)', async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isActive).toBe(true));
    const helpMenuIndex = employeeTour.steps.findIndex((step) => step.id === "employee-help-menu");
    act(() => result.current.goToStep(helpMenuIndex));
    expect(result.current.isHelpPopoverOpen).toBe(true);

    // Act
    act(() => result.current.next());

    // Assert
    expect(result.current.isHelpPopoverOpen).toBe(false);
  });

  it("fires a checklist item PATCH when entering a step with a checklistItemId", async () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(employeeSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isActive).toBe(true));
    const gridIndex = employeeTour.steps.findIndex((step) => step.id === "employee-devices-grid");

    // Act
    act(() => result.current.goToStep(gridIndex));

    // Assert
    await waitFor(() =>
      expect(mockedService.updateMine).toHaveBeenCalledWith({
        checklist: { items: { browseDevices: true } },
      }),
    );
  });

  it("start() with an ADMIN session launches the admin tour", async () => {
    // Arrange
    const adminSession: AuthSession = {
      token: "tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null, credentialsChangedAt: null } },
    };
    localStorage.setItem("assetsouq.auth", JSON.stringify(adminSession));
    mockedService.getMine.mockResolvedValue(notStartedProgress());
    mockedService.updateMine.mockResolvedValue(notStartedProgress());

    // Act
    const { result } = renderHook(() => useTour(), { wrapper: makeWrapper() });

    // Assert
    await waitFor(() => expect(result.current.isActive).toBe(true));
    expect(result.current.currentTourId).toBe("admin-onboarding");
    expect(result.current.totalSteps).toBe(adminTour.steps.length);
  });
});
