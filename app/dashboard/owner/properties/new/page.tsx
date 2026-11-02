import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PropertyForm from "../_components/PropertyForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nouvelle annonce — Propriétaire | HomeCheck",
  description: "Publiez une nouvelle annonce de location.",
};

export default async function NewPropertyPage() {
  const session = await getSession();

  if (!session || session.activeRole !== "OWNER") {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/dashboard/owner/properties"
        className="mb-4 inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ← Mes logements
      </Link>
      <PropertyForm mode="create" />
    </main>
  );
}
