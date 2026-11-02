"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  removePropertyImage,
  setCoverImage,
  uploadPropertyImage,
} from "@/app/actions/property-images";
import type { SerializedProperty } from "@/lib/properties/types";

interface PropertyImagesManagerProps {
  property: SerializedProperty;
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const MAX_IMAGES = 6;

interface UploadResult {
  file: File;
  ok: boolean;
  message?: string;
}

function UploadButton({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex h-10 w-fit items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? "Envoi…" : "Ajouter une photo"}
    </button>
  );
}

function RemoveButton({ pendingLabel }: { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
    >
      {pending ? pendingLabel : "Supprimer"}
    </button>
  );
}

function CoverButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300"
    >
      {pending ? "Définition…" : "Définir comme couverture"}
    </button>
  );
}

export default function PropertyImagesManager({
  property,
}: PropertyImagesManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removeState, removeAction] = useActionState(removePropertyImage, null);
  const [coverState, coverAction] = useActionState(setCoverImage, null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (removeState?.success) {
      router.refresh();
    }
  }, [removeState, router]);

  useEffect(() => {
    if (coverState?.success) {
      router.refresh();
    }
  }, [coverState, router]);

  const images = property.images ?? [];
  const coverImage = property.coverImage;
  const removeError = removeState && !removeState.success ? removeState : null;
  const coverError = coverState && !coverState.success ? coverState : null;

  const sendFile = async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.set("propertyId", property._id);
    formData.set("file", file);
    try {
      const state = await uploadPropertyImage(null, formData);
      return { file, ok: state.success, message: state.message };
    } catch {
      return { file, ok: false, message: "Échec de l'envoi." };
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files) return;

    const accepted: File[] = [];
    let invalidCount = 0;
    for (const f of Array.from(files)) {
      const isAccepted =
        ACCEPTED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE_BYTES;
      if (isAccepted) {
        accepted.push(f);
      } else {
        invalidCount += 1;
      }
    }

    const remainingSlots = Math.max(MAX_IMAGES - images.length, 0);
    const toSend = accepted.slice(0, remainingSlots);
    const skippedCount = Math.max(accepted.length - toSend.length, 0);
    const results: UploadResult[] = [];
    setUploadResults([]);
    setIsUploading(true);
    try {
      for (const file of toSend) {
        const result = await sendFile(file);
        results.push(result);
        setUploadResults([...results]);
        if (!result.ok && result.message?.includes("maximum")) {
          break;
        }
      }
    } finally {
      setIsUploading(false);
    }

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    const failedMessages = results
      .filter((r) => !r.ok)
      .map((r) => r.message)
      .filter((m): m is string => Boolean(m));

    const summaryParts: string[] = [];
    if (okCount > 0) summaryParts.push(`${okCount} ajoutée(s) avec succès.`);
    if (failCount > 0) {
      summaryParts.push(`${failCount} refusée(s) : ${failedMessages.join(" | ")}`);
    }
    if (invalidCount > 0) {
      summaryParts.push(`${invalidCount} ignorée(s) : format ou taille invalide.`);
    }
    if (skippedCount > 0) {
      summaryParts.push(
        `${skippedCount} non envoyée(s) : limite de ${MAX_IMAGES} images atteinte.`,
      );
    }
    setBatchSummary(
      summaryParts.length > 0
        ? summaryParts.join(" ")
        : `${okCount} ajoutée(s) avec succès.`,
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.refresh();
  };

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFilesSelected(event.target.files);
  };

  return (
    <section className="mt-6 rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
      <h3 className="mb-4 text-base font-bold text-zinc-950 dark:text-zinc-50">
        Photos du logement
      </h3>

      {(removeError || coverError) && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {removeError ? removeError.message : coverError?.message}
        </div>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Aucune photo pour le moment. Ajoutez la première image ci-dessous.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((url) => (
            <li
              key={url}
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Photo du logement"
                className="h-40 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-2">
                {url === coverImage ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    Couverture
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-3">
                  {url !== coverImage && (
                    <form action={coverAction}>
                      <input type="hidden" name="propertyId" value={property._id} />
                      <input type="hidden" name="image" value={url} />
                      <CoverButton />
                    </form>
                  )}
                  <form action={removeAction}>
                    <input type="hidden" name="propertyId" value={property._id} />
                    <input type="hidden" name="image" value={url} />
                    <RemoveButton pendingLabel="Suppression…" />
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={isUploading}
          className="hidden"
          onChange={onFileInputChange}
        />
        <UploadButton
          pending={isUploading}
          onClick={() => {
            if (!isUploading) {
              fileInputRef.current?.click();
            }
          }}
        />
      </div>

      {batchSummary && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{batchSummary}</p>
      )}

      {uploadResults.length > 0 && (
        <ul className="mt-3 space-y-1">
          {uploadResults.map((result, index) => (
            <li key={`${result.file.name}-${index}`} className="text-xs text-zinc-600 dark:text-zinc-400">
              {result.file.name} — {result.ok ? "ajoutée" : `refusée : ${result.message ?? ""}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
