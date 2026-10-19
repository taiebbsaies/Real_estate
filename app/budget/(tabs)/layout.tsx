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
        className="fixed bottom-[88px] right-[max(1rem,calc(50vw-240px+1rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--budget-primary)] text-white shadow-[0_2px_8px_rgba(31,36,33,0.08)] transition-colors hover:bg-[var(--budget-primary-dark)] md:hidden"
      >
        <PlusIcon className="h-6 w-6" />
      </Link>

      <BottomNav />
    </>
  );
}
