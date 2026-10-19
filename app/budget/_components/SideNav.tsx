"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./BottomNav";
import { PlusIcon } from "./icons";

function NavLinkList({ pathname }: { pathname: string | null }) {
  return (
    <>
      {TABS.map(({ href, label, Icon, isActive }) => {
        const active = pathname !== null && isActive(pathname);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors ${
              active
                ? "bg-[var(--budget-primary-soft)] text-[var(--budget-primary)]"
                : "text-[var(--budget-muted)] hover:bg-[var(--budget-bg)] hover:text-[var(--budget-text)]"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function ActiveNavLinks() {
  const pathname = usePathname();

  return <NavLinkList pathname={pathname} />;
}

export default function SideNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col gap-8 border-r border-[var(--budget-border)] bg-[var(--budget-surface)] px-5 py-6 md:flex">
      <p className="budget-heading px-3 text-[22px] font-semibold tracking-tight text-[var(--budget-secondary)]">
        Budget
      </p>
      <nav
        aria-label="Navigation principale du budget"
        className="flex flex-col gap-1"
      >
        <Suspense fallback={<NavLinkList pathname={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </nav>
      <Link
        href="/budget/depenses/nouvelle"
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--budget-primary)] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--budget-primary-dark)]"
      >
        <PlusIcon className="h-5 w-5" />
        Nouvelle dépense
      </Link>
    </aside>
  );
}
