import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

import { useFocusTrap } from "@/hooks/useFocusTrap";

const PORTAL_ROOT_ID = "modal-portal-root";

// Lazily created, same pattern as components/tour/tourPortalRoot.ts (a
// separate root rather than reusing that one — the tour's portal is
// scoped to tour UI, this one to general-purpose dialogs).
function getModalPortalRoot(): HTMLElement {
  let root = document.getElementById(PORTAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PORTAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  className?: string;
  // Set false for a step the admin must consciously act on rather than
  // dismiss by accident (e.g. mid-confirmation) — disables both the
  // overlay click and the Escape key, leaving only an explicit in-content
  // control to close.
  dismissable?: boolean;
}

// The one Modal/Dialog implementation in the app (see
// components/ui/FloatingSurface.tsx's own comment: --shadow-pop was
// provisioned "for modals/menus only" well before anything used it).
// role="dialog" + aria-modal, a focus trap, Escape-to-close, and
// overlay-click-to-close — no library, matching useFocusTrap's own
// "total surface doesn't justify a dependency" reasoning.
export function Modal({ open, onClose, titleId, children, className, dismissable = true }: ModalProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open || !dismissable) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, dismissable, onClose]);

  useEffect(() => {
    if (!open) return;
    // Prevent the page behind the modal from scrolling while it's open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={dismissable ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Lets useFocusTrap's initial-focus fallback (when there's no
        // focusable child, or jsdom's offsetParent-based visibility check
        // can't tell) actually move focus here — same pattern
        // components/tour/TourTooltip.tsx already uses for the same hook.
        tabIndex={-1}
        className={twMerge(
          "relative w-full max-w-md rounded bg-surface p-6 text-ink shadow-pop",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    getModalPortalRoot(),
  );
}
