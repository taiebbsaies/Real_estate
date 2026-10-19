import Link from "next/link";
import { ArrowLeftIcon } from "./icons";

type ScreenHeaderProps = {
  title: string;
  backHref: string;
  backLabel: string;
};

export default function ScreenHeader({
  title,
  backHref,
  backLabel,
}: ScreenHeaderProps) {
  return (
    <header className="flex items-center gap-1 px-4 pt-6 md:pt-10">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="-ml-2 flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>
      <h1 className="budget-heading text-[24px] font-semibold tracking-tight text-[var(--budget-secondary)]">
        {title}
      </h1>
    </header>
  );
}
