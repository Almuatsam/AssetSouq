import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTourTarget } from "@/hooks/useTourTarget";

describe("useTourTarget", () => {
  beforeEach(() => {
    // jsdom doesn't implement scrollIntoView or ResizeObserver; the hook
    // uses both once a target is found, unrelated to what these tests are
    // verifying.
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reports not-found immediately for a step with no target selector", () => {
    // Arrange / Act — a "center" step passes `undefined` as the selector.
    const { result } = renderHook(() => useTourTarget(undefined));

    // Assert
    expect(result.current.status).toBe("not-found");
  });

  it("never reports the previous step's stale not-found status for a newly-set selector", () => {
    // Arrange — start on a no-target step, whose status resolves to
    // "not-found" immediately (see the case above).
    const { result, rerender } = renderHook(
      ({ selector }: { selector: string | undefined }) => useTourTarget(selector),
      { initialProps: { selector: undefined as string | undefined } },
    );
    expect(result.current.status).toBe("not-found");

    // Act — advance to a step that does have a target selector, the same
    // way TourOverlay does when the tour moves to the next step.
    rerender({ selector: "some-target" });

    // Assert — status must already read "pending" for the new selector
    // within this same render, never the previous step's "not-found".
    // Regression test for the bug where TourOverlay's missing-target
    // auto-advance effect read this stale "not-found" and immediately
    // called tour.next() again before the new step ever got a chance to
    // resolve, cascading through every remaining step and tripping
    // React's "Maximum update depth exceeded" guard.
    expect(result.current.status).toBe("pending");
  });

  it("resolves to found once a matching [data-tour] element exists", () => {
    // Arrange
    const el = document.createElement("div");
    el.setAttribute("data-tour", "some-target");
    document.body.appendChild(el);

    // Act
    const { result } = renderHook(() => useTourTarget("some-target"));

    // Assert
    expect(result.current.status).toBe("found");
    expect(result.current.element).toBe(el);
  });

  it("resolves to not-found once the poll times out for a genuinely missing target", () => {
    // Arrange
    vi.useFakeTimers();

    // Act
    const { result } = renderHook(() => useTourTarget("never-rendered"));
    expect(result.current.status).toBe("pending");
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Assert
    expect(result.current.status).toBe("not-found");

    vi.useRealTimers();
  });
});
