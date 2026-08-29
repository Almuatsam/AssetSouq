import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spotlight } from "@/components/tour/Spotlight";

describe("Spotlight", () => {
  it("renders only the full-dim rect when there is no target rect", () => {
    // Act
    const { container } = render(<Spotlight rect={null} />);

    // Assert — the dim overlay rect (inside the mask reference) always
    // renders; the cutout <rect> inside the mask does not.
    const mask = container.querySelector("mask");
    expect(mask?.querySelectorAll("rect")).toHaveLength(1); // just the base white rect
    expect(container.querySelectorAll("svg > rect")).toHaveLength(1); // just the dim overlay, no highlight ring
  });

  it("renders a cutout and highlight ring sized to the given rect", () => {
    // Arrange
    const rect = { left: 10, top: 20, width: 100, height: 50 } as DOMRect;

    // Act
    const { container } = render(<Spotlight rect={rect} />);

    // Assert
    const mask = container.querySelector("mask");
    expect(mask?.querySelectorAll("rect")).toHaveLength(2); // base white rect + black cutout
    expect(container.querySelectorAll("svg > rect")).toHaveLength(2); // dim overlay + highlight ring
  });

  it("is purely decorative (aria-hidden), leaving the accessible dialog to TourTooltip", () => {
    // Act
    const { container } = render(<Spotlight rect={null} />);

    // Assert
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
