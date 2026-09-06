import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    // Act
    render(
      <Modal open={false} onClose={vi.fn()} titleId="t">
        <h2 id="t">Title</h2>
      </Modal>,
    );

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders as an accessible dialog labelled by titleId when open", () => {
    // Act
    render(
      <Modal open onClose={vi.fn()} titleId="my-title">
        <h2 id="my-title">Modal Title</h2>
      </Modal>,
    );

    // Assert
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Modal Title");
  });

  it("calls onClose when the overlay is clicked", async () => {
    // Arrange
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} titleId="t">
        <h2 id="t">Title</h2>
      </Modal>,
    );

    // Act — the overlay is the element rendered before the dialog panel,
    // marked aria-hidden.
    const overlay = document.querySelector('[aria-hidden="true"]');
    await user.click(overlay as Element);

    // Assert
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape", async () => {
    // Arrange
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} titleId="t">
        <h2 id="t">Title</h2>
      </Modal>,
    );

    // Act
    await user.keyboard("{Escape}");

    // Assert
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on overlay click or Escape when dismissable is false", async () => {
    // Arrange
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} titleId="t" dismissable={false}>
        <h2 id="t">Title</h2>
      </Modal>,
    );

    // Act
    await user.keyboard("{Escape}");
    const overlay = document.querySelector('[aria-hidden="true"]');
    await user.click(overlay as Element);

    // Assert
    expect(onClose).not.toHaveBeenCalled();
  });

  it("moves focus into the dialog when opened", () => {
    // Act
    render(
      <Modal open onClose={vi.fn()} titleId="t">
        <h2 id="t">Title</h2>
        <button>First focusable</button>
      </Modal>,
    );

    // Assert — same assertion shape as TourTooltip.test.tsx's own
    // "focus trap" test for the identical hook: jsdom reports every
    // element's offsetParent as null (no real layout), so useFocusTrap's
    // getFocusable() filter can't find the button here the way a real
    // browser would — it falls back to the dialog container itself
    // (tabIndex={-1}), which is still a real, verifiable improvement
    // over focus staying on the document body.
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });
});
