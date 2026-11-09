"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import {
  getModerationPropertyById,
  type ModerationPropertyDetail,
} from "@/lib/properties/admin-queries";
import Property from "@/models/property";
import Report from "@/models/Report";

const propertyIdSchema = z.string().refine(isValidObjectId);
const rejectionReasonSchema = z.string().trim().min(10).max(1000);

export type ModerationActionResult = {
  success: boolean;
  message: string;
};

function revalidatePropertyLists(): void {
  revalidatePath("/dashboard/admin/properties");
  revalidatePath("/dashboard/tenant/properties");
  revalidatePath("/dashboard/owner/properties");
}

export async function approveProperty(
  propertyId: string,
): Promise<ModerationActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Veuillez vous connecter." };
  }
  if (session.activeRole !== "ADMIN") {
    return { success: false, message: "Accès réservé aux administrateurs." };
  }

  const parsedId = propertyIdSchema.safeParse(propertyId);
  if (!parsedId.success) {
    return { success: false, message: "Logement introuvable." };
  }

  try {
    await connectDB();

    const updated = await Property.findOneAndUpdate(
      {
        _id: parsedId.data,
        deletedAt: null,
        moderationStatus: "pending",
      },
      {
        $set: { moderationStatus: "approved" },
        $unset: { moderationReason: 1 },
      },
      { new: true },
    )
      .select("_id")
      .lean();

    if (!updated) {
      return { success: false, message: "Logement introuvable." };
    }

    revalidatePropertyLists();
    return { success: true, message: "Logement approuvé avec succès." };
  } catch (error: unknown) {
    console.error("[approveProperty] error:", error);
    return {
      success: false,
      message: "Impossible de modérer ce logement. Veuillez réessayer.",
    };
  }
}

export async function rejectProperty(
  propertyId: string,
  reason: string,
): Promise<ModerationActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Veuillez vous connecter." };
  }
  if (session.activeRole !== "ADMIN") {
    return { success: false, message: "Accès réservé aux administrateurs." };
  }

  const parsed = z
    .object({
      propertyId: propertyIdSchema,
      reason: rejectionReasonSchema,
    })
    .safeParse({ propertyId, reason });

  if (!parsed.success) {
    const reasonIsInvalid =
      typeof reason !== "string" ||
      !rejectionReasonSchema.safeParse(reason).success;
    return {
      success: false,
      message: reasonIsInvalid
        ? "Le motif doit contenir entre 10 et 1000 caractères."
        : "Logement introuvable.",
    };
  }

  try {
    await connectDB();

    const updated = await Property.findOneAndUpdate(
      {
        _id: parsed.data.propertyId,
        deletedAt: null,
        moderationStatus: { $in: ["pending", "approved"] },
      },
      {
        $set: {
          moderationStatus: "rejected",
          moderationReason: parsed.data.reason,
        },
      },
      { new: true },
    )
      .select("_id")
      .lean();

    if (!updated) {
      return { success: false, message: "Logement introuvable." };
    }

    await Report.updateMany(
      { propertyId: updated._id, status: "open" },
      {
        $set: {
          status: "actioned",
          handledBy: session.userId,
          handledAt: new Date(),
        },
      },
    );

    revalidatePropertyLists();
    return { success: true, message: "Logement rejeté avec succès." };
  } catch (error: unknown) {
    console.error("[rejectProperty] error:", error);
    return {
      success: false,
      message: "Impossible de modérer ce logement. Veuillez réessayer.",
    };
  }
}

export async function dismissReports(
  propertyId: string,
): Promise<ModerationActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Veuillez vous connecter." };
  }
  if (session.activeRole !== "ADMIN") {
    return { success: false, message: "Accès réservé aux administrateurs." };
  }

  const parsedId = propertyIdSchema.safeParse(propertyId);
  if (!parsedId.success) {
    return { success: false, message: "Logement introuvable." };
  }

  try {
    await connectDB();

    const property = await Property.findOne({
      _id: parsedId.data,
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!property) {
      return { success: false, message: "Logement introuvable." };
    }

    await Report.updateMany(
      { propertyId: property._id, status: "open" },
      {
        $set: {
          status: "dismissed",
          handledBy: session.userId,
          handledAt: new Date(),
        },
      },
    );

    revalidatePropertyLists();
    return { success: true, message: "Signalements classés sans suite." };
  } catch (error: unknown) {
    console.error("[dismissReports] error:", error);
    return {
      success: false,
      message: "Impossible de traiter les signalements. Veuillez réessayer.",
    };
  }
}

export async function getModerationPropertyDetail(
  propertyId: string,
): Promise<ModerationPropertyDetail | null> {
  const session = await getSession();
  if (!session || session.activeRole !== "ADMIN") {
    return null;
  }

  const parsedId = propertyIdSchema.safeParse(propertyId);
  if (!parsedId.success) {
    return null;
  }

  try {
    const detail = await getModerationPropertyById(parsedId.data);
    return detail;
  } catch (error: unknown) {
    console.error("[getModerationPropertyDetail] error:", error);
    return null;
  }
}
