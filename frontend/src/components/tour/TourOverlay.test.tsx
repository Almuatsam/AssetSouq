import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TourOverlay } from "@/components/tour/TourOverlay";
import { useTourTarget } from "@/hooks/useTourTarget";
import { useTour } from "@/store/TourContext";
import i18n from "@/utils/i18n";

vi.mock("@/store/TourContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store/TourContext")>();
  return { ...actual, useTour: vi.fn() };
});
vi.mock("@/hooks/useTourTarget", () => ({ useTourTarget: vi.fn() }));

const mockedUseTour = useTour as unknown as ReturnType<typeof vi.fn>;
const mockedUseTourTarget = useTourTarget as unknown as ReturnType<typeof vi.fn>;

function baseTourValue(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    currentTourId: "employee-onboarding",
    currentStepIndex: 0,
    activeStep: {
      id: "s1",
      titleKey: "onboarding.employeeTour.welcome.title",
      bodyKey: "onboarding.employeeTour.welcome.body",
      targetSelector: "some-target",
      placement: "top",
    },
    totalSteps: 3,
    isFirstStep: true,
    isLastStep: false,
    isHelpPopoverOpen: false,
    start: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    skip: vi.fn(),
    finish: vi.fn(),
    goToStep: vi.fn(),
    ...overrides,
  };
}

function renderOverlay(
  tourOverrides: Record<string, unknown> = {},
  targetResult: { element: HTMLElement | null; rect: DOMRect | null; status: string } = {
    element: null,
    rect: null,
    status: "pending",
  },
) {
  const tourValue = baseTourValue(tourOverrides);
  mockedUseTour.mockReturnValue(tourValue);
  mockedUseTourTarget.mockReturnValue(targetResult);
  render(
    <I18nextProvider i18n={i18n}>
      <TourOverlay />
    </I18nextProvider>,
  );
  return tourValue;
}

describe("TourOverlay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when the tour isn't active", () => {
    // Act
    renderOverlay({ isActive: false, activeStep: null });

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the tooltip once a targeted step's element is found", () => {
    // Arrange
    const el = document.createElement("div");

    // Act
    renderOverlay({}, { element: el, rect: el.getBoundingClientRect(), status: "found" });

    // Assert
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render while a targeted step is still resolving (pending)", () => {
    // Act
    renderOverlay({}, { element: null, rect: null, status: "pending" });

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('auto-advances via next() when the target is missing and onMissingTarget is "skip" (the default)', async () => {
    // Act
    const tourValue = renderOverlay(
      {
        activeStep: {
          id: "s1",
          titleKey: "x",
          bodyKey: "y",
          targetSelector: "missing",
          placement: "top",
        },
      },
      { element: null, rect: null, status: "not-found" },
    );

    // Assert
    await waitFor(() => expect(tourValue.next).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('renders a centered tooltip without auto-advancing when onMissingTarget is "center"', () => {
    // Act
    const tourValue = renderOverlay(
      {
        activeStep: {
          id: "s1",
          titleKey: "onboarding.employeeTour.welcome.title",
          bodyKey: "onboarding.employeeTour.welcome.body",
          targetSelector: "missing",
          placement: "center",
          onMissingTarget: "center",
        },
      },
      { element: null, rect: null, status: "not-found" },
    );

    // Assert
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(tourValue.next).not.toHaveBeenCalled();
  });

  it("renders centered immediately for a step with no targetSelector at all (e.g. welcome/complete)", () => {
    // Act
    renderOverlay(
      {
        activeStep: {
          id: "welcome",
          titleKey: "onboarding.employeeTour.welcome.title",
          bodyKey: "onboarding.employeeTour.welcome.body",
          placement: "center",
        },
      },
      { element: null, rect: null, status: "not-found" },
    );

    // Assert
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
