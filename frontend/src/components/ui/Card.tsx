import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={twMerge("rounded-lg border border-gray/15 bg-white p-4 shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}
