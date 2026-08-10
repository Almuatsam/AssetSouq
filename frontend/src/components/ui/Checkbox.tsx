import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, name, ...props },
  ref,
) {
  const inputId = id ?? name;

  return (
    <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-gray">
      <input
        type="checkbox"
        id={inputId}
        name={name}
        ref={ref}
        className="h-4 w-4 rounded border-gray/30 text-primary focus:ring-2 focus:ring-primary"
        {...props}
      />
      {label}
    </label>
  );
});
