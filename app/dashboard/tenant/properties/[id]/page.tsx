import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  PROPERTY_AVAILABILITY_LABELS,
  PROPERTY_CONDITION_LABELS,
  PROPERTY_EQUIPMENT_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants/property";
import { getMyFavoriteIds } from "@/lib/properties/favorite-queries";
import { getPublicPropertyById } from "@/lib/properties/public-queries";
import { getSession } from "@/lib/session";
import FavoriteButton from "../_components/FavoriteButton";
import RecordPropertyView from "../_components/RecordPropertyView";
import ReportPropertyForm from "../_components/ReportPropertyForm";

export const metadata: Metadata = {
  title: "Détail du logement — HomeCheck",
  description: "Consultez les détails de cette annonce de location.",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface TenantPropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantPropertyDetailPage({
  params,
}: TenantPropertyDetailPageProps) {
  const session = await getSession();
  if (!session || (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  const { id } = await params;
  const [property, favoriteIds] = await Promise.all([
    getPublicPropertyById(id),
    session.activeRole === "TENANT" ? getMyFavoriteIds() : Promise.resolve([]),
  ]);
  if (!property) {
    notFound();
  }

  const coverImage =
    property.coverImage && property.images.includes(property.coverImage)
      ? property.coverImage
      : property.images[0];

  return (
    <div className="relative min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              HomeCheck
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <Link href="/dashboard/tenant" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
              Locataire
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <Link href="/dashboard/tenant/properties" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
              Logements
            </Link>
          </div>
          <Link href="/profile" className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
            Mon profil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {session.activeRole === "TENANT" && (
          <RecordPropertyView propertyId={property._id} />
        )}
        <Link
          href="/dashboard/tenant/properties"
          className="mb-5 inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← Retour aux logements
        </Link>

        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {property.images.length > 0 ? (
            <div className="grid gap-2 bg-zinc-100 p-2 dark:bg-zinc-950 sm:grid-cols-2">
              {property.images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className={`relative overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800 ${index === 0 ? "aspect-[16/9] sm:row-span-2 sm:aspect-auto sm:min-h-[25rem]" : "aspect-[16/9]"}`}
                >
                  <Image
                    src={image}
                    alt={`Photo ${index + 1} du logement ${property.title}`}
                    fill
                    sizes={index === 0 ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 100vw, 33vw"}
                    className="object-cover"
                    unoptimized
                  />
                  {image === coverImage && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-zinc-800 dark:bg-zinc-950/85 dark:text-zinc-100">
                      Photo principale
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[16/7] items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              Aucune photo disponible
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {PROPERTY_TYPE_LABELS[property.type]} · {property.city}
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {property.title}
                </h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {property.address}{property.zone ? ` · ${property.zone}` : ""} — {property.city}
                </p>
              </div>
              <p className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
                {property.price.toLocaleString("fr-FR")} DT
                <span className="ml-1 text-sm font-medium text-zinc-500">/ mois</span>
              </p>
            </div>
            {session.activeRole === "TENANT" && (
              <>
                <FavoriteButton
                  propertyId={property._id}
                  initialIsFavorite={favoriteIds.includes(property._id)}
                  className="mt-4"
                />
                <ReportPropertyForm propertyId={property._id} />
              </>
            )}

            <section className="mt-7">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {property.description}
              </p>
            </section>

            <section className="mt-7">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Caractéristiques</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Surface</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.surface} m²</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Chambres</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.bedrooms ?? "Non renseigné"}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Salles de bain</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.bathrooms ?? "Non renseigné"}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">État du logement</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{PROPERTY_CONDITION_LABELS[property.condition]}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Disponibilité</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{PROPERTY_AVAILABILITY_LABELS[property.availability]}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Disponible à partir du</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.availableFrom ? formatDate(property.availableFrom) : "Immédiatement"}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Latitude</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.latitude}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Longitude</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.longitude}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Stationnement</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.hasParking ? "Oui" : "Non"}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Ascenseur</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{property.hasElevator ? "Oui" : "Non"}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Annonce publiée le</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(property.createdAt)}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <dt className="text-[11px] text-zinc-500">Mise à jour le</dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(property.updatedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="mt-7">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Équipements</h2>
              {property.equipments.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {property.equipments.map((equipment) => (
                    <li key={equipment} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {PROPERTY_EQUIPMENT_LABELS[equipment]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Aucun équipement renseigné.</p>
              )}
            </section>

            {property.rules && (
              <section className="mt-7">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Règles de location</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {property.rules}
                </p>
              </section>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
