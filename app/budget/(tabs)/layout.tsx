import Link from "next/link";
import BottomNav from "../_components/BottomNav";
import { PlusIcon } from "../_components/icons";

export default function TabsLayout({ children }: LayoutProps<"/budget">) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-28 md:pb-12">{children}</div>

      <Link
        href="/budget/depenses/nouvelle"
        aria-label="Ajouter une dépense"
        className="fixed bottom-[88px] right-[max(1rem,calc(50vw-240px+1rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-lg transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 md:hidden"
      >
        <PlusIcon className="h-6 w-6" />
      </Link>

      <BottomNav />
    </>
  );
}
