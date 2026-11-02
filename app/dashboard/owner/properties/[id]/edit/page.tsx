import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMyPropertyById } from "@/lib/properties/queries";
import PropertyForm from "../../_components/PropertyForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier le logement — Propriétaire | HomeCheck",
  description: "Modifier une annonce de location.",
};

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({
  params,
}: EditPropertyPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session || session.activeRole !== "OWNER") {
    redirect("/login");
  }

  const property = await getMyPropertyById(id);

  if (!property) {
    return notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/dashboard/owner/properties"
        className="mb-4 inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ← Mes logements
      </Link>
      <PropertyForm mode="edit" property={property} />
    </main>
  );
}
