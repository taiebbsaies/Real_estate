import Image from "next/image";
import Link from "next/link";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/property";
import { formatRelativeTime } from "@/lib/messages/format";
import type { ConversationSummary } from "@/lib/messages/types";

interface ConversationListProps {
  role: "TENANT" | "OWNER";
  conversations: ConversationSummary[];
}

export default function ConversationList({
  role,
  conversations,
}: ConversationListProps) {
  const isTenant = role === "TENANT";
  const roleLabel = isTenant ? "Locataire" : "Propriétaire";
  const dashboardHref = isTenant ? "/dashboard/tenant" : "/dashboard/owner";
  const listingsHref = isTenant
    ? "/dashboard/tenant/properties"
    : "/dashboard/owner/properties";
  const messageHref = isTenant
    ? "/dashboard/tenant/messages"
    : "/dashboard/owner/messages";

  return (
    <div className="relative min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="shrink-0 text-sm font-bold tracking-tight text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-zinc-50 dark:focus-visible:outline-emerald-300"
            >
              HomeCheck
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
              /
            </span>
            <Link
              href={dashboardHref}
              className="truncate text-xs font-medium text-zinc-500 transition hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:focus-visible:outline-emerald-300"
            >
              {roleLabel}
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
              /
            </span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Messages
            </span>
          </div>
          <Link
            href="/profile"
            className="shrink-0 text-xs font-medium text-zinc-600 transition hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-emerald-300"
          >
            Mon profil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7 sm:px-6 sm:py-8">
        <Link
          href={dashboardHref}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-xs font-semibold text-zinc-500 transition hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-emerald-300"
        >
          <span aria-hidden="true">←</span>
          Tableau de bord
        </Link>

        <div className="mb-7 mt-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Messages
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isTenant
              ? "Vos conversations avec les propriétaires de vos logements."
              : "Vos conversations avec les locataires."}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <svg
              className="h-10 w-10 text-emerald-700 dark:text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
            </svg>
            <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Aucune conversation pour le moment.
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              {isTenant
                ? "Lorsque vous contactez un propriétaire depuis une annonce, la conversation apparaîtra ici."
                : "Les échanges avec vos locataires apparaîtront ici."}
            </p>
            <Link
              href={listingsHref}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#166534] px-5 text-xs font-semibold text-white transition hover:bg-[#14532d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:focus-visible:outline-emerald-300"
            >
              {isTenant ? "Trouver un logement" : "Mes logements"}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((conversation) => (
              <li key={conversation._id}>
                <Link
                  href={`${messageHref}/${conversation._id}`}
                  aria-label={`Ouvrir la conversation avec ${conversation.counterpartName} au sujet de ${conversation.propertyTitle}`}
                  className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:gap-4 sm:p-4 dark:focus-visible:outline-emerald-300 ${
                    conversation.unread > 0
                      ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-700/70 dark:bg-emerald-950/25"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    {conversation.propertyCoverImage ? (
                      <Image
                        src={conversation.propertyCoverImage}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center text-emerald-700 dark:text-emerald-300"
                        aria-hidden="true"
                      >
                        <svg
                          className="h-6 w-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m3 10 9-7 9 7" />
                          <path d="M5 9v12h14V9M9 21v-6h6v6" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">
                        {conversation.propertyTitle || "Annonce indisponible"}
                      </p>
                      {conversation.propertyType && (
                        <span className="hidden shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 sm:inline-flex dark:bg-zinc-800 dark:text-zinc-300">
                          {PROPERTY_TYPE_LABELS[conversation.propertyType]}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {conversation.counterpartName}
                      {conversation.propertyCity
                        ? ` · ${conversation.propertyCity}`
                        : ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {conversation.lastMessagePreview || "Aucun message"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <time
                      dateTime={conversation.lastMessageAt}
                      className="text-[10px] text-zinc-400 dark:text-zinc-500 sm:text-[11px]"
                    >
                      {formatRelativeTime(conversation.lastMessageAt)}
                    </time>
                    {conversation.unread > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-[10px] font-bold text-white dark:bg-emerald-500 dark:text-zinc-950">
                        {conversation.unread}
                        <span className="sr-only">
                          {" "}
                          message{conversation.unread === 1 ? "" : "s"} non lu
                          {conversation.unread === 1 ? "" : "s"}
                        </span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
