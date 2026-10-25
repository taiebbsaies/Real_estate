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
import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "@/lib/constants/complaint";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ComplaintActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export type SerializedComplaint = {
  _id: string;
  tenantId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  technicianId?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
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

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Create a new complaint — TENANT only.
 * tenantId is always derived from the verified session, never from client input.
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
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    await connectDB();

    await Complaint.create({
      tenantId: session.userId,
      ...parsed.data,
      status: "pending",
    });

    revalidatePath("/dashboard/tenant/complaints");

    return { success: true, message: "Réclamation soumise avec succès." };
  } catch (error: unknown) {
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
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { id, ...fields } = parsed.data;

  if (!isValidObjectId(id)) return notFound();

  try {
    await connectDB();

    // Ownership + status check in a single atomic query
    const result = await Complaint.updateOne(
      { _id: id, tenantId: session.userId, status: "pending" },
      { $set: fields },
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        message:
          "Réclamation introuvable, ou modification non autorisée (seules les réclamations en attente peuvent être modifiées).",
      };
    }

    revalidatePath("/dashboard/tenant/complaints");

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

    revalidatePath("/dashboard/tenant/complaints");

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
 * Change the status of any complaint — OWNER, TECHNICIAN, or ADMIN only.
 */
export async function updateComplaintStatus(
  _prevState: ComplaintActionState | null,
  formData: FormData,
): Promise<ComplaintActionState> {
  const session = await getSession();
  if (!session) return unauthorized();

  const allowedRoles = ["OWNER", "TECHNICIAN", "ADMIN"] as const;
  if (!allowedRoles.includes(session.activeRole as (typeof allowedRoles)[number])) {
    return forbidden();
  }

  const parsed = updateStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    resolutionNotes: formData.get("resolutionNotes") ?? undefined,
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

    const updateFields: Record<string, unknown> = { status };
    if (resolutionNotes !== undefined) {
      updateFields.resolutionNotes = resolutionNotes;
    }

    const result = await Complaint.updateOne(
      { _id: id },
      { $set: updateFields },
    );

    if (result.matchedCount === 0) return notFound();

    revalidatePath("/dashboard/owner/complaints");
    revalidatePath("/dashboard/technician/complaints");

    return { success: true, message: "Statut mis à jour avec succès." };
  } catch (error: unknown) {
    console.error("[updateComplaintStatus] error:", error);
    return {
      success: false,
      message: "Impossible de mettre à jour le statut. Veuillez réessayer.",
    };
  }
}

// ─── READ QUERIES ─────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated tenant's own complaints, newest first.
 * Returns plain serializable objects (no Mongoose documents on client boundary).
 */
export async function getMyComplaints(): Promise<SerializedComplaint[]> {
  const session = await getSession();
  if (!session) return [];

  await connectDB();

  const docs = await Complaint.find({ tenantId: session.userId })
    .sort({ createdAt: -1 })
    .lean();

  return docs.map((doc) => ({
    _id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    priority: doc.priority,
    status: doc.status,
    technicianId: doc.technicianId?.toString(),
    resolutionNotes: doc.resolutionNotes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));
}

/**
 * Fetch ALL complaints for staff views — OWNER, TECHNICIAN, ADMIN only.
 * Optionally filter by status.
 */
export async function getAllComplaints(
  filterStatus?: ComplaintStatus,
): Promise<SerializedComplaint[]> {
  const session = await getSession();
  if (!session) return [];

  const allowedRoles = ["OWNER", "TECHNICIAN", "ADMIN"] as const;
  if (!allowedRoles.includes(session.activeRole as (typeof allowedRoles)[number])) {
    return [];
  }

  await connectDB();

  const query = filterStatus ? { status: filterStatus } : {};
  const docs = await Complaint.find(query).sort({ createdAt: -1 }).lean();

  return docs.map((doc) => ({
    _id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    priority: doc.priority,
    status: doc.status,
    technicianId: doc.technicianId?.toString(),
    resolutionNotes: doc.resolutionNotes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));
}
