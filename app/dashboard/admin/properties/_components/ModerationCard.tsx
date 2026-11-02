"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  approveProperty,
  rejectProperty,
  type ModerationActionResult,
} from "@/app/actions/moderation";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/property";
import type { ModerationProperty } from "@/lib/properties/admin-queries";

interface ModerationCardProps {
  property: ModerationProperty;
  status: "pending" | "approved" | "rejected";
}

const statusLabels = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
} as const;

const statusClasses = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
} as const;

export default function ModerationCard({
  property,
  status,
}: ModerationCardProps) {
  const [rejectFormOpen, setRejectFormOpen] = useState(false);
  const [result, setResult] = useState<ModerationActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const cover =
    property.coverImage && property.images.includes(property.coverImage)
      ? property.coverImage
      : property.images[0];
  const canModerate = status === "pending" && !result?.success;

  function handleApprove() {
    startTransition(async () => {
      try {
        setResult(await approveProperty(property._id));
      } catch (error: unknown) {
        console.error("[ModerationCard] approve action failed:", error);
        setResult({
          success: false,
          message: "Impossible de modérer ce logement. Veuillez réessayer.",
        });
      }
    });
  }

  function handleReject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reason = formData.get("reason");
    if (typeof reason !== "string") {
      setResult({
        success: false,
        message: "Veuillez saisir un motif de rejet.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const actionResult = await rejectProperty(property._id, reason);
        setResult(actionResult);
        if (actionResult.success) {
          setRejectFormOpen(false);
        }
      } catch (error: unknown) {
        console.error("[ModerationCard] reject action failed:", error);
        setResult({
          success: false,
          message: "Impossible de modérer ce logement. Veuillez réessayer.",
        });
      }
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 bg-zinc-100 dark:bg-zinc-800 sm:w-56">
          {cover ? (
            <Image
              src={cover}
              alt={`Photo du logement ${property.title}`}
              fill
              sizes="(max-width: 640px) 100vw, 14rem"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
              Aucune photo
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {PROPERTY_TYPE_LABELS[property.type]}
              </span>
              <h2 className="mt-2 text-lg font-bold text-zinc-950 dark:text-zinc-50">
                {property.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {property.city}{property.zone ? ` · ${property.zone}` : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}
            >
              {statusLabels[status]}
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-300">
              {property.reportCount} signalement
              {property.reportCount === 1 ? "" : "s"}
            </span>
          </div>

          <p className="mt-3 text-lg font-extrabold text-zinc-950 dark:text-zinc-50">
            {property.price.toLocaleString("fr-FR")} DT
            <span className="ml-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              / mois
            </span>
          </p>

          <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {property.owner.name}
            </p>
            {property.owner.email && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {property.owner.email}
              </p>
            )}
          </div>

          {property.moderationReason && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              Motif : {property.moderationReason}
            </p>
          )}

          {canModerate && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={pending}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {pending ? "Traitement…" : "Approuver"}
              </button>
              <button
                type="button"
                onClick={() => setRejectFormOpen((open) => !open)}
                disabled={pending}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Rejeter
              </button>
            </div>
          )}

          {canModerate && rejectFormOpen && (
            <form onSubmit={handleReject} className="mt-4 space-y-2">
              <label
                htmlFor={`reason-${property._id}`}
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Motif du rejet
              </label>
              <textarea
                id={`reason-${property._id}`}
                name="reason"
                required
                minLength={10}
                maxLength={500}
                rows={3}
                placeholder="Expliquez au propriétaire les modifications à apporter."
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-red-700 px-4 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
                >
                  {pending ? "Traitement…" : "Confirmer le rejet"}
                </button>
              </div>
            </form>
          )}

          {result && (
            <p
              role={result.success ? "status" : "alert"}
              className={`mt-4 rounded-xl px-3 py-2 text-xs font-medium ${
                result.success
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {result.message}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
