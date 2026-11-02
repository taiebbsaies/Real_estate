import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getMyProperties } from "@/lib/properties/queries";
import {
  PROPERTY_AVAILABILITY_LABELS,
  PROPERTY_CONDITION_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants/property";
import DeletePropertyButton from "./_components/DeletePropertyButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes logements — Propriétaire | HomeCheck",
  description: "Gérez vos annonces de location.",
};

const MODERATION_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "En attente",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
  approved: {
    label: "Approuvée",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejetée",
    className:
      "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  },
};

const AVAILABILITY_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  available: {
    label: "Disponible",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  rented: {
    label: "Loué",
    className:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  },
  reserved: {
    label: "Réservé",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function OwnerPropertiesPage() {
  const session = await getSession();

  if (!session || session.activeRole !== "OWNER") {
    redirect("/login");
  }

  const properties = await getMyProperties();

  return (
    <div className="relative min-h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-[#166534] dark:text-emerald-400">
              HomeCheck
            </Link>
            <span className="text-zinc-400">/</span>
            <Link href="/dashboard/owner" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
              Propriétaire
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Logements
            </span>
          </div>
          <Link href="/profile" className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
            Mon Profil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Mes logements 🏠
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Gérez vos annonces, leur disponibilité et leur validation admin.
            </p>
          </div>
          <Link
            href="/dashboard/owner/properties/new"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            + Ajouter un logement
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-3xl" aria-hidden="true">🏘️</span>
            <p className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Aucun logement pour le moment.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Publiez votre première annonce pour attirer des locataires.
            </p>
            <Link
              href="/dashboard/owner/properties/new"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              + Ajouter un logement
            </Link>
          </div>
        ) : (
          <ul className="space-y-5">
            {properties.map((property) => {
              const moderation =
                MODERATION_CONFIG[property.moderationStatus] ??
                { label: property.moderationStatus, className: "" };
              const availability =
                AVAILABILITY_CONFIG[property.availability] ??
                { label: property.availability, className: "" };

              return (
                <li key={property._id}>
                  <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          {PROPERTY_TYPE_LABELS[property.type]}
                        </p>
                        <h2 className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {property.title}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {property.address}
                          {property.zone ? ` · ${property.zone}` : ""}{" "}
                          — {property.city}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Surface : {property.surface} m²
                          {property.bedrooms !== undefined
                            ? ` · ${property.bedrooms} ch.`
                            : ""}
                          {property.bathrooms !== undefined
                            ? ` · ${property.bathrooms} salle(s) de bain`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${moderation.className}`}
                        >
                          {moderation.label}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${availability.className}`}
                        >
                          {PROPERTY_AVAILABILITY_LABELS[property.availability]}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>
                        Loyer :{" "}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {property.price} DT / mois
                        </strong>
                      </span>
                      <span>
                        État : {PROPERTY_CONDITION_LABELS[property.condition]}
                      </span>
                      {property.availableFrom && (
                        <span>
                          Disponible à partir du {formatDate(property.availableFrom)}
                        </span>
                      )}
                    </div>

                    {property.moderationReason && (
                      <p className="mt-3 rounded-xl border border-red-100 bg-red-50/60 p-3 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
                        Motif de rejet : {property.moderationReason}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <Link
                        href={`/dashboard/owner/properties/${property._id}/edit`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white/80 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Modifier
                      </Link>
                      <DeletePropertyButton propertyId={property._id} />
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
