"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Favorite from "@/models/favorite";
import Property from "@/models/property";

export type FavoriteActionState = {
  success: boolean;
  message: string;
  isFavorite: boolean;
};

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function toggleFavorite(
  prevState: FavoriteActionState | null,
  formData: FormData,
): Promise<FavoriteActionState> {
  const previousIsFavorite = prevState?.isFavorite ?? false;
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: "Non autorisé. Veuillez vous connecter.",
      isFavorite: previousIsFavorite,
    };
  }
  if (session.activeRole !== "TENANT") {
    return {
      success: false,
      message: "Accès réservé aux locataires.",
      isFavorite: previousIsFavorite,
    };
  }

  const propertyId = formData.get("propertyId");
  if (typeof propertyId !== "string" || !isValidObjectId(propertyId)) {
    return {
      success: false,
      message: "Identifiant de logement invalide.",
      isFavorite: previousIsFavorite,
    };
  }

  try {
    await connectDB();

    const property = await Property.findOne({
      _id: propertyId,
      moderationStatus: "approved",
      deletedAt: null,
    })
      .select("_id")
      .lean();

    if (!property) {
      return {
        success: false,
        message: "Logement introuvable ou indisponible.",
        isFavorite: previousIsFavorite,
      };
    }

    const existing = await Favorite.findOne({
      userId: session.userId,
      propertyId,
    })
      .select("_id")
      .lean();

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id, userId: session.userId });
      revalidatePath("/dashboard/tenant/properties");
      revalidatePath("/dashboard/tenant/favorites");
      return {
        success: true,
        message: "Logement retiré de vos favoris.",
        isFavorite: false,
      };
    }

    try {
      await Favorite.create({ userId: session.userId, propertyId });
    } catch (error: unknown) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    revalidatePath("/dashboard/tenant/properties");
    revalidatePath("/dashboard/tenant/favorites");
    return {
      success: true,
      message: "Logement ajouté à vos favoris.",
      isFavorite: true,
    };
  } catch (error: unknown) {
    console.error("[toggleFavorite] error:", error);
    return {
      success: false,
      message: "Impossible de modifier vos favoris. Veuillez réessayer.",
      isFavorite: previousIsFavorite,
    };
  }
}
