import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("calls onClick when clicked", async () => {
    // Arrange
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    // Act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Assert
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and marked busy while isLoading, and does not fire onClick", async () => {
    // Arrange
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} isLoading>
        Save
      </Button>,
    );

    // Act
    const button = screen.getByRole("button", { name: "Save" });
    await user.click(button);

    // Assert
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects an explicit disabled prop independent of isLoading", () => {
    // Act
    render(<Button disabled>Save</Button>);

    // Assert
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
