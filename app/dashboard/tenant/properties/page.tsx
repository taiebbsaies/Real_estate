import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  PROPERTY_EQUIPMENT_LABELS,
  PROPERTY_EQUIPMENTS,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
} from "@/lib/constants/property";
import { getMyFavoriteIds } from "@/lib/properties/favorite-queries";
import { searchProperties } from "@/lib/properties/public-queries";
import { getSession } from "@/lib/session";
import {
  parsePropertySearchParams,
  type PropertySearchFilters,
} from "@/lib/validations/property-search";
import FavoriteButton from "./_components/FavoriteButton";

export const metadata: Metadata = {
  title: "Trouver un logement — HomeCheck",
  description: "Recherchez des logements disponibles sur HomeCheck.",
};

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function buildPageHref(filters: PropertySearchFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.priceMin !== undefined) {
    params.set("priceMin", String(filters.priceMin));
  }
  if (filters.priceMax !== undefined) {
    params.set("priceMax", String(filters.priceMax));
  }
  if (filters.surfaceMin !== undefined) {
    params.set("surfaceMin", String(filters.surfaceMin));
  }
  if (filters.surfaceMax !== undefined) {
    params.set("surfaceMax", String(filters.surfaceMax));
  }
  if (filters.bedrooms !== undefined) {
    params.set("bedrooms", String(filters.bedrooms));
  }
  if (filters.bathrooms !== undefined) {
    params.set("bathrooms", String(filters.bathrooms));
  }
  if (filters.type) params.set("type", filters.type);
  for (const equipment of filters.equipments) {
    params.set(`equipment_${equipment}`, "1");
  }
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.pageSize !== 12) {
    params.set("pageSize", String(filters.pageSize));
  }
  params.set("page", String(page));
  return `/dashboard/tenant/properties?${params.toString()}`;
}

function buildTypeHref(filters: PropertySearchFilters, type?: string): string {
  const href = buildPageHref(filters, 1);
  const params = new URLSearchParams(href.split("?")[1]);
  if (type) {
    params.set("type", type);
  } else {
    params.delete("type");
  }
  return `/dashboard/tenant/properties?${params.toString()}`;
}

function getCoverImage(images: string[], coverImage?: string): string | undefined {
  return coverImage && images.includes(coverImage) ? coverImage : images[0];
}

interface TenantPropertiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TenantPropertiesPage({
  searchParams,
}: TenantPropertiesPageProps) {
  const session = await getSession();
  if (!session || (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  const rawSearchParams = await searchParams;
  const filters = parsePropertySearchParams(rawSearchParams);
  const [results, favoriteIds] = await Promise.all([
    searchProperties(rawSearchParams),
    session.activeRole === "TENANT" ? getMyFavoriteIds() : Promise.resolve([]),
  ]);
  const favoriteIdSet = new Set(favoriteIds);

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
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Logements
            </span>
          </div>
          <div className="flex items-center gap-4">
            {session.activeRole === "TENANT" && (
              <Link href="/dashboard/tenant/favorites" className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
                Mes favoris
              </Link>
            )}
            <Link href="/profile" className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
              Mon profil
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Trouver un logement
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Parcourez les annonces disponibles et trouvez votre prochain logement.
          </p>
        </div>

        <form
          method="get"
          className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
        >
          <aside className="lg:sticky lg:top-24">
            <details
              open
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
            >
              <summary className="cursor-pointer list-none text-base font-bold text-zinc-900 marker:hidden dark:text-zinc-100">
                <span className="flex items-center justify-between">
                  Filtres
                  <span aria-hidden="true" className="text-sm text-zinc-400">⌄</span>
                </span>
              </summary>
              <div className="mt-5 space-y-4">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Ville
                    <input name="city" maxLength={80} defaultValue={filters.city} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Zone
                    <input name="zone" maxLength={80} defaultValue={filters.zone} className={`${inputClass} mt-1`} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Loyer min. (DT)
                      <input name="priceMin" type="number" min="0" max="100000" defaultValue={filters.priceMin} className={`${inputClass} mt-1`} />
                    </label>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Loyer max. (DT)
                      <input name="priceMax" type="number" min="0" max="100000" defaultValue={filters.priceMax} className={`${inputClass} mt-1`} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Surface min. (m²)
                      <input name="surfaceMin" type="number" min="0" max="20000" defaultValue={filters.surfaceMin} className={`${inputClass} mt-1`} />
                    </label>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Surface max. (m²)
                      <input name="surfaceMax" type="number" min="0" max="20000" defaultValue={filters.surfaceMax} className={`${inputClass} mt-1`} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Chambres min.
                      <input name="bedrooms" type="number" min="0" max="8" defaultValue={filters.bedrooms} className={`${inputClass} mt-1`} />
                    </label>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Salles de bain min.
                      <input name="bathrooms" type="number" min="0" max="8" defaultValue={filters.bathrooms} className={`${inputClass} mt-1`} />
                    </label>
                  </div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Type de bien
                    <select name="type" defaultValue={filters.type ?? ""} className={`${inputClass} mt-1`}>
                      <option value="">Tous les types</option>
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type} value={type}>{PROPERTY_TYPE_LABELS[type]}</option>
                      ))}
                    </select>
                  </label>
                  <fieldset>
                    <legend className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Équipements souhaités
                    </legend>
                    <div className="mt-2 space-y-2">
                      {PROPERTY_EQUIPMENTS.map((equipment) => (
                        <label key={equipment} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            name={`equipment_${equipment}`}
                            value="1"
                            defaultChecked={filters.equipments.includes(equipment)}
                            className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
                          />
                          {PROPERTY_EQUIPMENT_LABELS[equipment]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="flex flex-col gap-2 pt-1">
                    <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
                      Rechercher
                    </button>
                    <Link href="/dashboard/tenant/properties" className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                      Effacer les filtres
                    </Link>
                  </div>
              </div>
            </details>
          </aside>

          <section className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-950 dark:text-zinc-100">{results.total}</span>
                  {" "}logement{results.total !== 1 ? "s" : ""} disponible{results.total !== 1 ? "s" : ""}
                </p>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Trier par
                  <select name="sort" defaultValue={filters.sort} className={`${inputClass} w-auto min-w-40`}>
                    <option value="newest">Plus récents</option>
                    <option value="price_asc">Loyer croissant</option>
                    <option value="price_desc">Loyer décroissant</option>
                  </select>
                </label>
              </div>

              <nav aria-label="Filtrer par type de logement" className="mb-6 flex gap-2 overflow-x-auto pb-1">
                <Link
                  href={buildTypeHref(filters)}
                  aria-current={!filters.type ? "page" : undefined}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${!filters.type ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"}`}
                >
                  Tous
                </Link>
                {PROPERTY_TYPES.map((type) => (
                  <Link
                    key={type}
                    href={buildTypeHref(filters, type)}
                    aria-current={filters.type === type ? "page" : undefined}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${filters.type === type ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"}`}
                  >
                    {PROPERTY_TYPE_LABELS[type]}
                  </Link>
                ))}
              </nav>

              {results.items.length === 0 ? (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="text-4xl" aria-hidden="true">🏘️</span>
                  <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Aucun logement trouvé
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                    Essayez d’élargir votre recherche ou d’effacer les filtres pour découvrir toutes les annonces disponibles.
                  </p>
                  <Link href="/dashboard/tenant/properties" className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
                    Effacer les filtres
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {results.items.map((property) => {
                      const cover = getCoverImage(property.images, property.coverImage);
                      return (
                        <li key={property._id} className="relative">
                          <Link href={`/dashboard/tenant/properties/${property._id}`} className="group block h-full">
                            <article className="h-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
                              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                {cover ? (
                                  <Image
                                    src={cover}
                                    alt={`Photo du logement ${property.title}`}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                    className="object-cover transition duration-300 group-hover:scale-105"
                                    loading={results.items[0]?._id === property._id ? "eager" : "lazy"}
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-sm font-medium text-zinc-400 dark:text-zinc-500">
                                    Aucune photo
                                  </div>
                                )}
                                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm dark:bg-zinc-950/90 dark:text-zinc-100">
                                  {PROPERTY_TYPE_LABELS[property.type]}
                                </span>
                              </div>
                              <div className="p-4">
                                <p className="text-lg font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                                  {property.price.toLocaleString("fr-FR")} DT
                                  <span className="ml-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">/ mois</span>
                                </p>
                                <h2 className="mt-1 line-clamp-2 text-sm font-bold text-zinc-900 transition-colors group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">
                                  {property.title}
                                </h2>
                                <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                  {property.city}{property.zone ? ` · ${property.zone}` : ""}
                                </p>
                                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                                  <span title="Surface">📐 {property.surface} m²</span>
                                  {property.bedrooms !== undefined && (
                                    <span title="Chambres">🛏️ {property.bedrooms}</span>
                                  )}
                                  {property.bathrooms !== undefined && (
                                    <span title="Salles de bain">🛁 {property.bathrooms}</span>
                                  )}
                                </div>
                              </div>
                            </article>
                          </Link>
                          {session.activeRole === "TENANT" && (
                            <FavoriteButton
                              propertyId={property._id}
                              initialIsFavorite={favoriteIdSet.has(property._id)}
                              className="absolute right-3 top-3 z-10"
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {results.totalPages > 1 && (
                    <nav aria-label="Pagination des logements" className="mt-8 flex items-center justify-center gap-3">
                      {results.page > 1 ? (
                        <Link href={buildPageHref(filters, results.page - 1)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                          ← Précédent
                        </Link>
                      ) : (
                        <span className="rounded-xl border border-zinc-200 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800">← Précédent</span>
                      )}
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        Page {results.page} sur {results.totalPages}
                      </span>
                      {results.page < results.totalPages ? (
                        <Link href={buildPageHref(filters, results.page + 1)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                          Suivant →
                        </Link>
                      ) : (
                        <span className="rounded-xl border border-zinc-200 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800">Suivant →</span>
                      )}
                    </nav>
                  )}
                </>
              )}
          </section>
        </form>
      </main>
    </div>
  );
}
