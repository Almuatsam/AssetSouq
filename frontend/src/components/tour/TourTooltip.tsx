import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { FloatingSurface } from "@/components/ui/FloatingSurface";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { useTour } from "@/store/TourContext";
import { getCurrentDirection, resolveLogicalPlacement } from "@/utils/logicalPlacement";

interface TourTooltipProps {
  targetElement: HTMLElement | null;
}

// Programmatically driven by TourContext (not click-triggered), so this
// only uses useFloating's positioning half — no useDismiss/useClick (see
// hooks/usePopover.ts for the click-triggered counterpart used by the
// Help/Account and InlineHelp popovers).
export function TourTooltip({ targetElement }: TourTooltipProps) {
  const { t } = useTranslation();
  const tour = useTour();
  const isMobile = useIsMobileViewport();
  const containerRef = useFocusTrap<HTMLDivElement>(tour.isActive);

  const step = tour.activeStep;
  const isCentered = !targetElement || step?.placement === "center";

  const dir = getCurrentDirection();
  const placement = step && !isCentered ? resolveLogicalPlacement(step.placement, dir) : "top";

  const { refs, floatingStyles } = useFloating({
    elements: { reference: isCentered ? undefined : (targetElement ?? undefined) },
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(12), flip(), shift({ padding: 8 })],
  });

  useEffect(() => {
    if (!tour.isActive) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Arrow keys stay physical even in RTL (matches native widgets like
      // sliders/scrollbars) — only the *visual* placement flips, not the
      // key mapping.
      if (event.key === "Escape") {
        event.preventDefault();
        tour.skip();
      } else if (event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        tour.next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        tour.previous();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tour]);

  if (!tour.isActive || !step) return null;

  const body = (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-body"
    >
      <p className="mb-1 text-xs font-medium text-muted">
        {t("onboarding.common.stepProgress", {
          current: tour.currentStepIndex + 1,
          total: tour.totalSteps,
        })}
      </p>
      <h2 id="tour-step-title" className="mb-1 text-base font-semibold text-ink">
        {t(step.titleKey)}
      </h2>
      <p id="tour-step-body" className="mb-4 text-sm text-muted">
        {t(step.bodyKey)}
      </p>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={tour.skip}
          className="text-xs font-medium text-muted underline-offset-2 hover:underline"
        >
          {t("onboarding.common.skip")}
        </button>
        <div className="flex gap-2">
          {!tour.isFirstStep && (
            <Button onClick={tour.previous} className="bg-transparent text-ink hover:bg-bg">
              {t("onboarding.common.previous")}
            </Button>
          )}
          <Button onClick={tour.isLastStep ? tour.finish : tour.next}>
            {t(tour.isLastStep ? "onboarding.common.finish" : "onboarding.common.next")}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          key={step.id}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "tween", duration: 0.25 }}
          className="fixed inset-x-0 bottom-0 z-[1001]"
        >
          <FloatingSurface className="w-full rounded-b-none rounded-t-lg">{body}</FloatingSurface>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (isCentered) {
    return (
      <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
        <FloatingSurface>{body}</FloatingSurface>
      </div>
    );
  }

  return (
    <FloatingSurface ref={refs.setFloating} style={floatingStyles}>
      {body}
    </FloatingSurface>
  );
}
