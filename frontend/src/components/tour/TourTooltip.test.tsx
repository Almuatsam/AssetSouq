import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TourTooltip } from "@/components/tour/TourTooltip";
import { useTour } from "@/store/TourContext";
import i18n from "@/utils/i18n";

vi.mock("@/store/TourContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store/TourContext")>();
  return { ...actual, useTour: vi.fn() };
});

const mockedUseTour = useTour as unknown as ReturnType<typeof vi.fn>;

const step = {
  id: "employee-welcome",
  titleKey: "onboarding.employeeTour.welcome.title",
  bodyKey: "onboarding.employeeTour.welcome.body",
  placement: "center" as const,
};

function baseTourValue(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    currentTourId: "employee-onboarding",
    currentStepIndex: 0,
    activeStep: step,
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

function renderTooltip(overrides: Record<string, unknown> = {}, targetElement: HTMLElement | null = null) {
  const tourValue = baseTourValue(overrides);
  mockedUseTour.mockReturnValue(tourValue);
  const result = render(
    <I18nextProvider i18n={i18n}>
      <TourTooltip targetElement={targetElement} />
    </I18nextProvider>,
  );
  return { ...result, tourValue };
}

describe("TourTooltip", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("renders nothing when the tour isn't active", () => {
    // Act
    renderTooltip({ isActive: false, activeStep: null });

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the step title, body, and progress", () => {
    // Act
    renderTooltip();

    // Assert
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Welcome to AssetSouq")).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("hides the Previous button on the first step", () => {
    // Act
    renderTooltip({ isFirstStep: true });

    // Assert
    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
  });

  it("shows the Previous button on a later step", () => {
    // Act
    renderTooltip({ isFirstStep: false, currentStepIndex: 1 });

    // Assert
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
  });

  it('shows "Finish" instead of "Next" on the last step', () => {
    // Act
    renderTooltip({ isLastStep: true });

    // Assert
    expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
  });

  it("calls next() when Next is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const { tourValue } = renderTooltip();

    // Act
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Assert
    expect(tourValue.next).toHaveBeenCalledTimes(1);
  });

  it("calls finish() when Finish is clicked on the last step", async () => {
    // Arrange
    const user = userEvent.setup();
    const { tourValue } = renderTooltip({ isLastStep: true });

    // Act
    await user.click(screen.getByRole("button", { name: /finish/i }));

    // Assert
    expect(tourValue.finish).toHaveBeenCalledTimes(1);
  });

  it("calls skip() when Skip tour is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const { tourValue } = renderTooltip();

    // Act
    await user.click(screen.getByRole("button", { name: /skip tour/i }));

    // Assert
    expect(tourValue.skip).toHaveBeenCalledTimes(1);
  });

  it("calls previous() when Previous is clicked on a later step", async () => {
    // Arrange
    const user = userEvent.setup();
    const { tourValue } = renderTooltip({ isFirstStep: false, currentStepIndex: 1 });

    // Act
    await user.click(screen.getByRole("button", { name: /previous/i }));

    // Assert
    expect(tourValue.previous).toHaveBeenCalledTimes(1);
  });

  it("Escape calls skip()", () => {
    // Arrange
    const { tourValue } = renderTooltip();

    // Act
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(event);

    // Assert
    expect(tourValue.skip).toHaveBeenCalledTimes(1);
  });

  it("ArrowRight calls next()", () => {
    // Arrange
    const { tourValue } = renderTooltip();

    // Act
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    // Assert
    expect(tourValue.next).toHaveBeenCalledTimes(1);
  });

  it("ArrowLeft calls previous()", () => {
    // Arrange
    const { tourValue } = renderTooltip({ isFirstStep: false, currentStepIndex: 1 });

    // Act
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));

    // Assert
    expect(tourValue.previous).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog on mount (focus trap)", () => {
    // Act
    renderTooltip();

    // Assert — the Next button (a real focusable element inside the
    // trapped container) should end up focused, not the document body.
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });
});
