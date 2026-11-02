import { z } from "zod";
import {
  PROPERTY_AVAILABILITIES,
  PROPERTY_CONDITIONS,
  PROPERTY_EQUIPMENTS,
  PROPERTY_MODERATION_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/constants/property";

// ─── Shared field definitions ─────────────────────────────────────────────────

const titleField = z
  .string()
  .trim()
  .min(3, "Le titre doit contenir au moins 3 caractères.")
  .max(120, "Le titre ne doit pas dépasser 120 caractères.");

const descriptionField = z
  .string()
  .trim()
  .min(10, "La description doit contenir au moins 10 caractères.")
  .max(2000, "La description ne doit pas dépasser 2000 caractères.");

const cityField = z
  .string()
  .trim()
  .min(2, "La ville est obligatoire.")
  .max(80, "La ville ne doit pas dépasser 80 caractères.");

const addressField = z
  .string()
  .trim()
  .min(3, "L'adresse est obligatoire.")
  .max(200, "L'adresse ne doit pas dépasser 200 caractères.");

const idField = z
  .string()
  .trim()
  .min(1, "Identifiant du bien manquant.")
  .regex(/^[a-f\d]{24}$/i, "Identifiant de bien invalide.");

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const toNumber = (value: string | number): number => {
  const cleaned =
    typeof value === "number"
      ? String(value)
      : String(value).trim().replace(/\s/g, "").replace(",", ".");
  return cleaned === "" ? Number.NaN : Number(cleaned);
};

const numberField = (
  min: number,
  max: number,
  message: string,
  options: { integer?: boolean } = {},
) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => toNumber(value))
    .refine(
      (value) =>
        Number.isFinite(value) &&
        value >= min &&
        value <= max &&
        (options.integer ? Number.isInteger(value) : true),
      { error: message },
    );

const latitudeField = numberField(
  30,
  38,
  "La latitude doit être comprise entre 30 et 38 (Tunisie).",
);

const longitudeField = numberField(
  7,
  12,
  "La longitude doit être comprise entre 7 et 12 (Tunisie).",
);

const surfaceField = numberField(
  1,
  20000,
  "La surface doit être comprise entre 1 et 20 000 m².",
);

const bedroomsField = numberField(
  0,
  8,
  "Le nombre de chambres doit être compris entre 0 et 8.",
  { integer: true },
);

const bathroomsField = numberField(
  0,
  8,
  "Le nombre de salles de bain doit être compris entre 0 et 8.",
  { integer: true },
);

const priceField = numberField(
  1,
  100000,
  "Le loyer doit être compris entre 1 et 100 000 DT.",
);

const optionalTextField = (max: number, message: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, message).optional(),
  );

const isoDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format attendu : YYYY-MM-DD).")
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()), {
    error: "Date invalide (format attendu : YYYY-MM-DD).",
  });

const availableFromField = z.preprocess(
  emptyToUndefined,
  isoDateField.optional(),
);

const propertyTypeField = z.enum(PROPERTY_TYPES, {
  error: "Type de bien invalide.",
});

const propertyConditionField = z.enum(PROPERTY_CONDITIONS, {
  error: "État du logement invalide.",
});

const propertyAvailabilityField = z.enum(PROPERTY_AVAILABILITIES, {
  error: "Disponibilité invalide.",
});

const propertyEquipmentField = z.enum(PROPERTY_EQUIPMENTS, {
  error: "Équipement invalide.",
});

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Used by owners when publishing a new listing. */
export const createPropertySchema = z.object({
  title: titleField,
  description: descriptionField,
  price: priceField,
  city: cityField,
  zone: optionalTextField(60, "La zone ne doit pas dépasser 60 caractères."),
  address: addressField,
  latitude: latitudeField,
  longitude: longitudeField,
  surface: surfaceField,
  bedrooms: z.preprocess(emptyToUndefined, bedroomsField.optional()),
  bathrooms: z.preprocess(emptyToUndefined, bathroomsField.optional()),
  type: propertyTypeField,
  condition: propertyConditionField,
  availability: propertyAvailabilityField,
  availableFrom: availableFromField,
  equipments: z
    .array(propertyEquipmentField)
    .max(11, "Le nombre maximal d'équipements est de 11.")
    .transform((values) => [...new Set(values)])
    .default([]),
  rules: optionalTextField(2000, "Les règles de location ne doivent pas dépasser 2000 caractères."),
});

/** Used by owners when editing their own listing (full form, not partial). */
export const updatePropertySchema = createPropertySchema.extend({
  id: idField,
});

/** Used by admins to moderate a listing. */
export const moderatePropertySchema = z
  .object({
    id: idField,
    status: z.enum(PROPERTY_MODERATION_STATUSES, {
      error: "Statut de modération invalide.",
    }),
    reason: optionalTextField(1000, "Le motif ne doit pas dépasser 1000 caractères."),
  })
  .refine(
    (data) => data.status !== "rejected" || (data.reason ?? "").trim().length > 0,
    {
      error: "Un motif est requis pour rejeter une annonce.",
      path: ["reason"],
    },
  );

/** Used by owners to delete their own listing. */
export const deletePropertySchema = z.object({
  id: idField,
});

/** Input for the owner property image upload action (propertyId is ObjectId-checked). */
export const propertyImageUploadSchema = z.object({
  propertyId: idField,
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type ModeratePropertyInput = z.infer<typeof moderatePropertySchema>;
export type DeletePropertyInput = z.infer<typeof deletePropertySchema>;
export type PropertyImageUploadInput = z.infer<typeof propertyImageUploadSchema>;
