import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, name, ...props },
  ref,
) {
  const inputId = id ?? name;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary ${
          error ? "border-danger" : "border-gray/30"
        }`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
