import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingChecklist } from "@/components/tour/OnboardingChecklist";
import { onboardingService } from "@/services/onboardingService";
import i18n from "@/utils/i18n";

vi.mock("@/services/onboardingService", () => ({
  onboardingService: { getMine: vi.fn(), updateMine: vi.fn() },
}));

const mockedUpdateMine = onboardingService.updateMine as unknown as ReturnType<typeof vi.fn>;

const items = [
  { id: "takeTour", labelKey: "onboarding.checklist.employee.takeTour", complete: false },
  { id: "browseDevices", labelKey: "onboarding.checklist.employee.browseDevices", complete: true },
];

function renderChecklist(progress: Parameters<typeof OnboardingChecklist>[0]["progress"], checklistItems = items) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <OnboardingChecklist progress={progress} items={checklistItems} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("OnboardingChecklist", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockedUpdateMine.mockResolvedValue({
      status: "in_progress",
      currentStepId: null,
      tourVersion: null,
      whatsNewSeenVersion: null,
      checklist: { dismissed: true, items: {} },
    });
    await i18n.changeLanguage("en");
  });

  it("renders nothing while progress hasn't loaded yet", () => {
    // Act
    renderChecklist(undefined);

    // Assert
    expect(screen.queryByText(/getting started/i)).not.toBeInTheDocument();
  });

  it("renders nothing once dismissed", () => {
    // Act
    renderChecklist({
      status: "in_progress",
      currentStepId: null,
      tourVersion: null,
      whatsNewSeenVersion: null,
      checklist: { dismissed: true, items: {} },
    });

    // Assert
    expect(screen.queryByText(/getting started/i)).not.toBeInTheDocument();
  });

  it("renders nothing once every item is complete", () => {
    // Act
    renderChecklist(
      { status: "in_progress", currentStepId: null, tourVersion: null, whatsNewSeenVersion: null, checklist: { dismissed: false, items: {} } },
      items.map((item) => ({ ...item, complete: true })),
    );

    // Assert
    expect(screen.queryByText(/getting started/i)).not.toBeInTheDocument();
  });

  it("shows each item with its completion state", () => {
    // Act
    renderChecklist({
      status: "in_progress",
      currentStepId: null,
      tourVersion: null,
      whatsNewSeenVersion: null,
      checklist: { dismissed: false, items: {} },
    });

    // Assert
    expect(screen.getByText("Take the product tour")).toBeInTheDocument();
    expect(screen.getByText("Browse available devices")).toBeInTheDocument();
  });

  it("dismissing sends a checklist.dismissed patch", async () => {
    // Arrange
    const user = userEvent.setup();
    renderChecklist({
      status: "in_progress",
      currentStepId: null,
      tourVersion: null,
      whatsNewSeenVersion: null,
      checklist: { dismissed: false, items: {} },
    });

    // Act
    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    // Assert
    expect(mockedUpdateMine).toHaveBeenCalledWith({ checklist: { dismissed: true } });
  });
});
