"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Property, { type IProperty } from "@/models/property";
import {
  createPropertySchema,
  deletePropertySchema,
  updatePropertySchema,
} from "@/lib/validations/property";
import type { PropertyActionState } from "@/lib/properties/types";

export type { PropertyActionState } from "@/lib/properties/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

function unauthorized(): PropertyActionState {
  return { success: false, message: "Non autorisé. Veuillez vous connecter." };
}

function forbidden(): PropertyActionState {
  return { success: false, message: "Accès refusé." };
}

function notFound(): PropertyActionState {
  return { success: false, message: "Logement introuvable." };
}

function optionalFormValue(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Collect all string form values (except the equipments array) so a failed
 * validation can restore the user's input in the UI.
 */
function buildFormValues(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};

  const stringKeys: readonly string[] = [
    "title",
    "description",
    "price",
    "city",
    "zone",
    "address",
    "latitude",
    "longitude",
    "surface",
    "bedrooms",
    "bathrooms",
    "type",
    "condition",
    "availability",
    "availableFrom",
    "rules",
  ];

  for (const key of stringKeys) {
    const value = formData.get(key);
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  values.equipments = formData
    .getAll("equipments")
    .filter((value): value is string => typeof value === "string");

  return values;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Create a new property listing — OWNER only.
 *
 * The owner is forced server-side (never read from the form), and every new
 * listing starts in the moderation queue with status "pending".
 */
export async function createProperty(
  _prevState: PropertyActionState | null,
  formData: FormData,
): Promise<PropertyActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "OWNER") return forbidden();

  const parsed = createPropertySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    city: formData.get("city"),
    zone: optionalFormValue(formData.get("zone")),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    surface: formData.get("surface"),
    bedrooms: optionalFormValue(formData.get("bedrooms")),
    bathrooms: optionalFormValue(formData.get("bathrooms")),
    type: formData.get("type"),
    condition: formData.get("condition"),
    availability: formData.get("availability"),
    availableFrom: optionalFormValue(formData.get("availableFrom")),
    equipments: formData.getAll("equipments"),
    rules: optionalFormValue(formData.get("rules")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
      values: buildFormValues(formData),
    };
  }

  const {
    title,
    description,
    price,
    city,
    zone,
    address,
    latitude,
    longitude,
    surface,
    bedrooms,
    bathrooms,
    type,
    condition,
    availability,
    availableFrom,
    equipments,
    rules,
  } = parsed.data;

  try {
    await connectDB();

    const created = await Property.create({
      ownerId: session.userId,
      title,
      description,
      price,
      city,
      zone,
      address,
      latitude,
      longitude,
      surface,
      bedrooms,
      bathrooms,
      type,
      condition,
      availability,
      availableFrom,
      equipments,
      rules,
      hasParking: equipments.includes("parking"),
      hasElevator: equipments.includes("elevator"),
      moderationStatus: "pending",
    });

    revalidatePath("/dashboard/owner/properties");

    return {
      success: true,
      message: "Logement publié avec succès. Il est soumis à validation.",
      propertyId: String(created._id),
    };
  } catch (error: unknown) {
    console.error("[createProperty] error:", error);
    return {
      success: false,
      message: "Impossible de créer le logement. Veuillez réessayer.",
    };
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update a property listing — OWNER only, and only for their own listings.
 *
 * Editing resets the moderation status back to "pending" and clears the
 * moderation reason only when a public field changed: any meaningful change has
 * to be re-reviewed by an admin. Optional fields that are absent (undefined)
 * are explicitly $unset so stale values from the previous version do not
 * survive the update.
 */
export async function updateProperty(
  _prevState: PropertyActionState | null,
  formData: FormData,
): Promise<PropertyActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "OWNER") return forbidden();

  const parsed = updatePropertySchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    city: formData.get("city"),
    zone: optionalFormValue(formData.get("zone")),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    surface: formData.get("surface"),
    bedrooms: optionalFormValue(formData.get("bedrooms")),
    bathrooms: optionalFormValue(formData.get("bathrooms")),
    type: formData.get("type"),
    condition: formData.get("condition"),
    availability: formData.get("availability"),
    availableFrom: optionalFormValue(formData.get("availableFrom")),
    equipments: formData.getAll("equipments"),
    rules: optionalFormValue(formData.get("rules")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
      values: buildFormValues(formData),
    };
  }

  const {
    id,
    title,
    description,
    price,
    city,
    zone,
    address,
    latitude,
    longitude,
    surface,
    bedrooms,
    bathrooms,
    type,
    condition,
    availability,
    availableFrom,
    equipments,
    rules,
  } = parsed.data;

  if (!isValidObjectId(id)) return notFound();

  try {
    await connectDB();

    const existingDoc = await Property.findOne({
      _id: id,
      ownerId: session.userId,
      deletedAt: null,
    }).lean();

    if (!existingDoc) {
      return { success: false, message: "Logement introuvable." };
    }

    const existing = existingDoc as unknown as IProperty & { _id: unknown };

    const publicFieldsChanged =
      existing.title !== title ||
      existing.description !== description ||
      existing.price !== price ||
      existing.city !== city ||
      (existing.zone ?? "") !== (zone ?? "") ||
      existing.address !== address ||
      existing.latitude !== latitude ||
      existing.longitude !== longitude ||
      existing.surface !== surface ||
      (existing.bedrooms ?? "") !== (bedrooms ?? "") ||
      (existing.bathrooms ?? "") !== (bathrooms ?? "") ||
      existing.type !== type ||
      existing.condition !== condition ||
      (existing.equipments ?? []).join("|") !== equipments.join("|") ||
      (existing.rules ?? "") !== (rules ?? "");

    const update: Record<string, unknown> = {
      $set: {
        title,
        description,
        price,
        city,
        address,
        latitude,
        longitude,
        surface,
        type,
        condition,
        availability,
        hasParking: equipments.includes("parking"),
        hasElevator: equipments.includes("elevator"),
        equipments,
      },
    };

    const unset: Record<string, unknown> = {};

    if (zone !== undefined) {
      (update.$set as Record<string, unknown>).zone = zone;
    } else {
      unset.zone = "";
    }

    if (rules !== undefined) {
      (update.$set as Record<string, unknown>).rules = rules;
    } else {
      unset.rules = "";
    }

    if (availableFrom !== undefined) {
      (update.$set as Record<string, unknown>).availableFrom = availableFrom;
    } else {
      unset.availableFrom = "";
    }

    if (bedrooms !== undefined) {
      (update.$set as Record<string, unknown>).bedrooms = bedrooms;
    } else {
      unset.bedrooms = "";
    }

    if (bathrooms !== undefined) {
      (update.$set as Record<string, unknown>).bathrooms = bathrooms;
    } else {
      unset.bathrooms = "";
    }

    if (publicFieldsChanged) {
      (update.$set as Record<string, unknown>).moderationStatus = "pending";
      unset.moderationReason = "";
    }

    if (Object.keys(unset).length > 0) {
      (update as Record<string, unknown>).$unset = unset;
    }

    const result = await Property.updateOne(
      { _id: id, ownerId: session.userId, deletedAt: null },
      update,
    );

    if (result.matchedCount === 0) {
      return { success: false, message: "Logement introuvable." };
    }

    revalidatePath("/dashboard/owner/properties");

    return {
      success: true,
      message: publicFieldsChanged
        ? "Logement modifié avec succès. Il est soumis à validation."
        : "Logement modifié avec succès. Aucune nouvelle validation nécessaire.",
    };
  } catch (error: unknown) {
    console.error("[updateProperty] error:", error);
    return {
      success: false,
      message: "Impossible de modifier le logement. Veuillez réessayer.",
    };
  }
}

// ─── DELETE (logical soft delete) ─────────────────────────────────────────────

/**
 * Soft delete a property listing — OWNER only, and only for their own listings.
 */
export async function deleteProperty(
  _prevState: PropertyActionState | null,
  formData: FormData,
): Promise<PropertyActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "OWNER") return forbidden();

  const parsed = deletePropertySchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return { success: false, message: "Identifiant invalide." };
  }

  const { id } = parsed.data;

  if (!isValidObjectId(id)) return notFound();

  try {
    await connectDB();

    const result = await Property.updateOne(
      { _id: id, ownerId: session.userId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return { success: false, message: "Logement introuvable." };
    }

    revalidatePath("/dashboard/owner/properties");

    return { success: true, message: "Logement supprimé avec succès." };
  } catch (error: unknown) {
    console.error("[deleteProperty] error:", error);
    return {
      success: false,
      message: "Impossible de supprimer le logement. Veuillez réessayer.",
    };
  }
}
