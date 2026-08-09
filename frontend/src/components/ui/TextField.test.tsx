import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "@/components/ui/TextField";

describe("TextField", () => {
  it("associates the label with the input", () => {
    // Act
    render(<TextField label="Staff ID" name="staffNumber" />);

    // Assert
    expect(screen.getByLabelText("Staff ID")).toBeInTheDocument();
  });

  it("marks the input invalid and links it to the error message", () => {
    // Act
    render(<TextField label="Staff ID" name="staffNumber" error="Staff ID is required" />);

    // Assert
    const input = screen.getByLabelText("Staff ID");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Staff ID is required");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("does not mark the input invalid when there is no error", () => {
    // Act
    render(<TextField label="Staff ID" name="staffNumber" />);

    // Assert
    expect(screen.getByLabelText("Staff ID")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
