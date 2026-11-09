import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/property";
import { getMyFavorites } from "@/lib/properties/favorite-queries";
import { getSession } from "@/lib/session";
import { getUnreadTotal } from "@/lib/messages/queries";
import UnreadMessagesBadge from "@/app/dashboard/_components/UnreadMessagesBadge";
import FavoriteButton from "../properties/_components/FavoriteButton";

export const metadata: Metadata = {
  title: "Mes favoris — HomeCheck",
  description: "Retrouvez les logements que vous avez ajoutés à vos favoris.",
};

function getCoverImage(images: string[], coverImage?: string): string | undefined {
  return coverImage && images.includes(coverImage) ? coverImage : images[0];
}

export default async function TenantFavoritesPage() {
  const session = await getSession();
  if (!session || session.activeRole !== "TENANT") {
    redirect("/login");
  }

  const favorites = await getMyFavorites();
  const unreadTotal = await getUnreadTotal();

  return (
    <div className="relative min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              HomeCheck
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <Link href="/dashboard/tenant" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
              Locataire
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Mes favoris
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href="/dashboard/tenant/messages"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Messages
              <UnreadMessagesBadge initialUnread={unreadTotal} />
            </Link>
            <Link href="/dashboard/tenant/properties" className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
              Logements
            </Link>
            <Link href="/profile" className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
              Mon profil
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Mes favoris
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Retrouvez les logements que vous avez enregistrés.
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <svg
              aria-hidden="true"
              className="h-9 w-9 text-zinc-400 dark:text-zinc-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
            </svg>
            <p className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Vous n’avez pas encore de favoris.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Enregistrez les annonces qui vous intéressent pour les retrouver ici.
            </p>
            <Link
              href="/dashboard/tenant/properties"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Parcourir les logements
            </Link>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((property) => {
              const cover = getCoverImage(property.images, property.coverImage);
              return (
                <li key={property._id} className="relative">
                  <Link href={`/dashboard/tenant/properties/${property._id}`} className="group block h-full">
                    <article className="h-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
                        {cover ? (
                          <Image
                            src={cover}
                            alt={`Photo du logement ${property.title}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
                            Aucune photo
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          {PROPERTY_TYPE_LABELS[property.type]} · {property.city}
                        </p>
                        <h2 className="mt-1 line-clamp-2 text-base font-bold text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">
                          {property.title}
                        </h2>
                        {property.zone && (
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {property.zone}
                          </p>
                        )}
                        <p className="mt-3 text-lg font-extrabold text-zinc-950 dark:text-zinc-50">
                          {property.price.toLocaleString("fr-FR")} DT
                          <span className="ml-1 text-xs font-medium text-zinc-500">
                            / mois
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                          {property.surface} m²
                          {property.bedrooms !== undefined
                            ? ` · ${property.bedrooms} chambre${property.bedrooms !== 1 ? "s" : ""}`
                            : ""}
                          {property.bathrooms !== undefined
                            ? ` · ${property.bathrooms} salle(s) de bain`
                            : ""}
                        </p>
                      </div>
                    </article>
                  </Link>
                  <FavoriteButton
                    propertyId={property._id}
                    initialIsFavorite
                    className="absolute right-3 top-3 z-10"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
