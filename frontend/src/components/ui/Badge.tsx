import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// Colors from docs/05-Design-Brief.md.
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-gray/10 text-gray",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
