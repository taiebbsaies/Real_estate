import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import Link from "next/link";
import BottomNav from "./_components/BottomNav";
import { PlusIcon } from "./_components/icons";
import "./budget.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Budget — HomeCheck",
};

export default function BudgetLayout({ children }: LayoutProps<"/budget">) {
  return (
    <div
      className={`${fraunces.variable} ${publicSans.variable} budget-module`}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
        <div className="flex-1 pb-28">{children}</div>
      </div>

      <Link
        href="/budget/depenses/nouvelle"
        aria-label="Ajouter une dépense"
        className="fixed bottom-[88px] right-[max(1rem,calc(50vw-240px+1rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--budget-primary)] text-white shadow-[0_2px_8px_rgba(31,36,33,0.08)] transition-colors hover:bg-[var(--budget-primary-dark)]"
      >
        <PlusIcon className="h-6 w-6" />
      </Link>

      <BottomNav />
    </div>
  );
}
