export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface OnboardingChecklist {
  dismissed: boolean;
  items: Record<string, boolean>;
}

export interface OnboardingProgress {
  status: OnboardingStatus;
  currentStepId: string | null;
  tourVersion: number | null;
  whatsNewSeenVersion: number | null;
  checklist: OnboardingChecklist;
}

export type OnboardingAction = "start" | "restart" | "complete" | "skip";

export interface UpdateOnboardingInput {
  action?: OnboardingAction;
  currentStepId?: string | null;
  tourVersion?: number;
  whatsNewSeenVersion?: number;
  checklist?: {
    dismissed?: boolean;
    items?: Record<string, boolean>;
  };
}
