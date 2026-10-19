import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
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
        {children}
      </div>
    </div>
  );
}
