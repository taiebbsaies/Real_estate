import type { ButtonHTMLAttributes, ComponentProps } from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "danger" | "destructive";

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold shadow-xs transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "h-11 bg-zinc-950 px-4 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
  secondary:
    "h-11 border border-zinc-200 bg-white/80 px-4 text-xs text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
  danger:
    "h-11 border border-red-500/50 px-4 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-950/40",
  destructive:
    "h-11 bg-red-600 px-4 text-sm text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  className = "",
) {
  return `${baseClasses} ${variantClasses[variant]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, className)} {...props}>
      {props.children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, className)} {...props}>
      {children}
    </Link>
  );
}
