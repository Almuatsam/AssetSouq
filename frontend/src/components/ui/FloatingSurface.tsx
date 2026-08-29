import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface FloatingSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  arrow?: ReactNode;
}

// The one shared portal/positioning surface in the app — used by
// TourTooltip, HelpAccountButton's popover, and InlineHelp's popover, so
// there's exactly one visual implementation of "a floating panel" rather
// than three. Uses the Contemporary Business tokens (see
// styles/tokens.css / docs/05-Design-Brief.md) — --shadow-pop was
// specifically provisioned "for modals/menus only."
export const FloatingSurface = forwardRef<HTMLDivElement, FloatingSurfaceProps>(
  ({ className, arrow, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(
        "z-[1001] w-[min(22rem,calc(100vw-2rem))] rounded border border-border bg-surface p-4 text-sm text-ink shadow-pop",
        className,
      )}
      {...props}
    >
      {children}
      {arrow}
    </div>
  ),
);
FloatingSurface.displayName = "FloatingSurface";
