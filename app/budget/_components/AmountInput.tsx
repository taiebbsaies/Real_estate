import type { InputHTMLAttributes } from "react";
import Field, { fieldShellClass } from "./ui/Field";

type AmountInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className" | "size"
> & {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  size?: "lg" | "md";
};

const sizeClasses = {
  lg: "text-lg font-semibold",
  md: "text-base font-medium",
} as const;

export default function AmountInput({
  id,
  label,
  hint,
  errors,
  size = "lg",
  ...inputProps
}: AmountInputProps) {
  return (
    <Field id={id} label={label} hint={hint} errors={errors}>
      <div className={fieldShellClass(!!errors)}>
        <input
          id={id}
          name={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          required
          aria-invalid={!!errors}
          aria-describedby={errors ? `${id}-error` : undefined}
          className={`tabular-nums w-full bg-transparent text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600 ${sizeClasses[size]}`}
          {...inputProps}
        />
        <span className="ml-2 shrink-0 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
          TND
        </span>
      </div>
    </Field>
  );
}
