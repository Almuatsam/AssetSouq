import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FloatingSurface } from "@/components/ui/FloatingSurface";
import { usePopover } from "@/hooks/usePopover";

interface InlineHelpProps {
  titleKey: string;
  bodyKey: string;
  className?: string;
}

// A small icon button + popover for explaining one specific field or
// feature on click — reuses the same FloatingSurface/usePopover
// primitives as the guided tour's tooltip and the Help/Account popover,
// but has zero dependency on TourContext, so it never starts the full
// tour (see the guided-tour steps for the always-offered version of
// "explain this thing"; this is the click-to-peek version).
export function InlineHelp({ titleKey, bodyKey, className }: InlineHelpProps) {
  const { t } = useTranslation();
  const popover = usePopover("top");

  return (
    <span className={className}>
      <button
        type="button"
        ref={popover.refs.setReference}
        aria-label={t(titleKey)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:text-ink"
        {...popover.getReferenceProps()}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>
      {popover.isOpen && (
        <FloatingSurface
          ref={popover.refs.setFloating}
          style={popover.floatingStyles}
          {...popover.getFloatingProps()}
        >
          <p className="mb-1 text-sm font-semibold text-ink">{t(titleKey)}</p>
          <p className="text-sm text-muted">{t(bodyKey)}</p>
        </FloatingSurface>
      )}
    </span>
  );
}
