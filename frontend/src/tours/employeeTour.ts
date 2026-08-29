import type { Device } from "@/types/device";

import type { TourDefinition } from "./types";

// Resolves the registration-form steps to the first AVAILABLE device
// from the already-populated ["devices"] cache (see hooks/useDevices.ts)
// — by the time this runs, the devices-grid step has already navigated
// to /devices and mounted it, so the cache is warm. Returns null (a
// missing target, handled per-step via onMissingTarget) if the catalog
// is empty or the cache hasn't populated yet.
function firstAvailableDeviceRoute(queryClient: import("@tanstack/react-query").QueryClient): string | null {
  const devices = queryClient.getQueryData<Device[]>(["devices"]);
  const first = devices?.find((d) => d.status === "AVAILABLE");
  return first ? `/devices/${first.id}` : null;
}

export const employeeTour: TourDefinition = {
  id: "employee-onboarding",
  steps: [
    {
      id: "employee-welcome",
      titleKey: "onboarding.employeeTour.welcome.title",
      bodyKey: "onboarding.employeeTour.welcome.body",
      placement: "center",
    },
    {
      id: "employee-devices-header",
      titleKey: "onboarding.employeeTour.devicesHeader.title",
      bodyKey: "onboarding.employeeTour.devicesHeader.body",
      route: "/devices",
      targetSelector: "devices-header",
      placement: "bottom",
    },
    {
      id: "employee-devices-grid",
      titleKey: "onboarding.employeeTour.devicesGrid.title",
      bodyKey: "onboarding.employeeTour.devicesGrid.body",
      route: "/devices",
      targetSelector: "devices-grid",
      placement: "top",
      onMissingTarget: "skip",
      checklistItemId: "browseDevices",
    },
    {
      id: "employee-device-card",
      titleKey: "onboarding.employeeTour.deviceCard.title",
      bodyKey: "onboarding.employeeTour.deviceCard.body",
      route: "/devices",
      targetSelector: "device-card",
      placement: "inline-end",
      onMissingTarget: "skip",
    },
    {
      id: "employee-registration-form",
      titleKey: "onboarding.employeeTour.registrationForm.title",
      bodyKey: "onboarding.employeeTour.registrationForm.body",
      route: firstAvailableDeviceRoute,
      targetSelector: "registration-agree-checkbox",
      placement: "top",
      onMissingTarget: "skip",
      checklistItemId: "learnRegistration",
    },
    {
      id: "employee-registration-submit",
      titleKey: "onboarding.employeeTour.registrationSubmit.title",
      bodyKey: "onboarding.employeeTour.registrationSubmit.body",
      route: firstAvailableDeviceRoute,
      targetSelector: "registration-submit",
      placement: "top",
      onMissingTarget: "skip",
    },
    {
      id: "employee-registration-status",
      titleKey: "onboarding.employeeTour.registrationStatus.title",
      bodyKey: "onboarding.employeeTour.registrationStatus.body",
      route: "/devices",
      targetSelector: "registration-status-card",
      placement: "bottom",
      // A brand-new user won't have an active registration yet — this
      // deliberately renders centered/informational the first time
      // through rather than being skipped, since the content ("this is
      // where you'll see your registration") is still useful without a
      // live card to point at.
      onMissingTarget: "center",
    },
    {
      id: "employee-notifications",
      titleKey: "onboarding.employeeTour.notifications.title",
      bodyKey: "onboarding.employeeTour.notifications.body",
      route: "/devices",
      targetSelector: "registration-status-badge",
      placement: "inline-end",
      onMissingTarget: "center",
    },
    {
      id: "employee-account",
      titleKey: "onboarding.employeeTour.account.title",
      bodyKey: "onboarding.employeeTour.account.body",
      route: "/devices",
      targetSelector: "logout-button",
      placement: "bottom",
    },
    {
      id: "employee-help-menu",
      titleKey: "onboarding.employeeTour.helpMenu.title",
      bodyKey: "onboarding.employeeTour.helpMenu.body",
      route: "/devices",
      targetSelector: "help-account-button",
      placement: "inline-start",
      sideEffect: "open-help-popover",
      checklistItemId: "findHelp",
    },
    {
      id: "employee-complete",
      titleKey: "onboarding.employeeTour.complete.title",
      bodyKey: "onboarding.employeeTour.complete.body",
      placement: "center",
      sideEffect: "close-help-popover",
    },
  ],
};
