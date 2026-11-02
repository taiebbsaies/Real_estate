"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { reportSchema } from "@/lib/validations/report";
import Property from "@/models/property";
import Report from "@/models/Report";

export type ReportActionState = {
  success: boolean;
  message: string;
};

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function reportProperty(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Veuillez vous connecter." };
  }
  if (session.activeRole !== "TENANT") {
    return {
      success: false,
      message: "Cette action est réservée aux locataires.",
    };
  }

  const parsed = reportSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reason: formData.get("reason"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    const commentError = parsed.error.issues.some(
      (issue) => issue.path[0] === "comment",
    );
    return {
      success: false,
      message: commentError
        ? "Le commentaire doit contenir entre 10 et 500 caractères et est requis pour le motif « Autre »."
        : "Veuillez choisir un motif de signalement valide.",
    };
  }
  if (!isValidObjectId(parsed.data.propertyId)) {
    return { success: false, message: "Logement introuvable." };
  }

  try {
    await connectDB();

    const property = await Property.findOne({
      _id: parsed.data.propertyId,
      moderationStatus: "approved",
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!property) {
      return { success: false, message: "Logement introuvable." };
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = await Report.countDocuments({
      reporterId: session.userId,
      createdAt: { $gte: cutoff },
    });
    if (recentReports >= 10) {
      return {
        success: false,
        message:
          "Vous avez atteint la limite de 10 signalements sur 24 heures. Réessayez plus tard.",
      };
    }

    try {
      await Report.create({
        propertyId: property._id,
        reporterId: session.userId,
        reason: parsed.data.reason,
        ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
      });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        return {
          success: false,
          message: "Vous avez déjà signalé cette annonce.",
        };
      }
      throw error;
    }

    revalidatePath("/dashboard/admin/properties");
    revalidatePath(`/dashboard/tenant/properties/${parsed.data.propertyId}`);
    return {
      success: true,
      message: "Votre signalement a bien été transmis à l’équipe.",
    };
  } catch (error: unknown) {
    console.error("[reportProperty] error:", error);
    return {
      success: false,
      message: "Impossible d’envoyer le signalement. Veuillez réessayer.",
    };
  }
}
