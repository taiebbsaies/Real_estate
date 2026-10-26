import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

type MonthNavProps = {
  monthLabel: string;
  previousHref: string;
  nextHref: string;
};

const chevronClass =
  "flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

export default function MonthNav({
  monthLabel,
  previousHref,
  nextHref,
}: MonthNavProps) {
  return (
    <div className="-ml-2 flex items-center gap-1">
      <Link href={previousHref} aria-label="Mois précédent" className={chevronClass}>
        <ChevronLeftIcon className="h-5 w-5" />
      </Link>
      <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        {monthLabel}
      </span>
      <Link href={nextHref} aria-label="Mois suivant" className={chevronClass}>
        <ChevronRightIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}
