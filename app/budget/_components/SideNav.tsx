"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./BottomNav";
import { PlusIcon } from "./icons";
import { buttonClasses } from "./ui/Button";

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
            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
              active
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-zinc-200/80 bg-white/75 px-5 py-6 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/75 md:flex">
      <Link href="/" className="flex items-center gap-2 px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-xs font-bold text-white shadow-xs dark:bg-white dark:text-zinc-950">
          H
        </div>
        <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          HomeCheck
        </span>
      </Link>

      <nav
        aria-label="Navigation principale du budget"
        className="mt-8 flex flex-col gap-1"
      >
        <Suspense fallback={<NavLinkList pathname={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <Link
          href="/budget/depenses/nouvelle"
          className={buttonClasses("primary", "w-full")}
        >
          <PlusIcon className="h-5 w-5" />
          Nouvelle dépense
        </Link>
        <Link
          href="/profile"
          className="px-3 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
