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
        className="-ml-2 flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
    </header>
  );
}
