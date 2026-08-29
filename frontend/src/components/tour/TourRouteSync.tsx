import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useTour } from "@/store/TourContext";

// The only place that calls useNavigate() for the tour — TourContext
// itself is router-agnostic (see its top-of-file comment), so this
// separate, router-mounted component reacts to step changes and
// navigates. Renders nothing.
export function TourRouteSync() {
  const { isActive, activeStep } = useTour();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lastNavigatedStepIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive || !activeStep) return;
    if (lastNavigatedStepIdRef.current === activeStep.id) return;
    lastNavigatedStepIdRef.current = activeStep.id;

    const targetRoute =
      typeof activeStep.route === "function" ? activeStep.route(queryClient) : activeStep.route;

    // A null resolved route (e.g. no AVAILABLE device to link to) is
    // left alone — useTourTarget will then fail to find the selector on
    // whatever page is currently showing, which resolves via the step's
    // own onMissingTarget behavior (see TourOverlay.tsx).
    if (targetRoute && targetRoute !== window.location.pathname) {
      navigate(targetRoute);
    }
  }, [isActive, activeStep, navigate, queryClient]);

  return null;
}
