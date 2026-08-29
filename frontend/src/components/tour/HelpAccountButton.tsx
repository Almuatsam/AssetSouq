import { CircleHelp } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { FloatingSurface } from "@/components/ui/FloatingSurface";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { usePopover } from "@/hooks/usePopover";
import { useAuth } from "@/store/AuthContext";
import { useTour } from "@/store/TourContext";
import { hasUnseenWhatsNew, tourIdForRole, whatsNewTourIdForRole } from "@/tours/registry";
import { CURRENT_TOUR_VERSION } from "@/tours/tourVersion";

// The one piece of persistent chrome this app gets for onboarding — no
// nav/sidebar/notification-bell exists to hang a "Help menu" off of (see
// docs/05-Design-Brief.md's redesign notes), so this floating button
// *is* that Help menu literally, mounted once from App.tsx for every
// authenticated page.
export function HelpAccountButton() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const tour = useTour();
  const { data: progress } = useOnboardingProgress(!!session);
  const popover = usePopover("top-end");

  // While a tour is actively driving the popover (the "help-menu" step's
  // sideEffect), keep it in sync in both directions. Once the tour ends,
  // this stops overriding so the user's own clicks control it freely.
  useEffect(() => {
    if (!tour.isActive) return;
    popover.setIsOpen(tour.isHelpPopoverOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- popover.setIsOpen is stable; including `popover` would re-run on every open/close it causes itself
  }, [tour.isActive, tour.isHelpPopoverOpen]);

  if (!session) return null;

  const role = session.user.role;
  const hasWhatsNewContent = hasUnseenWhatsNew(role, CURRENT_TOUR_VERSION);
  const hasUnseenDot = hasWhatsNewContent && progress?.whatsNewSeenVersion !== CURRENT_TOUR_VERSION;

  return (
    <>
      <button
        type="button"
        ref={popover.refs.setReference}
        data-tour="help-account-button"
        aria-label={t("onboarding.common.helpMenuLabel")}
        className="fixed bottom-4 end-4 z-[900] flex h-12 w-12 items-center justify-center rounded-full bg-accent-strong text-on-accent shadow-pop transition hover:opacity-90"
        {...popover.getReferenceProps()}
      >
        <CircleHelp className="h-5 w-5" aria-hidden="true" />
        {hasUnseenDot && (
          <span
            className="absolute end-0 top-0 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface"
            aria-hidden="true"
          />
        )}
      </button>

      {popover.isOpen && (
        <FloatingSurface
          ref={popover.refs.setFloating}
          style={popover.floatingStyles}
          {...popover.getFloatingProps()}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("onboarding.common.helpMenuLabel")}
          </p>
          <ul className="flex flex-col gap-1">
            <li>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-start text-sm text-ink hover:bg-bg"
                onClick={() => {
                  tour.start(tourIdForRole(role));
                  popover.setIsOpen(false);
                }}
              >
                {t("onboarding.common.restartTour")}
              </button>
            </li>
            {hasWhatsNewContent && (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-start text-sm text-ink hover:bg-bg"
                  onClick={() => {
                    tour.start(whatsNewTourIdForRole(role));
                    popover.setIsOpen(false);
                  }}
                >
                  {t("onboarding.common.whatsNew")}
                  {hasUnseenDot && <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />}
                </button>
              </li>
            )}
          </ul>
          <div className="mt-3 border-t border-border pt-3">
            <LanguageSwitcher />
          </div>
        </FloatingSurface>
      )}
    </>
  );
}
