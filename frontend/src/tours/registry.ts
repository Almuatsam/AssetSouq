import type { AuthRole } from "@/types/auth";

import { adminTour } from "./adminTour";
import { employeeTour } from "./employeeTour";
import { CURRENT_TOUR_VERSION } from "./tourVersion";
import type { TourDefinition, TourId, TourStepDefinition } from "./types";

export function getWhatsNewSteps(base: TourDefinition, version: number): TourStepDefinition[] {
  return base.steps.filter((step) => step.isNewInVersion === version);
}

// Adding a new step is "add one object to employeeTour.ts/adminTour.ts"
// — this is the one place that needs to know both tours exist at all,
// and even it never inspects step content.
export function resolveTour(tourId: TourId): TourDefinition {
  switch (tourId) {
    case "employee-onboarding":
      return employeeTour;
    case "admin-onboarding":
      return adminTour;
    case "employee-whats-new":
      return { id: tourId, steps: getWhatsNewSteps(employeeTour, CURRENT_TOUR_VERSION) };
    case "admin-whats-new":
      return { id: tourId, steps: getWhatsNewSteps(adminTour, CURRENT_TOUR_VERSION) };
  }
}

export function tourIdForRole(role: AuthRole): TourId {
  return role === "EMPLOYEE" ? "employee-onboarding" : "admin-onboarding";
}

export function whatsNewTourIdForRole(role: AuthRole): TourId {
  return role === "EMPLOYEE" ? "employee-whats-new" : "admin-whats-new";
}

export function hasUnseenWhatsNew(role: AuthRole, version: number): boolean {
  const base = role === "EMPLOYEE" ? employeeTour : adminTour;
  return getWhatsNewSteps(base, version).length > 0;
}
