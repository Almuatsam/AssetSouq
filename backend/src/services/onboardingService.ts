import type { OnboardingProgress } from "@prisma/client";

import type { AuthRole } from "../types/express";

import { onboardingRepository } from "../repositories/onboardingRepository";
import type { UpdateOnboardingInput } from "../validators/onboardingValidators";

export interface UserIdentity {
  role: AuthRole;
  id: number;
}

export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface OnboardingChecklistShape {
  dismissed: boolean;
  items: Record<string, boolean>;
}

export interface OnboardingProgressView {
  status: OnboardingStatus;
  currentStepId: string | null;
  tourVersion: number | null;
  whatsNewSeenVersion: number | null;
  checklist: OnboardingChecklistShape;
}

// Derived, not stored — tourStartedAt/tourCompletedAt/tourSkippedAt are
// the source of truth (see schema.prisma's OnboardingProgress comment);
// this keeps "what state is the user in" from ever drifting out of sync
// with the timestamps that actually recorded it.
function deriveStatus(row: OnboardingProgress): OnboardingStatus {
  if (row.tourCompletedAt) return "completed";
  if (row.tourSkippedAt) return "skipped";
  if (row.tourStartedAt) return "in_progress";
  return "not_started";
}

function normalizeChecklist(raw: unknown): OnboardingChecklistShape {
  const value = (raw ?? {}) as Partial<OnboardingChecklistShape>;
  return {
    dismissed: value.dismissed ?? false,
    items: value.items ?? {},
  };
}

function toView(row: OnboardingProgress): OnboardingProgressView {
  return {
    status: deriveStatus(row),
    currentStepId: row.currentStepId,
    tourVersion: row.tourVersion,
    whatsNewSeenVersion: row.whatsNewSeenVersion,
    checklist: normalizeChecklist(row.checklist),
  };
}

async function findRow(identity: UserIdentity): Promise<OnboardingProgress | null> {
  return identity.role === "EMPLOYEE"
    ? onboardingRepository.findByEmployeeId(identity.id)
    : onboardingRepository.findByAdminId(identity.id);
}

async function findOrCreateRow(identity: UserIdentity): Promise<OnboardingProgress> {
  const existing = await findRow(identity);
  if (existing) return existing;

  return identity.role === "EMPLOYEE"
    ? onboardingRepository.createForEmployee(identity.id)
    : onboardingRepository.createForAdmin(identity.id);
}

export const onboardingService = {
  async getOrCreateForUser(identity: UserIdentity): Promise<OnboardingProgressView> {
    const row = await findOrCreateRow(identity);
    return toView(row);
  },

  async updateForUser(
    identity: UserIdentity,
    patch: UpdateOnboardingInput,
  ): Promise<OnboardingProgressView> {
    const row = await findOrCreateRow(identity);
    const now = new Date();

    const actionData = (() => {
      switch (patch.action) {
        case "start":
          // Idempotent — a step-change PATCH mid-tour may also carry
          // action:"start" from the client's perspective; only the very
          // first one should actually stamp tourStartedAt.
          return row.tourStartedAt ? {} : { tourStartedAt: now };
        case "restart":
          return { tourStartedAt: now, tourCompletedAt: null, tourSkippedAt: null };
        case "complete":
          return { tourCompletedAt: now };
        case "skip":
          return { tourSkippedAt: now };
        default:
          return {};
      }
    })();

    const checklistData = patch.checklist
      ? {
          checklist: {
            ...normalizeChecklist(row.checklist),
            ...patch.checklist,
            items: {
              ...normalizeChecklist(row.checklist).items,
              ...patch.checklist.items,
            },
          },
        }
      : {};

    const updated = await onboardingRepository.update(row.id, {
      ...actionData,
      ...checklistData,
      ...(patch.currentStepId !== undefined ? { currentStepId: patch.currentStepId } : {}),
      ...(patch.tourVersion !== undefined ? { tourVersion: patch.tourVersion } : {}),
      ...(patch.whatsNewSeenVersion !== undefined
        ? { whatsNewSeenVersion: patch.whatsNewSeenVersion }
        : {}),
    });

    return toView(updated);
  },
};
