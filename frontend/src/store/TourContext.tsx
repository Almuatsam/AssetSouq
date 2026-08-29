import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useOnboardingProgress, useUpdateOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAuth } from "@/store/AuthContext";
import {
  hasUnseenWhatsNew,
  resolveTour,
  tourIdForRole,
  whatsNewTourIdForRole,
} from "@/tours/registry";
import { CURRENT_TOUR_VERSION } from "@/tours/tourVersion";
import type { TourDefinition, TourId, TourStepDefinition } from "@/tours/types";

interface TourContextValue {
  isActive: boolean;
  currentTourId: TourId | null;
  currentStepIndex: number;
  activeStep: TourStepDefinition | null;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isHelpPopoverOpen: boolean;
  start: (tourId: TourId) => void;
  next: () => void;
  previous: () => void;
  skip: () => void;
  finish: () => void;
  goToStep: (index: number) => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

// Router-agnostic on purpose — never imports react-router-dom, so it can
// sit in main.tsx between <AuthProvider> and <BrowserRouter> as planned.
// A step-driven tour still needs useNavigate(), which only works inside
// the router; see components/tour/TourRouteSync.tsx, the one place that
// reacts to activeStep changes by navigating.
export function TourProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { data: progress } = useOnboardingProgress(!!session);
  const updateProgress = useUpdateOnboardingProgress();

  const [currentTourId, setCurrentTourId] = useState<TourId | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isHelpPopoverOpen, setIsHelpPopoverOpen] = useState(false);
  const bootstrappedForRef = useRef<string | null>(null);

  const currentTour: TourDefinition | null = currentTourId ? resolveTour(currentTourId) : null;
  const activeStep = currentTour ? (currentTour.steps[currentStepIndex] ?? null) : null;
  const totalSteps = currentTour ? currentTour.steps.length : 0;
  const isActive = currentTourId !== null && activeStep !== null;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentTour ? currentStepIndex === currentTour.steps.length - 1 : false;

  const applySideEffect = useCallback((step: TourStepDefinition | null | undefined) => {
    if (step?.sideEffect === "open-help-popover") setIsHelpPopoverOpen(true);
    if (step?.sideEffect === "close-help-popover") setIsHelpPopoverOpen(false);
  }, []);

  const start = useCallback(
    (tourId: TourId) => {
      const tour = resolveTour(tourId);
      const firstStep = tour.steps[0] ?? null;
      setCurrentTourId(tourId);
      setCurrentStepIndex(0);
      applySideEffect(firstStep);

      const isWhatsNew = tourId === "employee-whats-new" || tourId === "admin-whats-new";
      updateProgress.mutate({
        ...(isWhatsNew ? {} : { action: "start" as const }),
        currentStepId: firstStep?.id ?? null,
      });
    },
    [updateProgress, applySideEffect],
  );

  const goToStep = useCallback(
    (index: number) => {
      if (!currentTour) return;
      const clamped = Math.max(0, Math.min(index, currentTour.steps.length - 1));
      const step = currentTour.steps[clamped];
      setCurrentStepIndex(clamped);
      applySideEffect(step);

      updateProgress.mutate({ currentStepId: step?.id ?? null });
      if (step?.checklistItemId) {
        updateProgress.mutate({ checklist: { items: { [step.checklistItemId]: true } } });
      }
    },
    [currentTour, updateProgress, applySideEffect],
  );

  const endTour = useCallback(
    (action: "complete" | "skip") => {
      const isWhatsNew = currentTourId === "employee-whats-new" || currentTourId === "admin-whats-new";
      updateProgress.mutate(
        isWhatsNew ? { whatsNewSeenVersion: CURRENT_TOUR_VERSION } : { action },
      );
      setCurrentTourId(null);
      setCurrentStepIndex(0);
      setIsHelpPopoverOpen(false);
    },
    [currentTourId, updateProgress],
  );

  const finish = useCallback(() => endTour("complete"), [endTour]);
  const skip = useCallback(() => endTour("skip"), [endTour]);

  const next = useCallback(() => {
    if (!currentTour) return;
    if (currentStepIndex >= currentTour.steps.length - 1) {
      finish();
      return;
    }
    goToStep(currentStepIndex + 1);
  }, [currentTour, currentStepIndex, goToStep, finish]);

  const previous = useCallback(() => {
    if (currentStepIndex <= 0) return;
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  // Bootstrap: auto-launch onboarding for a brand-new user, or the
  // What's New variant for an already-onboarded one with unseen tagged
  // content. Keyed per (role,id) via bootstrappedForRef so this only
  // ever fires once per signed-in account per app load, not on every
  // progress refetch.
  useEffect(() => {
    if (!session || !progress) return;
    const identityKey =
      session.user.role === "EMPLOYEE" ? `EMPLOYEE:${session.user.employee.id}` : `ADMIN:${session.user.admin.id}`;
    if (bootstrappedForRef.current === identityKey) return;
    bootstrappedForRef.current = identityKey;

    if (progress.status === "not_started") {
      start(tourIdForRole(session.user.role));
      return;
    }

    if (
      progress.status === "completed" &&
      progress.whatsNewSeenVersion !== CURRENT_TOUR_VERSION &&
      hasUnseenWhatsNew(session.user.role, CURRENT_TOUR_VERSION)
    ) {
      start(whatsNewTourIdForRole(session.user.role));
    }
  }, [session, progress, start]);

  const value = useMemo<TourContextValue>(
    () => ({
      isActive,
      currentTourId,
      currentStepIndex,
      activeStep,
      totalSteps,
      isFirstStep,
      isLastStep,
      isHelpPopoverOpen,
      start,
      next,
      previous,
      skip,
      finish,
      goToStep,
    }),
    [
      isActive,
      currentTourId,
      currentStepIndex,
      activeStep,
      totalSteps,
      isFirstStep,
      isLastStep,
      isHelpPopoverOpen,
      start,
      next,
      previous,
      skip,
      finish,
      goToStep,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
}
