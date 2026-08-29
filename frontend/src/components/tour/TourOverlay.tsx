import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Spotlight } from "@/components/tour/Spotlight";
import { getTourPortalRoot } from "@/components/tour/tourPortalRoot";
import { TourTooltip } from "@/components/tour/TourTooltip";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTourTarget } from "@/hooks/useTourTarget";
import { useTour } from "@/store/TourContext";

// Orchestrates a single active step: resolves its target (if any),
// decides the missing-target fallback (skip vs. center — see
// tours/types.ts), and portals the Spotlight + TourTooltip pair.
export function TourOverlay() {
  const tour = useTour();
  const reducedMotion = useReducedMotion();
  const step = tour.activeStep;
  const wantsTarget = Boolean(step?.targetSelector) && step?.placement !== "center";

  const { element, rect, status } = useTourTarget(wantsTarget ? step!.targetSelector : undefined, {
    reducedMotion,
  });

  const missingTargetBehavior = step?.onMissingTarget ?? "skip";
  const isAutoAdvancing = wantsTarget && status === "not-found" && missingTargetBehavior === "skip";

  useEffect(() => {
    if (!tour.isActive || !step || !wantsTarget || status !== "not-found") return;
    if (missingTargetBehavior === "skip") {
      tour.next();
    }
  }, [tour, step, wantsTarget, status, missingTargetBehavior]);

  if (!tour.isActive || !step) return null;
  // Still resolving a targeted step — avoid flashing a centered tooltip
  // before the found/skip/center decision lands.
  if (wantsTarget && status === "pending") return null;
  if (isAutoAdvancing) return null;

  const hasFoundTarget = wantsTarget && status === "found";

  return createPortal(
    <>
      <Spotlight rect={hasFoundTarget ? rect : null} />
      <TourTooltip targetElement={hasFoundTarget ? element : null} />
    </>,
    getTourPortalRoot(),
  );
}
