"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Camera,
  ArrowLeft,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Loader2,
  Building,
  Zap,
  Thermometer,
  Key,
  Refrigerator,
  Paintbrush,
  Sparkles,
} from "lucide-react";
import { PRIORITIES, type Priority } from "@/src/modules/maintenance/constants";

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query param pre-fills
  const initialPropertyId = searchParams.get("propertyId") || "";
  const initialEquipmentId = searchParams.get("equipmentId") || "";
  const initialTitle = searchParams.get("title") || "";
  const sourceInspectionItemId = searchParams.get("sourceInspectionItemId") || "";

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [equipmentId, setEquipmentId] = useState(initialEquipmentId);
  const [priority, setPriority] = useState<Priority>("MOYENNE");

  // Options
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [equipments, setEquipments] = useState<any[]>([]);

  // Photos to upload after request creation
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Fetch categories
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCategories(json.data);
          if (json.data.length > 0 && !categoryId) {
            setCategoryId(json.data[0]._id);
          }
        } else {
          setCategoriesError(true);
        }
      })
      .catch(() => setCategoriesError(true))
      .finally(() => setCategoriesLoading(false));

    // 2. Fetch properties
    fetch("/api/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setProperties(json.data);
          if (json.data.length > 0 && !propertyId) {
            setPropertyId(json.data[0]._id);
          }
        }
      })
      .finally(() => setPropertiesLoaded(true));
  }, []);

  const noProperty = propertiesLoaded && properties.length === 0;

  // Fetch equipments when propertyId changes
  useEffect(() => {
    if (propertyId) {
      fetch(`/api/equipments?propertyId=${propertyId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setEquipments(json.data);
          }
        });
    } else {
      setEquipments([]);
    }
  }, [propertyId]);

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      setError("Certains fichiers dépassent la taille maximale autorisée de 5 Mo.");
    }

    const updated = [...selectedPhotos, ...validFiles].slice(0, 10);
    setSelectedPhotos(updated);

    const newPreviews = updated.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const removePhoto = (index: number) => {
    const updated = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(updated);
    setPreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case "plomberie":
        return Wrench;
      case "electricite":
        return Zap;
      case "climatisation":
        return Thermometer;
      case "serrurerie":
        return Key;
      case "electromenager":
        return Refrigerator;
      default:
        return Paintbrush;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 5) {
      setError("Le titre doit contenir au moins 5 caractères.");
      return;
    }
    if (!description.trim() || description.length < 10) {
      setError("La description doit contenir au moins 10 caractères.");
      return;
    }
    if (!categoryId) {
      setError("Veuillez sélectionner une catégorie.");
      return;
    }
    if (!propertyId) {
      setError("Veuillez sélectionner votre logement.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create maintenance request (Auto-transitions CREEE -> EN_ATTENTE on backend)
      const res = await fetch("/api/maintenance-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId,
          propertyId,
          equipmentId: equipmentId || undefined,
          priority,
          sourceInspectionItemId: sourceInspectionItemId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Échec de l'enregistrement de la demande.");
      }

      const createdRequestId = json.data._id;

      // 2. Upload photos if any
      if (selectedPhotos.length > 0) {
        for (const file of selectedPhotos) {
          const formData = new FormData();
          formData.append("file", file);
          await fetch(`/api/maintenance-requests/${createdRequestId}/photos`, {
            method: "POST",
            body: formData,
          });
        }
      }

      router.push(`/maintenance/requests/${createdRequestId}`);
    } catch (err: unknown) {
      setError((err as Error).message || "Erreur de connexion.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* Return link */}
      <div>
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux interventions</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-2">
          Signaler un Incident ou Problème
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Votre signalement sera automatiquement transmis au propriétaire pour validation et assignation.
        </p>
      </div>

      {/* AI / Inspection source alert banner if pre-filled */}
      {sourceInspectionItemId && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Pré-rempli automatiquement depuis l'état des lieux / inspection (ID: {sourceInspectionItemId}).
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Selection Grid */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
          1. Catégorie de l'incident <span className="text-blue-400">*</span>
        </label>
        {categoriesLoading ? (
          <p className="text-xs text-slate-400">Chargement des catégories…</p>
        ) : categoriesError ? (
          <p role="alert" className="text-xs text-rose-400">
            Impossible de charger les catégories. Rechargez la page ou réessayez plus tard.
          </p>
        ) : categories.length === 0 ? (
          <p role="alert" className="text-xs text-amber-400">
            Aucune catégorie n&apos;est disponible pour le moment. Contactez l&apos;administrateur.
          </p>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.slug);
            const isSelected = categoryId === cat._id;
            return (
              <button
                key={cat._id}
                type="button"
                onClick={() => setCategoryId(cat._id)}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  isSelected
                    ? "bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/20 text-slate-100"
                    : "bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">{cat.name}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {cat.description || cat.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        )}
      </div>

      {noProperty && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200">Aucun logement associé à votre compte</p>
            <p className="text-xs text-amber-200/80 mt-1">
              Demandez à votre propriétaire de vous assigner à votre logement (avec votre adresse e-mail).
              Vous pourrez ensuite signaler un problème : il recevra la demande pour la valider.
            </p>
          </div>
        </div>
      )}

      {/* Property & Equipment Target */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
          2. Logement & Équipement concerné
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Propriété / Appartement <span className="text-blue-400">*</span>
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {properties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} — {p.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Équipement cible (optionnel)
            </label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Aucun équipement spécifique</option>
              {equipments.map((eq) => (
                <option key={eq._id} value={eq._id}>
                  {eq.name} {eq.brand ? `(${eq.brand})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Problem Details & Priority */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
          3. Description de l'anomalie
        </label>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Titre synthétique de la demande <span className="text-blue-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Fuite d'eau continue sous l'évier de cuisine"
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Description détaillée des faits constatés <span className="text-blue-400">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Précisez la date d'apparition, les bruits, odeurs, dégâts visibles sur les meubles ou le sol..."
            className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Priority Radio Buttons */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Niveau d'Urgence Estimé
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITIES.map((p) => {
              const isSelected = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? p === "URGENTE"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500 ring-2 ring-rose-500/20"
                        : "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-100"
                  }`}
                >
                  {p === "BASSE" && "Basse (Confort)"}
                  {p === "MOYENNE" && "Moyenne (Normal)"}
                  {p === "HAUTE" && "Haute (Important)"}
                  {p === "URGENTE" && "Urgente (Sinistre)"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Photo Capture & Uploads */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
          4. Photos du problème (Caméra & Fichiers)
        </label>
        <p className="text-xs text-slate-400">
          Les photos permettent au technicien de poser un pré-diagnostic fiable et d'apporter les pièces adaptées.
        </p>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleAddPhotos}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleAddPhotos}
          className="hidden"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Prendre une photo (Caméra)</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Importer des fichiers</span>
          </button>
        </div>

        {/* Previews Grid */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {previews.map((src, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border border-slate-700 group h-24">
                <img src={src} alt="Aperçu" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/maintenance"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={submitting || noProperty}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all hover:-translate-y-0.5"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <CheckCircle2 className="w-4 h-4" />
          <span>Envoyer la demande</span>
        </button>
      </div>
    </form>
  );
}

export default function NewMaintenanceRequestPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-500">Chargement...</div>}>
      <NewRequestForm />
    </Suspense>
  );
}
