import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelpAccountButton } from "@/components/tour/HelpAccountButton";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAuth } from "@/store/AuthContext";
import { useTour } from "@/store/TourContext";
import * as registry from "@/tours/registry";
import i18n from "@/utils/i18n";

vi.mock("@/store/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store/AuthContext")>();
  return { ...actual, useAuth: vi.fn() };
});
vi.mock("@/store/TourContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store/TourContext")>();
  return { ...actual, useTour: vi.fn() };
});
vi.mock("@/hooks/useOnboardingProgress", () => ({ useOnboardingProgress: vi.fn() }));
vi.mock("@/tours/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/tours/registry")>();
  return { ...actual, hasUnseenWhatsNew: vi.fn(() => false) };
});

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockedUseTour = useTour as unknown as ReturnType<typeof vi.fn>;
const mockedUseOnboardingProgress = useOnboardingProgress as unknown as ReturnType<typeof vi.fn>;
const mockedHasUnseenWhatsNew = registry.hasUnseenWhatsNew as unknown as ReturnType<typeof vi.fn>;

const employeeSession = {
  token: "tok",
  user: {
    role: "EMPLOYEE" as const,
    employee: { id: 10, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true },
  },
};

function baseTourValue(overrides: Record<string, unknown> = {}) {
  return {
    isActive: false,
    currentTourId: null,
    currentStepIndex: 0,
    activeStep: null,
    totalSteps: 0,
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

function renderButton({
  session = employeeSession as unknown,
  tourOverrides = {},
  progress = { status: "not_started", currentStepId: null, tourVersion: null, whatsNewSeenVersion: null, checklist: { dismissed: false, items: {} } },
} = {}) {
  mockedUseAuth.mockReturnValue({ session, login: vi.fn(), logout: vi.fn() });
  const tourValue = baseTourValue(tourOverrides);
  mockedUseTour.mockReturnValue(tourValue);
  mockedUseOnboardingProgress.mockReturnValue({ data: progress });
  render(
    <I18nextProvider i18n={i18n}>
      <HelpAccountButton />
    </I18nextProvider>,
  );
  return tourValue;
}

describe("HelpAccountButton", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockedHasUnseenWhatsNew.mockReturnValue(false);
    await i18n.changeLanguage("en");
  });

  it("renders nothing when there is no session", () => {
    // Act
    renderButton({ session: null });

    // Assert
    expect(screen.queryByRole("button", { name: /help/i })).not.toBeInTheDocument();
  });

  it("renders the trigger button with its tour anchor when signed in", () => {
    // Act
    renderButton();

    // Assert
    const button = screen.getByRole("button", { name: /help/i });
    expect(button).toHaveAttribute("data-tour", "help-account-button");
  });

  it("opens the popover on click, showing Restart tour and the language switcher", async () => {
    // Arrange
    const user = userEvent.setup();
    renderButton();

    // Act
    await user.click(screen.getByRole("button", { name: /help/i }));

    // Assert
    expect(screen.getByRole("button", { name: /take the tour again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "العربية" })).toBeInTheDocument();
  });

  it("does not show a What's New entry when there's no unseen tagged content", async () => {
    // Arrange
    const user = userEvent.setup();
    renderButton();

    // Act
    await user.click(screen.getByRole("button", { name: /help/i }));

    // Assert
    expect(screen.queryByRole("button", { name: /what's new/i })).not.toBeInTheDocument();
  });

  it("shows a What's New entry when unseen tagged content exists", async () => {
    // Arrange
    mockedHasUnseenWhatsNew.mockReturnValue(true);
    const user = userEvent.setup();
    renderButton();

    // Act
    await user.click(screen.getByRole("button", { name: /help/i }));

    // Assert
    expect(screen.getByRole("button", { name: /what's new/i })).toBeInTheDocument();
  });

  it("calls tour.start with the role-correct tour id when Restart is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const tourValue = renderButton();
    await user.click(screen.getByRole("button", { name: /help/i }));

    // Act
    await user.click(screen.getByRole("button", { name: /take the tour again/i }));

    // Assert
    expect(tourValue.start).toHaveBeenCalledWith("employee-onboarding");
  });

  it("opens the popover automatically when the tour drives it open (help-menu step)", () => {
    // Act
    renderButton({ tourOverrides: { isActive: true, isHelpPopoverOpen: true } });

    // Assert
    expect(screen.getByRole("button", { name: /take the tour again/i })).toBeInTheDocument();
  });
});
