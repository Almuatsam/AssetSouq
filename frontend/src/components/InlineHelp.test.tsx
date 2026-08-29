import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it } from "vitest";

import { InlineHelp } from "@/components/InlineHelp";
import i18n from "@/utils/i18n";

function renderInlineHelp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <InlineHelp
        titleKey="onboarding.inlineHelp.registrationAgree.title"
        bodyKey="onboarding.inlineHelp.registrationAgree.body"
      />
    </I18nextProvider>,
  );
}

describe("InlineHelp", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders a labeled trigger button with the popover closed by default", () => {
    // Act
    renderInlineHelp();

    // Assert
    expect(screen.getByRole("button", { name: "About these terms" })).toBeInTheDocument();
    expect(screen.queryByText(/devices are sold as-is/i)).not.toBeInTheDocument();
  });

  it("shows the title and body in a popover on click", async () => {
    // Arrange
    const user = userEvent.setup();
    renderInlineHelp();

    // Act
    await user.click(screen.getByRole("button", { name: "About these terms" }));

    // Assert
    expect(screen.getByText("About these terms")).toBeInTheDocument();
    expect(screen.getByText(/devices are sold as-is/i)).toBeInTheDocument();
  });

  it("closes again on a second click", async () => {
    // Arrange
    const user = userEvent.setup();
    renderInlineHelp();
    await user.click(screen.getByRole("button", { name: "About these terms" }));
    expect(screen.getByText(/devices are sold as-is/i)).toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", { name: "About these terms" }));

    // Assert
    expect(screen.queryByText(/devices are sold as-is/i)).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    // Arrange
    const user = userEvent.setup();
    renderInlineHelp();
    await user.click(screen.getByRole("button", { name: "About these terms" }));

    // Act
    await user.keyboard("{Escape}");

    // Assert
    expect(screen.queryByText(/devices are sold as-is/i)).not.toBeInTheDocument();
  });
});
