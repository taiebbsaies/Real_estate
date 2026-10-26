import type { ReactNode } from "react";

export function fieldClass(hasError = false) {
  const base =
    "block w-full rounded-xl border bg-white/70 px-3.5 py-2.5 text-base text-zinc-900 shadow-xs backdrop-blur-xs transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 md:text-sm dark:bg-[#151518]/80 dark:text-zinc-100 dark:placeholder:text-zinc-600";
  if (hasError) {
    return `${base} border-red-500/80 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/70`;
  }
  return `${base} border-zinc-200 focus:border-zinc-950 focus:ring-zinc-950/10 dark:border-zinc-800 dark:focus:border-zinc-200 dark:focus:ring-white/10`;
}

export function fieldShellClass(hasError = false) {
  const base =
    "flex h-12 items-center rounded-xl border bg-white/70 px-4 shadow-xs backdrop-blur-xs transition-all focus-within:ring-2 dark:bg-[#151518]/80";
  if (hasError) {
    return `${base} border-red-500/80 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-500/70`;
  }
  return `${base} border-zinc-200 focus-within:border-zinc-950 focus-within:ring-zinc-950/10 dark:border-zinc-800 dark:focus-within:border-zinc-200 dark:focus-within:ring-white/10`;
}

export const labelClass =
  "mb-1.5 block text-xs font-semibold tracking-wide uppercase text-zinc-600 dark:text-zinc-400";

export const fieldErrorClass = "mt-1.5 text-sm text-red-600 dark:text-red-400";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: ReactNode;
};

export default function Field({
  id,
  label,
  hint,
  errors,
  children,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
      {errors?.map((error) => (
        <p key={error} id={`${id}-error`} className={fieldErrorClass}>
          {error}
        </p>
      ))}
    </div>
  );
}
