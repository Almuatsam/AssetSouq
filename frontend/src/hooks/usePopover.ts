import {
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import type { Placement } from "@floating-ui/react";
import { useRef, useState } from "react";

// Shared interaction layer for the two click-triggered floating
// surfaces (HelpAccountButton, InlineHelp) — positioning via
// @floating-ui/react's collision/flip/shift middleware, dismiss on
// outside click or Escape. The tour tooltip does NOT use this: it's
// programmatically driven by TourContext, not click-triggered, so it
// only needs useFloating's positioning half (see TourTooltip.tsx).
export function usePopover(initialPlacement: Placement = "top") {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: initialPlacement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  return {
    isOpen,
    setIsOpen,
    refs,
    floatingStyles,
    arrowRef,
    getReferenceProps,
    getFloatingProps,
  };
}
