"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { NotificationModel, TechnicianProfileModel, UserModel } from "@/src/models/shared";
import { assignmentService } from "@/src/services/assignment.service";
import { getSuspensionBlocker, OPEN_REQUEST_STATUSES } from "@/lib/admin/rules";

export type AdminActionState = { success: boolean; message: string };

const FORBIDDEN: AdminActionState = { success: false, message: "Action réservée aux administrateurs." };
const INVALID: AdminActionState = { success: false, message: "Données invalides." };

// Every action checks the role itself: a hidden button or a guarded page protects nothing here.
async function requireAdmin() {
  const { user } = await auth();
  return user?.role === "ADMIN" ? user : null;
}

function activeAdminFilter() {
  return {
    roles: "ADMIN" as const,
    suspendedAt: { $exists: false },
    deletedAt: { $exists: false },
  };
}

export async function suspendUser(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return FORBIDDEN;

  const userId = formData.get("userId")?.toString();
  if (!isValidObjectId(userId)) return INVALID;

  try {
    await connectDB();
    const target = await UserModel.findById(userId).select("roles suspendedAt").lean();
    if (!target) return { success: false, message: "Utilisateur introuvable." };
    if (target.suspendedAt) return { success: true, message: "Ce compte est déjà suspendu." };

    const blocker = getSuspensionBlocker({
      actorId: admin.id,
      targetId: String(target._id),
      targetIsActiveAdmin: target.roles.includes("ADMIN"),
      activeAdminCount: await UserModel.countDocuments(activeAdminFilter()),
    });
    if (blocker) return { success: false, message: blocker };

    await UserModel.updateOne({ _id: target._id }, { $set: { suspendedAt: new Date() } });

    const activeMissions = await MaintenanceRequestModel.countDocuments({
      assignedTechnicianId: target._id,
      status: { $in: OPEN_REQUEST_STATUSES },
    });

    revalidatePath("/dashboard/admin", "layout");
    return {
      success: true,
      message:
        activeMissions > 0
          ? `Compte suspendu. Missions en cours à réassigner : ${activeMissions}.`
          : "Compte suspendu.",
    };
  } catch (error) {
    console.error("[ADMIN] Suspend error:", error);
    return { success: false, message: "Erreur lors de la suspension du compte." };
  }
}

export async function reactivateUser(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN;

  const userId = formData.get("userId")?.toString();
  if (!isValidObjectId(userId)) return INVALID;

  try {
    await connectDB();
    await UserModel.updateOne({ _id: userId }, { $unset: { suspendedAt: 1 } });
    revalidatePath("/dashboard/admin", "layout");
    return { success: true, message: "Compte réactivé." };
  } catch (error) {
    console.error("[ADMIN] Reactivate error:", error);
    return { success: false, message: "Erreur lors de la réactivation du compte." };
  }
}

export async function setTechnicianVerification(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN;

  const userId = formData.get("userId")?.toString();
  const status = formData.get("status")?.toString();
  if (!isValidObjectId(userId) || (status !== "APPROVED" && status !== "REJECTED")) return INVALID;

  try {
    await connectDB();
    const updated = await TechnicianProfileModel.updateOne(
      { userId },
      { $set: { verificationStatus: status } },
    );
    if (updated.matchedCount === 0) {
      return { success: false, message: "Profil technicien introuvable." };
    }

    await NotificationModel.create({
      userId,
      title: status === "APPROVED" ? "Profil technicien validé" : "Profil technicien refusé",
      message:
        status === "APPROVED"
          ? "Vous pouvez maintenant recevoir des missions de maintenance."
          : "Votre profil ne peut pas recevoir de missions. Contactez l'administrateur.",
      type: "SYSTEM",
      link: "/profile",
    });

    revalidatePath("/dashboard/admin", "layout");
    return {
      success: true,
      message: status === "APPROVED" ? "Technicien validé." : "Technicien refusé.",
    };
  } catch (error) {
    console.error("[ADMIN] Verification error:", error);
    return { success: false, message: "Erreur lors de la mise à jour du technicien." };
  }
}

export async function reassignTechnician(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return FORBIDDEN;

  const requestId = formData.get("requestId")?.toString();
  const technicianId = formData.get("technicianId")?.toString();
  if (!requestId || !technicianId || !isValidObjectId(requestId) || !isValidObjectId(technicianId)) {
    return { success: false, message: "Sélectionnez un technicien." };
  }

  try {
    await assignmentService.reassignTechnician({ requestId, technicianId, actorId: admin.id });
    revalidatePath("/dashboard/admin", "layout");
    return { success: true, message: "Technicien assigné." };
  } catch (error) {
    console.error("[ADMIN] Reassign error:", error);
    return { success: false, message: (error as Error).message || "Erreur lors de l'assignation." };
  }
}
