import { useEffect, useRef, useState } from "react";

export type TourTargetStatus = "pending" | "found" | "not-found";

export interface UseTourTargetResult {
  element: HTMLElement | null;
  rect: DOMRect | null;
  status: TourTargetStatus;
}

const POLL_TIMEOUT_MS = 2500;

// Resolves a `[data-tour="<selector>"]` element and keeps its bounding
// rect in sync. Polls (MutationObserver-assisted) rather than assuming
// the element is present synchronously — a route navigation and the new
// page's mount are two separate async steps (see TourRouteSync), so the
// target frequently doesn't exist yet at the moment this hook runs.
export function useTourTarget(
  selector: string | undefined,
  { reducedMotion = false }: { reducedMotion?: boolean } = {},
): UseTourTargetResult {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [status, setStatus] = useState<TourTargetStatus>(selector ? "pending" : "not-found");
  const [resolvedSelector, setResolvedSelector] = useState(selector);
  const hasScrolledRef = useRef(false);

  // Reset synchronously during render (React's "adjusting state while
  // rendering" pattern) rather than only in the effect below. `useState`'s
  // initializer only runs on mount, so without this, `status` from the
  // PREVIOUS step's selector (e.g. "not-found" for a no-target step) stays
  // visible to callers for one extra render after `selector` changes — long
  // enough for TourOverlay's missing-target auto-advance effect to read the
  // stale "not-found" and skip the new step before it ever got a chance to
  // resolve, cascading into every subsequent step and tripping React's
  // "Maximum update depth exceeded" guard.
  if (selector !== resolvedSelector) {
    setResolvedSelector(selector);
    setElement(null);
    setRect(null);
    setStatus(selector ? "pending" : "not-found");
  }

  useEffect(() => {
    hasScrolledRef.current = false;

    if (!selector) {
      setElement(null);
      setRect(null);
      setStatus("not-found");
      return;
    }

    let cancelled = false;
    const attrSelector = `[data-tour="${selector}"]`;

    function tryResolve(): boolean {
      const el = document.querySelector<HTMLElement>(attrSelector);
      if (!el) return false;
      if (cancelled) return true;
      setElement(el);
      setRect(el.getBoundingClientRect());
      setStatus("found");
      return true;
    }

    if (tryResolve()) return;

    const observer = new MutationObserver(() => {
      if (tryResolve()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setStatus((current) => (current === "found" ? current : "not-found"));
      observer.disconnect();
    }, POLL_TIMEOUT_MS);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [selector]);

  // Auto-scroll the target into view once, the first time it's found —
  // not on every rect recompute below, or scroll/resize would keep
  // re-triggering scrollIntoView.
  useEffect(() => {
    if (status === "found" && element && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      element.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [status, element, reducedMotion]);

  // Keep the rect in sync while the target is on screen — the spotlight
  // cutout and tooltip position both depend on it staying current.
  useEffect(() => {
    if (status !== "found" || !element) return;

    let rafId = 0;
    const recompute = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setRect(element.getBoundingClientRect()));
    };

    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(element);
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [status, element]);

  return { element, rect, status };
}
