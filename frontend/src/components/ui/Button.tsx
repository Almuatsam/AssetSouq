import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: ButtonVariant;
}

// "primary" keeps the exact classes every existing call site already
// relies on — "secondary" (outline style) is new, for lower-emphasis
// actions alongside a primary one (e.g. Cancel/Back next to a submit
// button), first used by components/AdminCredentialsSetupModal.tsx.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  secondary: "border border-border bg-surface text-ink hover:bg-surface-alt",
};

export function Button({
  isLoading,
  disabled,
  className,
  children,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={twMerge(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
