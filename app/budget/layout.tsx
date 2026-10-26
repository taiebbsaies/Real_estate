import type { Metadata } from "next";
import SideNav from "./_components/SideNav";
import OfflineIndicator from "./_components/OfflineIndicator";

export const metadata: Metadata = {
  title: "Budget",
};

export default function BudgetLayout({ children }: LayoutProps<"/budget">) {
  return (
    <div>
      <SideNav />
      <OfflineIndicator />
      <div className="md:pl-[260px]">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col md:max-w-[1100px] md:px-6 lg:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
