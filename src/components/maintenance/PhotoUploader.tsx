"use client";

import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface PhotoUploaderProps {
  uploadEndpoint: string;
  photoType?: "BEFORE" | "AFTER";
  maxPhotos?: number;
  existingPhotosCount?: number;
  onPhotoUploaded: (photo: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    photoType?: "BEFORE" | "AFTER";
  }) => void;
  className?: string;
  label?: string;
}

export function PhotoUploader({
  uploadEndpoint,
  photoType,
  maxPhotos = 10,
  existingPhotosCount = 0,
  onPhotoUploaded,
  className = "",
  label = "Ajouter une photo (Caméra ou Fichier)",
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (existingPhotosCount >= maxPhotos) {
      setError(`Limite maximale de ${maxPhotos} photos atteinte.`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier dépasse la taille maximale autorisée de 5 Mo.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (photoType) {
        formData.append("photoType", photoType);
      }

      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Échec de l'envoi de la photo.");
      }

      onPhotoUploaded(json.data);
    } catch (err: unknown) {
      setError((err as Error).message || "Erreur de téléversement");
    } finally {
      setUploading(false);
      // Reset input value to allow selecting same file again if desired
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Hidden standard file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Camera capture specific input for mobile PWAs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading || existingPhotosCount >= maxPhotos}
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          <span>Prendre photo (Caméra)</span>
        </button>

        <button
          type="button"
          disabled={uploading || existingPhotosCount >= maxPhotos}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          <span>Parcourir les fichiers</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Formats: JPG, PNG, WEBP (Max 5 Mo)</span>
        <span>
          {existingPhotosCount} / {maxPhotos} photo{maxPhotos > 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

export default PhotoUploader;
