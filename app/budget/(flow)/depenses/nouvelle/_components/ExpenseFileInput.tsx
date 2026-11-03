"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { ExpenseFileActionState } from "@/app/actions/budget-ai-file";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { CameraIcon, ReceiptIcon } from "@/app/budget/_components/icons";
import Alert from "@/app/budget/_components/ui/Alert";
import { Button } from "@/app/budget/_components/ui/Button";
import Card from "@/app/budget/_components/ui/Card";
import { labelClass } from "@/app/budget/_components/ui/Field";

type ExpenseFileInputProps = {
  formAction: (formData: FormData) => void | Promise<void>;
  state: ExpenseFileActionState | null;
  pending: boolean;
};

const MAX_CLIENT_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2000;
const JPEG_QUALITY = 0.8;
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const GALLERY_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

type FilePreview = {
  url: string;
  name: string;
  isImage: boolean;
};

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("canvas indisponible");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });

  if (!blob) {
    throw new Error("encodage impossible");
  }

  return new File([blob], "recu.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default function ExpenseFileInput({
  formAction,
  state,
  pending,
}: ExpenseFileInputProps) {
  const isOnline = useOnlineStatus();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }

    setLocalError(null);

    try {
      let finalFile = file;

      if (COMPRESSIBLE_TYPES.includes(file.type)) {
        try {
          finalFile = await compressImage(file);
        } catch {
          finalFile = file;
        }
      }

      if (finalFile.size > MAX_CLIENT_BYTES) {
        setLocalError("Fichier trop volumineux : 5 Mo maximum.");
        return;
      }

      const formData = new FormData();
      formData.append("file", finalFile);

      const url = URL.createObjectURL(finalFile);

      setPreview({
        url,
        name: file.name,
        isImage: finalFile.type.startsWith("image/"),
      });

      await formAction(formData);
    } catch {
      setLocalError("Fichier trop volumineux ou envoi impossible.");
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    void handleFile(file);
  }

  return (
    <Card className="flex flex-col gap-4">
      <p id="expense-file-label" className={labelClass}>
        Ou scannez un justificatif
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-label="Prendre une photo du justificatif"
          className="sr-only"
          disabled={pending || !isOnline}
          onChange={onInputChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={GALLERY_ACCEPT}
          aria-label="Choisir un fichier justificatif"
          className="sr-only"
          disabled={pending || !isOnline}
          onChange={onInputChange}
        />

        <Button
          variant="secondary"
          className="flex-1"
          disabled={pending || !isOnline}
          onClick={() => cameraInputRef.current?.click()}
        >
          <CameraIcon className="h-4 w-4" />
          Prendre une photo
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={pending || !isOnline}
          onClick={() => fileInputRef.current?.click()}
        >
          <ReceiptIcon className="h-4 w-4" />
          Choisir un fichier
        </Button>
      </div>

      {pending && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-medium text-zinc-600 dark:text-zinc-300"
        >
          Analyse du justificatif…
        </p>
      )}

      {preview && (
        <div
          aria-busy={pending}
          className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/60 p-2 transition-opacity dark:border-zinc-800 dark:bg-[#151518]/60${
            pending ? " opacity-60" : ""
          }`}
        >
          {preview.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt="Aperçu du justificatif"
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <ReceiptIcon className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {preview.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Comparez le brouillon avec ce justificatif avant
              d&apos;enregistrer.
            </p>
          </div>
        </div>
      )}

      {localError && (
        <Alert kind="error" role="alert">
          <p className="font-medium">{localError}</p>
        </Alert>
      )}

      {state && !state.success && state.message && (
        <Alert kind="error" role="alert">
          <p className="font-medium">{state.message}</p>
        </Alert>
      )}

      {!isOnline && (
        <Alert kind="warning" role="status">
          <p className="font-medium leading-snug">
            Vous êtes hors ligne : le scan de justificatif est indisponible. Le
            formulaire ci-dessous reste utilisable.
          </p>
        </Alert>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Photo ou PDF de facture, 5 Mo maximum. Les photos sont compressées
        avant l&apos;analyse. Le fichier n&apos;est jamais conservé.
      </p>
    </Card>
  );
}
