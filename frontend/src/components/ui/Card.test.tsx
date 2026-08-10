import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders its children", () => {
    // Act
    render(<Card>Device details</Card>);

    // Assert
    expect(screen.getByText("Device details")).toBeInTheDocument();
  });

  it("merges a custom className with its base styles", () => {
    // Act
    render(<Card className="mt-4">content</Card>);

    // Assert
    const card = screen.getByText("content");
    expect(card).toHaveClass("mt-4");
    expect(card).toHaveClass("rounded-lg");
  });
});
