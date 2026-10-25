"use server";

import "server-only";
import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Complaint from "@/models/complaint";
import {
  createComplaintSchema,
  updateComplaintSchema,
  updateStatusSchema,
  deleteComplaintSchema,
} from "@/lib/validations/complaint";
import {
  isComplaintStatusTransitionAllowed,
  type ComplaintStatus,
} from "@/lib/constants/complaint";
import type { ComplaintActionState } from "@/lib/complaints/types";
import { isTestPropertiesEnabled } from "@/lib/test-properties/config";
import {
  getTestPropertyOwnerId,
  tenantOccupiesTestProperty,
} from "@/lib/test-properties/queries";

export type { ComplaintActionState } from "@/lib/complaints/types";

const STAFF_ROLES = ["OWNER", "TECHNICIAN", "ADMIN"] as const;

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolue",
  rejected: "Rejetée",
};

const REVALIDATE_PATHS = [
  "/dashboard/tenant/complaints",
  "/dashboard/tenant",
  "/dashboard/owner/complaints",
  "/dashboard/owner",
  "/dashboard/technician/complaints",
  "/dashboard/technician",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

function revalidateComplaintPages() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function unauthorized(): ComplaintActionState {
  return { success: false, message: "Non autorisé. Veuillez vous connecter." };
}

function forbidden(): ComplaintActionState {
  return { success: false, message: "Accès refusé." };
}

function notFound(): ComplaintActionState {
  return { success: false, message: "Réclamation introuvable." };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function optionalFormValue(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Create a new complaint — TENANT only.
 * tenantId is always derived from the verified session, never from client input.
 * An optional clientKey makes offline retries idempotent.
 */
export async function createComplaint(
  _prevState: ComplaintActionState | null,
  formData: FormData,
): Promise<ComplaintActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN") {
    return forbidden();
  }

  const parsed = createComplaintSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    propertyId: optionalFormValue(formData.get("propertyId")),
    clientKey: optionalFormValue(formData.get("clientKey")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { propertyId, ...fields } = parsed.data;

  try {
    await connectDB();

    if (propertyId) {
      if (!isTestPropertiesEnabled()) {
        return {
          success: false,
          message: "Les appartements de test ne sont pas activés.",
          errors: { propertyId: ["Appartement de test indisponible."] },
        };
      }

      const occupies = await tenantOccupiesTestProperty(
        session.userId,
        propertyId,
      );
      if (!occupies) {
        return {
          success: false,
          message:
            "Vous n'occupez pas cet appartement de test. Choisissez un appartement associé à votre compte.",
          errors: {
            propertyId: ["Occupation active requise pour cet appartement."],
          },
        };
      }
    }

    await Complaint.create({
      tenantId: session.userId,
      ...fields,
      ...(propertyId ? { propertyId } : {}),
      status: "pending",
    });

    revalidateComplaintPages();

    return { success: true, message: "Réclamation soumise avec succès." };
  } catch (error: unknown) {
    // A retried offline draft may already have reached the database even if
    // the client never received the response. Treat it as a success.
    if (isDuplicateKeyError(error) && parsed.data.clientKey) {
      revalidateComplaintPages();
      return {
        success: true,
        message: "Cette réclamation a déjà été enregistrée. Aucun doublon créé.",
      };
    }

    console.error("[createComplaint] error:", error);
    return {
      success: false,
      message: "Impossible de soumettre la réclamation. Veuillez réessayer.",
    };
  }
}

// ─── UPDATE (Tenant edits own pending complaint) ──────────────────────────────

/**
 * Edit a complaint — TENANT who owns it AND it is still pending.
 */
export async function updateComplaint(
  _prevState: ComplaintActionState | null,
  formData: FormData,
): Promise<ComplaintActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN") {
    return forbidden();
  }

  const parsed = updateComplaintSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    propertyId: optionalFormValue(formData.get("propertyId")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { id, propertyId, ...fields } = parsed.data;

  if (!isValidObjectId(id)) return notFound();

  try {
    await connectDB();

    if (propertyId) {
      if (!isTestPropertiesEnabled()) {
        return {
          success: false,
          message: "Les appartements de test ne sont pas activés.",
          errors: { propertyId: ["Appartement de test indisponible."] },
        };
      }

      const occupies = await tenantOccupiesTestProperty(
        session.userId,
        propertyId,
      );
      if (!occupies) {
        return {
          success: false,
          message:
            "Vous n'occupez pas cet appartement de test. Choisissez un appartement associé à votre compte.",
          errors: {
            propertyId: ["Occupation active requise pour cet appartement."],
          },
        };
      }
    }

    const setFields: Record<string, unknown> = { ...fields };
    if (propertyId) {
      setFields.propertyId = propertyId;
    }

    const update: Record<string, unknown> = { $set: setFields };
    // Removing the apartment is explicit: an empty select clears the link.
    if (!propertyId) {
      update.$unset = { propertyId: "" };
    }

    // Ownership + status check in a single atomic query
    const result = await Complaint.updateOne(
      { _id: id, tenantId: session.userId, status: "pending" },
      update,
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        message:
          "Réclamation introuvable, ou modification non autorisée (seules les réclamations en attente peuvent être modifiées).",
      };
    }

    revalidateComplaintPages();

    return { success: true, message: "Réclamation modifiée avec succès." };
  } catch (error: unknown) {
    console.error("[updateComplaint] error:", error);
    return {
      success: false,
      message: "Impossible de modifier la réclamation. Veuillez réessayer.",
    };
  }
}

// ─── DELETE (Tenant deletes own pending complaint, or Admin deletes any) ──────

export async function deleteComplaint(
  _prevState: ComplaintActionState | null,
  formData: FormData,
): Promise<ComplaintActionState> {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = deleteComplaintSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return { success: false, message: "Identifiant invalide." };
  }

  const { id } = parsed.data;
  if (!isValidObjectId(id)) return notFound();

  try {
    await connectDB();

    let result;

    if (session.activeRole === "ADMIN") {
      // Admins can delete any complaint
      result = await Complaint.deleteOne({ _id: id });
    } else if (session.activeRole === "TENANT") {
      // Tenants can only delete their own pending complaints
      result = await Complaint.deleteOne({
        _id: id,
        tenantId: session.userId,
        status: "pending",
      });
    } else {
      return forbidden();
    }

    if (result.deletedCount === 0) {
      return {
        success: false,
        message:
          "Réclamation introuvable, ou suppression non autorisée (seules les réclamations en attente peuvent être supprimées).",
      };
    }

    revalidateComplaintPages();

    return { success: true, message: "Réclamation supprimée avec succès." };
  } catch (error: unknown) {
    console.error("[deleteComplaint] error:", error);
    return {
      success: false,
      message: "Impossible de supprimer la réclamation. Veuillez réessayer.",
    };
  }
}

// ─── UPDATE STATUS (Owner / Technician / Admin) ───────────────────────────────

/**
 * Change the status of a complaint — OWNER, TECHNICIAN, or ADMIN only.
 *
 * Staff can only apply an allowed transition. Technicians can only work on
 * unassigned complaints or complaints already assigned to them, and they claim
 * an unassigned complaint when they start or resolve it.
 */
export async function updateComplaintStatus(
  _prevState: ComplaintActionState | null,
  formData: FormData,
): Promise<ComplaintActionState> {
  const session = await getSession();
  if (!session) return unauthorized();

  const isStaff = STAFF_ROLES.includes(
    session.activeRole as (typeof STAFF_ROLES)[number],
  );
  if (!isStaff) return forbidden();

  const parsed = updateStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    resolutionNotes: optionalFormValue(formData.get("resolutionNotes")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { id, status, resolutionNotes } = parsed.data;

  if (!isValidObjectId(id)) return notFound();

  try {
    await connectDB();

    const existing = await Complaint.findById(id)
      .select("status technicianId propertyId")
      .lean();

    if (!existing) return notFound();

    if (
      session.activeRole === "TECHNICIAN" &&
      existing.technicianId &&
      existing.technicianId.toString() !== session.userId
    ) {
      return forbidden();
    }

    // Owners may only update complaints targeting their own test apartment.
    // Legacy complaints without a property keep the previous behaviour.
    if (session.activeRole === "OWNER" && existing.propertyId) {
      const ownerId = await getTestPropertyOwnerId(
        existing.propertyId.toString(),
      );
      if (!ownerId || ownerId !== session.userId) {
        return forbidden();
      }
    }

    if (!isComplaintStatusTransitionAllowed(existing.status, status)) {
      return {
        success: false,
        message: `Transition non autorisée : ${STATUS_LABELS[existing.status]} → ${STATUS_LABELS[status]}.`,
      };
    }

    if (
      (status === "resolved" || status === "rejected") &&
      !resolutionNotes
    ) {
      return {
        success: false,
        message:
          status === "resolved"
            ? "Une note de résolution est requise pour clôturer une réclamation."
            : "Un motif est requis pour rejeter une réclamation.",
        errors: {
          resolutionNotes: [
            "Ce champ est obligatoire pour ce changement de statut.",
          ],
        },
      };
    }

    const setFields: Record<string, unknown> = { status };
    const unsetFields: Record<string, unknown> = {};

    if (resolutionNotes) {
      setFields.resolutionNotes = resolutionNotes;
    } else if (status === "pending" || status === "in_progress") {
      // Reopening a complaint should not keep a stale resolution note.
      if (existing.status !== status) {
        unsetFields.resolutionNotes = "";
      }
    }

    if (
      session.activeRole === "TECHNICIAN" &&
      !existing.technicianId &&
      (status === "in_progress" || status === "resolved")
    ) {
      setFields.technicianId = session.userId;
    }

    const update: Record<string, unknown> = { $set: setFields };
    if (Object.keys(unsetFields).length > 0) {
      update.$unset = unsetFields;
    }

    // The status filter makes concurrent transitions fail instead of
    // silently overwriting a status another staff member just set.
    const filter: Record<string, unknown> = {
      _id: id,
      status: existing.status,
    };
    if (session.activeRole === "TECHNICIAN") {
      filter.$or = [
        { technicianId: session.userId },
        { technicianId: { $exists: false } },
      ];
    }

    const result = await Complaint.updateOne(filter, update);

    if (result.matchedCount === 0) {
      return {
        success: false,
        message:
          "La réclamation a été modifiée entre-temps. Rechargez la page et réessayez.",
      };
    }

    revalidateComplaintPages();

    return {
      success: true,
      message: `Statut mis à jour : ${STATUS_LABELS[status]}.`,
    };
  } catch (error: unknown) {
    console.error("[updateComplaintStatus] error:", error);
    return {
      success: false,
      message: "Impossible de mettre à jour le statut. Veuillez réessayer.",
    };
  }
}
