import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";

import { Card } from "@/components/ui/Card";
import { useUpdateOnboardingProgress } from "@/hooks/useOnboardingProgress";
import type { OnboardingProgress } from "@/types/onboarding";

export interface OnboardingChecklistItem {
  id: string;
  labelKey: string;
  complete: boolean;
}

interface OnboardingChecklistProps {
  progress: OnboardingProgress | undefined;
  items: OnboardingChecklistItem[];
}

// Presentational — the caller (DevicesPage / AdminDashboardPage) computes
// each item's `complete` flag from data it already has in scope (its own
// useMyRegistration()/useDashboardStats() call plus the shared onboarding
// progress cache), rather than this component re-fetching role-specific
// data itself. Auto-hides once dismissed or every item is complete.
export function OnboardingChecklist({ progress, items }: OnboardingChecklistProps) {
  const { t } = useTranslation();
  const updateProgress = useUpdateOnboardingProgress();

  if (!progress || progress.checklist.dismissed) return null;
  if (items.every((item) => item.complete)) return null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{t("onboarding.common.checklistTitle")}</h2>
        <button
          type="button"
          onClick={() => updateProgress.mutate({ checklist: { dismissed: true } })}
          className="text-xs font-medium text-muted hover:underline"
        >
          {t("onboarding.common.checklistDismiss")}
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={twMerge(
                "flex h-4 w-4 flex-none items-center justify-center rounded-full border border-border",
                item.complete && "border-success bg-success text-on-accent",
              )}
            >
              {item.complete && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={item.complete ? "text-muted line-through" : "text-ink"}>
              {t(item.labelKey)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
