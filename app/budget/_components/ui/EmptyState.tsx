import type { ComponentType, SVGProps } from "react";
import { ButtonLink } from "./Button";

type EmptyStateProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Icon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {description && (
        <p className="max-w-[280px] text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
      )}
    </div>
  );
}
