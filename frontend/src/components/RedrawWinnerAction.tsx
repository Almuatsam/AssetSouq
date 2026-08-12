import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useRedrawWinner } from "@/hooks/useAdminWinners";
import type { RedrawReason } from "@/types/winner";

const REDRAW_REASONS: RedrawReason[] = ["DECLINED", "NON_PAYMENT", "NO_SHOW", "ADMIN_OVERRIDE"];

interface RedrawWinnerActionProps {
  winnerId: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

// A reason selector + action button, not a plain confirm — redrawReason is
// a real, meaningful audit field on the backend (see
// backend/src/services/drawService.ts's redrawWinner()), not a formality,
// so the admin picks the actual reason rather than everything defaulting
// to one value.
export function RedrawWinnerAction({ winnerId, onSuccess, onError }: RedrawWinnerActionProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<RedrawReason>("NON_PAYMENT");
  const redrawWinner = useRedrawWinner();

  const handleRedraw = async () => {
    if (!window.confirm(t("adminWinners.confirmRedraw"))) return;
    try {
      await redrawWinner.mutateAsync({ id: winnerId, reason });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("adminWinners.actionError"));
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <label className="sr-only" htmlFor={`redraw-reason-${winnerId}`}>
        {t("adminWinners.redrawReasonLabel")}
      </label>
      <select
        id={`redraw-reason-${winnerId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value as RedrawReason)}
        disabled={redrawWinner.isPending}
        className="rounded-md border border-gray/30 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {REDRAW_REASONS.map((redrawReason) => (
          <option key={redrawReason} value={redrawReason}>
            {t(`adminWinners.redrawReasonValues.${redrawReason}`)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        disabled={redrawWinner.isPending}
        onClick={handleRedraw}
      >
        {t("adminWinners.redraw")}
      </button>
    </span>
  );
}
