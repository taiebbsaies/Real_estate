"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveProperty,
  getModerationPropertyDetail,
  rejectProperty,
  type ModerationActionResult,
} from "@/app/actions/moderation";
import {
  PROPERTY_EQUIPMENT_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants/property";
import { reportReasonLabels } from "@/lib/validations/report";
import type {
  ModerationProperty,
  ModerationPropertyDetail,
} from "@/lib/properties/admin-queries";
import type { OpenReportGroup } from "@/lib/properties/admin-queries";
import type { PriceInsight } from "@/lib/properties/price-insight";
import PriceInsightBadge from "@/app/dashboard/_components/PriceInsightBadge";
import QualityScoreBadge from "@/app/dashboard/_components/QualityScoreBadge";

interface ModerationCardProps {
  property: ModerationProperty;
  status: "pending" | "approved" | "rejected";
  reports?: OpenReportGroup["reports"];
  priceInsight?: PriceInsight | null;
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
  reports,
  priceInsight = null,
}: ModerationCardProps) {
  const router = useRouter();
  const [rejectFormOpen, setRejectFormOpen] = useState(false);
  const [result, setResult] = useState<ModerationActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ModerationPropertyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const cover =
    property.coverImage && property.images.includes(property.coverImage)
      ? property.coverImage
      : property.images[0];
  const canApprove = status === "pending";
  const canReject = status === "pending" || status === "approved";
  const canModerateActions = canApprove || canReject;
  const rejectLabel = status === "pending" ? "Rejeter" : "Retirer de la publication";

  function handleApprove() {
    startTransition(async () => {
      try {
        const actionResult = await approveProperty(property._id);
        setResult(actionResult);
        if (actionResult.success) {
          router.refresh();
        }
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
    const formValue = formData.get("reason");
    const reason = typeof formValue === "string" ? formValue : "";

    startTransition(async () => {
      try {
        const actionResult = await rejectProperty(property._id, reason);
        setResult(actionResult);
        if (actionResult.success) {
          setRejectFormOpen(false);
          setRejectReason("");
          router.refresh();
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

  async function handleToggleDetail() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (detail) {
      return;
    }
    setDetailLoading(true);
    setDetailError("");
    try {
      const detailResult = await getModerationPropertyDetail(property._id);
      setDetail(detailResult);
      if (!detailResult) {
        setDetailError("Détail indisponible pour ce logement.");
      }
    } catch (error: unknown) {
      console.error("[ModerationCard] detail query failed:", error);
      setDetailError("Impossible de charger le détail du logement.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {PROPERTY_TYPE_LABELS[property.type]}
              </span>
              <h2 className="mt-2 break-words text-lg font-bold text-zinc-950 dark:text-zinc-50">
                {property.title}
              </h2>
              <p className="mt-1 break-words text-sm text-zinc-500 dark:text-zinc-400">
                {property.city}
                {property.zone ? ` · ${property.zone}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}
            >
              {statusLabels[status]}
            </span>
            {property.reportCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-300">
                {property.reportCount} signalement
                {property.reportCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <p className="mt-3 text-lg font-extrabold text-zinc-950 dark:text-zinc-50">
            {property.price.toLocaleString("fr-FR")} DT
            <span className="ml-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              / mois
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Surface : {property.surface} m²
            {(property.bedrooms !== undefined ||
              property.bathrooms !== undefined) && (
              <>
                {" "}
                · {property.bedrooms ?? "—"} chambre
                {(property.bedrooms ?? 0) > 1 ? "s" : ""} ·{" "}
                {property.bathrooms ?? "—"} salle
                {(property.bathrooms ?? 0) > 1 ? "s" : ""} de bain
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PriceInsightBadge
              insight={priceInsight}
              city={property.city}
              suspect
            />
            <QualityScoreBadge
              score={property.quality.score}
              level={property.quality.level}
              tips={property.quality.tips}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Publié le{" "}
            {new Date(property.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          <div className="mt-4 min-w-0 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
            <p className="break-words text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {property.owner.name}
            </p>
            {property.owner.email && (
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {property.owner.email}
              </p>
            )}
          </div>

          {property.moderationReason && (
            <p className="mt-3 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              Motif : {property.moderationReason}
            </p>
          )}

          {reports && reports.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/30">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                {reports.length} signalement
                {reports.length > 1 ? "s" : ""} ouvert
                {reports.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-2 space-y-1">
                {reports.map((report) => (
                  <li
                    key={report._id}
                    className="break-words text-xs text-red-900 dark:text-red-200"
                  >
                    · {reportReasonLabels[report.reason]} —{" "}
                    {new Date(report.createdAt).toLocaleDateString("fr-FR")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canModerateActions && (
            <div className="mt-5 flex flex-wrap gap-2">
              {canApprove && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={pending}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {pending ? "Traitement…" : "Approuver"}
                </button>
              )}
              {canReject && (
                <button
                  type="button"
                  onClick={() => setRejectFormOpen((open) => !open)}
                  disabled={pending}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  {rejectLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleToggleDetail()}
                disabled={pending}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {expanded ? "Masquer le détail" : "Voir le détail"}
              </button>
            </div>
          )}

          {canModerateActions && rejectFormOpen && (
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
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                required
                minLength={10}
                maxLength={1000}
                rows={3}
                aria-describedby={`reason-count-${property._id}`}
                placeholder="Expliquez au propriétaire les modifications à apporter."
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="flex items-center justify-between gap-3">
                <p id={`reason-count-${property._id}`} className="text-[10px] text-zinc-400">
                  {rejectReason.trim().length}/1000 caractères (10 minimum)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectFormOpen(false)}
                    className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-red-700 px-4 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
                  >
                    {pending ? "Traitement…" : "Confirmer le rejet"}
                  </button>
                </div>
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

          {expanded && (
            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Détail du logement
              </h3>
              {detailLoading ? (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Chargement du détail…
                </p>
              ) : detailError ? (
                <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
                  {detailError}
                </p>
              ) : detail ? (
                <div className="mt-3 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Description
                    </h4>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-300">
                      {detail.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Photos
                    </h4>
                    {detail.images.length > 0 ? (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {detail.images.map((image) => (
                          <button
                            key={image}
                            type="button"
                            onClick={() => setSelectedImage(image)}
                            aria-label={`Agrandir la photo du logement ${property.title}`}
                            className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800"
                          >
                            <Image
                              src={image}
                              alt={`Photo du logement ${property.title}`}
                              fill
                              sizes="120px"
                              className="object-cover"
                              unoptimized
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Aucune photo n&apos;est associée à ce logement.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Adresse
                      </h4>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {detail.address}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Équipements
                      </h4>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {detail.equipments.length > 0
                          ? detail.equipments
                              .map((equipment) => PROPERTY_EQUIPMENT_LABELS[equipment])
                              .join(", ")
                          : "Aucun équipement déclaré."}
                      </p>
                    </div>
                  </div>

                  {detail.rules && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Règles
                      </h4>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {detail.rules}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {selectedImage && detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Agrandissement de la photo du logement ${property.title}`}
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Fermer l'agrandissement"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            ✕
          </button>
          <div className="relative h-[80vh] w-full max-w-3xl">
            <Image
              src={selectedImage}
              alt={`Photo agrandie du logement ${property.title}`}
              fill
              sizes="90vw"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </article>
  );
}
