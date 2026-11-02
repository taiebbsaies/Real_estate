"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createProperty, updateProperty } from "@/app/actions/properties";
import {
  generatePropertyDescription,
  type GeneratePropertyDescriptionResult,
} from "@/app/actions/property-description";
import { uploadPropertyImage } from "@/app/actions/property-images";
import type { SerializedProperty } from "@/lib/properties/types";
import {
  PROPERTY_AVAILABILITIES,
  PROPERTY_AVAILABILITY_LABELS,
  PROPERTY_CONDITIONS,
  PROPERTY_CONDITION_LABELS,
  PROPERTY_EQUIPMENTS,
  PROPERTY_EQUIPMENT_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants/property";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const MAX_IMAGES = 6;

interface UploadResult {
  file: File;
  ok: boolean;
  message?: string;
}

function SubmitButton({
  label,
  pendingLabel,
  disabled = false,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function FieldError({
  errors,
  field,
}: {
  errors?: Record<string, string[]>;
  field: string;
}) {
  const messages = errors?.[field];
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
      {messages[0]}
    </p>
  );
}

interface PropertyFormProps {
  mode: "create" | "edit";
  property?: SerializedProperty;
}

export default function PropertyForm({
  mode,
  property,
}: PropertyFormProps) {
  const router = useRouter();
  const isEditing = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedPropertyIdRef = useRef<string | null>(null);
  const [state, formAction] = useActionState(
    isEditing ? updateProperty : createProperty,
    null,
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [generationPending, startGenerationTransition] = useTransition();
  const [generatorFieldsReady, setGeneratorFieldsReady] = useState(
    Boolean(property?.type && property.city && property.surface),
  );
  const [generatedDraft, setGeneratedDraft] = useState<{
    source: "ai" | "template";
    message: string;
  } | null>(null);
  const [generationMessage, setGenerationMessage] = useState("");

  function handleFormChange(event: ChangeEvent<HTMLFormElement>) {
    setGeneratedDraft(null);
    setGenerationMessage("");
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement
    ) {
      if (["type", "city", "surface"].includes(target.name)) {
        const formData = new FormData(event.currentTarget);
        setGeneratorFieldsReady(
          Boolean(
            String(formData.get("type") ?? "").trim() &&
              String(formData.get("city") ?? "").trim() &&
              String(formData.get("surface") ?? "").trim(),
          ),
        );
      }
    }
  }

  function handleGenerateDescription() {
    const form = formRef.current;
    if (!form) {
      return;
    }

    if (
      descriptionRef.current?.value.trim() &&
      !window.confirm(
        "La description actuelle sera remplacée par le brouillon généré. Continuer ?",
      )
    ) {
      return;
    }

    const formData = new FormData(form);
    const input = {
      type: formData.get("type"),
      city: formData.get("city"),
      zone: formData.get("zone"),
      surface: formData.get("surface"),
      bedrooms: formData.get("bedrooms"),
      bathrooms: formData.get("bathrooms"),
      condition: formData.get("condition"),
      equipments: formData.getAll("equipments"),
      price: formData.get("price"),
      rules: formData.get("rules"),
    };

    setGenerationMessage("");
    startGenerationTransition(async () => {
      try {
        const result: GeneratePropertyDescriptionResult =
          await generatePropertyDescription(input);
        if (!result.success) {
          setGeneratedDraft(null);
          setGenerationMessage(result.message);
          return;
        }

        if (descriptionRef.current) {
          descriptionRef.current.value = result.description;
        }
        setGeneratedDraft({
          source: result.source,
          message: result.message,
        });
        setGenerationMessage("");
      } catch (error: unknown) {
        console.error("[PropertyForm] description generation failed:", error);
        setGeneratedDraft(null);
        setGenerationMessage(
          "Impossible de générer la description. Veuillez réessayer.",
        );
      }
    });
  }

  const sendFile = useCallback(
    async (file: File, propertyId: string): Promise<UploadResult> => {
      const formData = new FormData();
      formData.set("propertyId", propertyId);
      formData.set("file", file);
      try {
        const actionState = await uploadPropertyImage(null, formData);
        return { file, ok: actionState.success, message: actionState.message };
      } catch {
        return { file, ok: false, message: "Échec de l'envoi." };
      }
    },
    [],
  );

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (files.length === 0) return;

    const accepted: File[] = [];
    const invalid: File[] = [];
    for (const file of files) {
      const isAccepted =
        ACCEPTED_IMAGE_TYPES.includes(file.type) &&
        file.size <= MAX_FILE_SIZE_BYTES;
      if (isAccepted) {
        accepted.push(file);
      } else {
        invalid.push(file);
      }
    }

    const remainingSlots = Math.max(MAX_IMAGES - selectedFiles.length, 0);
    const withinLimit = accepted.slice(0, remainingSlots);
    const skipped = accepted.slice(remainingSlots);
    const errors: string[] = [];

    if (invalid.length > 0) {
      errors.push(
        `Format ou taille invalide pour : ${invalid.map((f) => f.name).join(", ")}. Formats acceptés : JPEG, PNG, WebP ; taille maximale : 5 Mo par photo.`,
      );
    }
    if (skipped.length > 0) {
      errors.push(`Vous pouvez sélectionner au maximum ${MAX_IMAGES} photos.`);
    }
    if (withinLimit.length > 0) {
      setSelectedFiles((prev) => [...prev, ...withinLimit]);
    }
    setFileError(errors.length > 0 ? errors.join(" ") : null);
  };

  const handleCreateSuccess = useCallback(
    async (propertyId: string) => {
      const files = selectedFiles;
      if (files.length === 0) {
        router.push("/dashboard/owner/properties");
        return;
      }

      const results: UploadResult[] = [];
      setIsUploading(true);
      try {
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          setUploadProgress(`Envoi de la photo ${i + 1}/${files.length}…`);
          const result = await sendFile(file, propertyId);
          results.push(result);
        }
      } finally {
        setUploadProgress(null);
        setIsUploading(false);
      }

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      const failedMessages = results
        .filter((r) => !r.ok)
        .map((r) => r.message || "Échec de l'envoi.");

      if (failCount === 0) {
        setUploadSummary(
          `${okCount} ${okCount > 1 ? "photos" : "photo"} ajoutée${okCount > 1 ? "s" : ""}`,
        );
      } else if (okCount > 0) {
        setUploadSummary(
          `${okCount} ajoutée${okCount > 1 ? "s" : ""}, ${failCount} refusée${failCount > 1 ? "s" : ""} : ${failedMessages.join(" ; ")}`,
        );
      } else {
        setUploadSummary(
          `Aucune photo n'a pu être ajoutée (${failCount} photo${failCount > 1 ? "s" : ""} refusée${failCount > 1 ? "s" : ""} : ${failedMessages.join(" ; ")}). Le logement a bien été créé.`,
        );
      }

      setIsNavigating(true);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 2500);
      });

      if (failCount > 0) {
        router.push(`/dashboard/owner/properties/${propertyId}/edit`);
      } else {
        router.push("/dashboard/owner/properties");
      }
    },
    [router, selectedFiles, sendFile],
  );

  useEffect(() => {
    if (!state?.success) {
      return;
    }
    if (isEditing) {
      router.push("/dashboard/owner/properties");
      return;
    }
    if (
      state.propertyId &&
      processedPropertyIdRef.current !== state.propertyId
    ) {
      processedPropertyIdRef.current = state.propertyId;
      void handleCreateSuccess(state.propertyId);
    }
  }, [state, router, isEditing, handleCreateSuccess]);

  const values = state?.values;

  const equipmentValues: string[] = Array.isArray(values?.equipments)
    ? values.equipments.filter((value): value is string => typeof value === "string")
    : property?.equipments ?? [];

  const titleValue =
    typeof values?.title === "string" ? values.title : property?.title ?? "";
  const descriptionValue =
    typeof values?.description === "string"
      ? values.description
      : property?.description ?? "";
  const priceValue =
    typeof values?.price === "string"
      ? values.price
      : property
        ? String(property.price)
        : "";
  const cityValue =
    typeof values?.city === "string" ? values.city : property?.city ?? "";
  const addressValue =
    typeof values?.address === "string"
      ? values.address
      : property?.address ?? "";
  const zoneValue =
    typeof values?.zone === "string" ? values.zone : property?.zone ?? "";
  const latitudeValue =
    typeof values?.latitude === "string"
      ? values.latitude
      : property
        ? String(property.latitude)
        : "";
  const longitudeValue =
    typeof values?.longitude === "string"
      ? values.longitude
      : property
        ? String(property.longitude)
        : "";
  const surfaceValue =
    typeof values?.surface === "string"
      ? values.surface
      : property
        ? String(property.surface)
        : "";
  const bedroomsValue =
    typeof values?.bedrooms === "string"
      ? values.bedrooms
      : property?.bedrooms !== undefined
        ? String(property.bedrooms)
        : "";
  const bathroomsValue =
    typeof values?.bathrooms === "string"
      ? values.bathrooms
      : property?.bathrooms !== undefined
        ? String(property.bathrooms)
        : "";
  const typeValue =
    typeof values?.type === "string" ? values.type : property?.type ?? "";
  const conditionValue =
    typeof values?.condition === "string"
      ? values.condition
      : property?.condition ?? "";
  const availabilityValue =
    typeof values?.availability === "string"
      ? values.availability
      : property?.availability ?? "available";
  const availableFromValue =
    typeof values?.availableFrom === "string"
      ? values.availableFrom
      : property?.availableFrom
        ? property.availableFrom.slice(0, 10)
        : "";
  const rulesValue =
    typeof values?.rules === "string" ? values.rules : property?.rules ?? "";

  const inputClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";

  const labelClass = "mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300";

  const errorAlert = state && !state.success ? (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
    >
      <span aria-hidden="true">❌</span>
      <span className="flex-1">
        <span className="mr-2 inline-flex rounded-full bg-red-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:bg-red-900/60 dark:text-red-200">
          Erreur
        </span>
        {state.message}
      </span>
    </div>
  ) : null;

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
      <h2 className="mb-5 text-base font-bold text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Modifier le logement" : "Nouvelle annonce"}
      </h2>

      {errorAlert}

      <form
        ref={formRef}
        action={formAction}
        onChange={handleFormChange}
        noValidate
        key={state?.message ?? "initial"}
        className="space-y-4"
      >
        {isEditing && property && (
          <input type="hidden" name="id" value={property._id} />
        )}

        {/* Title */}
        <div>
          <label htmlFor="property-title" className={labelClass}>
            Titre <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="property-title"
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={titleValue}
            placeholder="Ex. : Appartement S+2 près de la plage"
            className={inputClass}
            aria-invalid={!!state?.errors?.title}
          />
          <FieldError errors={state?.errors} field="title" />
        </div>

        {/* Description */}
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="property-description" className={labelClass}>
              Description{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={!generatorFieldsReady || generationPending}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {generationPending
                ? "Génération…"
                : "Générer une description"}
            </button>
          </div>
          <textarea
            ref={descriptionRef}
            id="property-description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            defaultValue={descriptionValue}
            placeholder="Décrivez le logement, ses atouts, le quartier…"
            className={`${inputClass} resize-y`}
          />
          <FieldError errors={state?.errors} field="description" />
          {generatedDraft && (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold">{generatedDraft.message}</span>{" "}
              Source :{" "}
              <span className="font-semibold">
                {generatedDraft.source === "ai" ? "IA" : "modèle"}
              </span>
              . Vérifiez et modifiez le texte avant d’enregistrer.
            </p>
          )}
          {generationMessage && (
            <p
              className="mt-2 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {generationMessage}
            </p>
          )}
        </div>

        {/* Price */}
        <div>
          <label htmlFor="property-price" className={labelClass}>
            Loyer mensuel (DT){" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="property-price"
            name="price"
            type="number"
            required
            min="1"
            step="0.01"
            defaultValue={priceValue}
            placeholder="Ex. : 1200"
            className={inputClass}
          />
          <FieldError errors={state?.errors} field="price" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* City / Address */}
          <div>
            <label htmlFor="property-city" className={labelClass}>
              Ville <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="property-city"
              name="city"
              type="text"
              required
              defaultValue={cityValue}
              className={inputClass}
            />
            <FieldError errors={state?.errors} field="city" />
          </div>
          <div>
            <label htmlFor="property-address" className={labelClass}>
              Adresse <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="property-address"
              name="address"
              type="text"
              required
              defaultValue={addressValue}
              className={inputClass}
            />
            <FieldError errors={state?.errors} field="address" />
          </div>
        </div>

        {/* Zone */}
        <div>
          <label htmlFor="property-zone" className={labelClass}>
            Zone
          </label>
          <input
            id="property-zone"
            name="zone"
            type="text"
            defaultValue={zoneValue}
            className={inputClass}
          />
          <FieldError errors={state?.errors} field="zone" />
        </div>

        {/* Location */}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="property-latitude" className={labelClass}>
              Latitude <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="property-latitude"
              name="latitude"
              type="number"
              required
              step="any"
              defaultValue={latitudeValue}
              className={inputClass}
            />
            <FieldError errors={state?.errors} field="latitude" />
          </div>
          <div>
            <label htmlFor="property-longitude" className={labelClass}>
              Longitude <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="property-longitude"
              name="longitude"
              type="number"
              required
              step="any"
              defaultValue={longitudeValue}
              className={inputClass}
            />
            <FieldError errors={state?.errors} field="longitude" />
          </div>
        </fieldset>

        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Sur Google Maps : clic droit sur l&apos;emplacement, puis copier les
          coordonnées (ex. 36.8065, 10.1815). La Tunisie : latitude 30 à 38, longitude 7 à
          12.
        </p>

        {/* Surface / bedrooms / bathrooms */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="property-surface" className={labelClass}>
              Surface (m²){" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="property-surface"
              name="surface"
              type="number"
              required
              min="1"
              step="any"
              defaultValue={surfaceValue}
              className={inputClass}
            />
            <FieldError errors={state?.errors} field="surface" />
          </div>
          <div>
            <label htmlFor="property-bedrooms" className={labelClass}>
              Chambres
            </label>
            <input
              id="property-bedrooms"
              name="bedrooms"
              type="number"
              min="0"
              step="1"
              defaultValue={bedroomsValue}
              className={inputClass}
            />
            <FieldError errors={state?.errors} field="bedrooms" />
          </div>
          <div>
            <label htmlFor="property-bathrooms" className={labelClass}>
              Salles de bain
            </label>
            <input
              id="property-bathrooms"
              name="bathrooms"
              type="number"
              min="0"
              step="1"
              defaultValue={bathroomsValue}
              className={inputClass}
            />
            <FieldError errors={state?.errors} field="bathrooms" />
          </div>
        </div>

        {/* Type / condition / availability */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="property-type" className={labelClass}>
              Type de bien <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="property-type"
              name="type"
              required
              defaultValue={typeValue}
              className={inputClass}
            >
              <option value="" disabled>
                Sélectionner…
              </option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <FieldError errors={state?.errors} field="type" />
          </div>
          <div>
            <label htmlFor="property-condition" className={labelClass}>
              État <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="property-condition"
              name="condition"
              required
              defaultValue={conditionValue}
              className={inputClass}
            >
              <option value="" disabled>
                Sélectionner…
              </option>
              {PROPERTY_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {PROPERTY_CONDITION_LABELS[condition]}
                </option>
              ))}
            </select>
            <FieldError errors={state?.errors} field="condition" />
          </div>
          <div>
            <label htmlFor="property-availability" className={labelClass}>
              Disponibilité <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="property-availability"
              name="availability"
              required
              defaultValue={availabilityValue}
              className={inputClass}
            >
              {PROPERTY_AVAILABILITIES.map((availability) => (
                <option key={availability} value={availability}>
                  {PROPERTY_AVAILABILITY_LABELS[availability]}
                </option>
              ))}
            </select>
            <FieldError errors={state?.errors} field="availability" />
          </div>
        </div>

        {/* Équipements */}
        <div>
          <span id="property-equipments-label" className={labelClass}>
            Équipements
          </span>
          <div
            className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="group"
            aria-labelledby="property-equipments-label"
          >
            {PROPERTY_EQUIPMENTS.map((equipment) => (
              <label
                key={equipment}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
              >
                <input
                  type="checkbox"
                  name="equipments"
                  value={equipment}
                  defaultChecked={equipmentValues.includes(equipment)}
                  className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
                />
                {PROPERTY_EQUIPMENT_LABELS[equipment]}
              </label>
            ))}
          </div>
          <FieldError errors={state?.errors} field="equipments" />
        </div>

        {/* Available from */}
        <div>
          <label htmlFor="property-available-from" className={labelClass}>
            Disponible à partir de
          </label>
          <input
            id="property-available-from"
            name="availableFrom"
            type="date"
            defaultValue={availableFromValue}
            className={inputClass}
          />
          <FieldError errors={state?.errors} field="availableFrom" />
        </div>

        {/* Rules */}
        <div>
          <label htmlFor="property-rules" className={labelClass}>
            Règles de location
          </label>
          <textarea
            id="property-rules"
            name="rules"
            rows={3}
            maxLength={2000}
            defaultValue={rulesValue}
            placeholder="Ex. : caution équivalente au 1er mois, clés remises en main propres…"
            className={`${inputClass} resize-y`}
          />
          <FieldError errors={state?.errors} field="rules" />
        </div>

        {!isEditing && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white/70 p-4 dark:border-zinc-800/90 dark:bg-zinc-900/70">
            <span id="property-photos-label" className={labelClass}>
              Photos du logement
            </span>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Formats acceptés : JPEG, PNG, WebP. Taille maximale : 5 Mo par photo.
            </p>
            <input
              ref={fileInputRef}
              id="property-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isUploading || isNavigating}
              className="hidden"
              aria-labelledby="property-photos-label"
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              onClick={() => {
                if (!isUploading && !isNavigating && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              disabled={isUploading || isNavigating}
              className="inline-flex h-10 w-fit items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isUploading
                ? "Envoi…"
                : isNavigating
                  ? "Redirection…"
                  : "Ajouter des photos"}
            </button>

            {fileError && (
              <p
                className="mt-2 text-xs text-red-600 dark:text-red-400"
                role="alert"
              >
                {fileError}
              </p>
            )}

            {selectedFiles.length > 0 && (
              <ul className="mt-3 space-y-1">
                {selectedFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} Mo
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {uploadProgress && (
              <p
                className="mt-3 text-sm text-zinc-700 dark:text-zinc-300"
                role="status"
              >
                {uploadProgress}
              </p>
            )}

            {uploadSummary && (
              <p
                className="mt-3 text-sm text-zinc-700 dark:text-zinc-300"
                role="status"
              >
                {uploadSummary}
              </p>
            )}
          </div>
        )}

        <SubmitButton
          label={isEditing ? "Enregistrer" : "Publier l'annonce"}
          pendingLabel={isEditing ? "Enregistrement…" : "Publication…"}
          disabled={!isEditing && (isUploading || isNavigating)}
        />
      </form>
    </div>
  );
}
