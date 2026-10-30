import type { ReactNode } from "react";

export type AlertKind = "info" | "success" | "warning" | "error";

const kindClasses: Record<AlertKind, string> = {
  info: "rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  success:
    "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300",
  warning:
    "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  error:
    "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
};

type AlertProps = {
  kind?: AlertKind;
  role?: string;
  className?: string;
  children: ReactNode;
};

export default function Alert({
  kind = "info",
  role = "status",
  className = "",
  children,
}: AlertProps) {
  return (
    <div role={role} className={`${kindClasses[kind]} ${className}`}>
      {children}
    </div>
  );
}
