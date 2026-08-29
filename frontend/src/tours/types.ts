import type { QueryClient } from "@tanstack/react-query";

import type { PlacementHint } from "@/utils/logicalPlacement";

export type TourId =
  | "employee-onboarding"
  | "admin-onboarding"
  | "employee-whats-new"
  | "admin-whats-new";

// "skip" (default) auto-advances past a step whose target doesn't exist
// right now (e.g. a brand-new user has no active registration yet).
// "center" renders the step as an untargeted, centered informational
// card instead — used when the content is still worth showing even
// without a live element to point at.
export type MissingTargetBehavior = "skip" | "center";

export interface TourStepDefinition {
  id: string;
  titleKey: string;
  bodyKey: string;
  /** Route this step lives on. A function can resolve a data-dependent
   * route (e.g. "the first available device") from the QueryClient's
   * cache — return null if no such route can be resolved right now,
   * which is treated as a missing target. */
  route?: string | ((queryClient: QueryClient) => string | null);
  /** Resolved via `[data-tour="<targetSelector>"]`. Omit for a
   * centered, untargeted step (e.g. welcome/completion). */
  targetSelector?: string;
  placement: PlacementHint;
  onMissingTarget?: MissingTargetBehavior;
  sideEffect?: "open-help-popover" | "close-help-popover";
  /** Fires a checklist.items[id]=true PATCH when this step is entered —
   * see components/tour/OnboardingChecklist.tsx. */
  checklistItemId?: string;
  /** Tags this step as part of the "What's New" subset for a given tour
   * content version — see tours/registry.ts's getWhatsNewSteps(). */
  isNewInVersion?: number;
}

export interface TourDefinition {
  id: TourId;
  steps: TourStepDefinition[];
}
