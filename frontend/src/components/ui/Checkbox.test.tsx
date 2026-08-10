import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
  it("associates the label with the input", () => {
    // Act
    render(<Checkbox label="Laptop holder" name="laptopHolder" />);

    // Assert
    expect(screen.getByLabelText("Laptop holder")).toBeInTheDocument();
  });

  it("is unchecked by default and toggles on click", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Checkbox label="Laptop holder" name="laptopHolder" />);
    const checkbox = screen.getByLabelText("Laptop holder");

    // Assert (initial)
    expect(checkbox).not.toBeChecked();

    // Act
    await user.click(checkbox);

    // Assert
    expect(checkbox).toBeChecked();
  });

  it("forwards onChange", async () => {
    // Arrange
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox label="Laptop holder" name="laptopHolder" onChange={handleChange} />);

    // Act
    await user.click(screen.getByLabelText("Laptop holder"));

    // Assert
    expect(handleChange).toHaveBeenCalled();
  });
});
