"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Property from "@/models/property";
import { propertyImageUploadSchema } from "@/lib/validations/property";
import type {
  PropertyActionState,
  PropertyImageActionState,
} from "@/lib/properties/types";
import { storage } from "@/lib/storage";
import { isManagedImageUrl } from "@/lib/storage/managed-url";

export type { PropertyImageActionState };

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_IMAGES = 6;
// Vercel rejects function requests above 4.5 MB, multipart overhead included.
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 Mo

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unauthorized(): PropertyActionState {
  return { success: false, message: "Non autorisé. Veuillez vous connecter." };
}

function forbidden(): PropertyActionState {
  return { success: false, message: "Accès refusé." };
}

function notFound(): PropertyActionState {
  return { success: false, message: "Logement introuvable." };
}

function detectImageExtension(buffer: Buffer): string | null {
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isJpeg) return "jpeg";
  if (isPng) return "png";
  if (isWebp) return "webp";
  return null;
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

export async function uploadPropertyImage(
  _prevState: PropertyImageActionState | null,
  formData: FormData,
): Promise<PropertyImageActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "OWNER") return forbidden();

  const parsed = propertyImageUploadSchema.safeParse({
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Identifiant de bien invalide." };
  }

  const { propertyId } = parsed.data;

  if (!isValidObjectId(propertyId)) return notFound();

  try {
    await connectDB();

    const property = await Property.findOne({
      _id: propertyId,
      ownerId: session.userId,
      deletedAt: null,
    }).lean();

    if (!property) {
      return { success: false, message: "Logement introuvable." };
    }

    const existingImages: string[] = (property.images as string[]) ?? [];

    if (existingImages.length >= MAX_IMAGES) {
      return {
        success: false,
        message: "Ce logement a déjà atteint le maximum de 6 images.",
      };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, message: "Fichier introuvable." };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: "Le fichier dépasse la taille maximale de 4 Mo.",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = detectImageExtension(buffer);
    if (!extension) {
      return {
        success: false,
        message: "Format de fichier non autorisé. Formats acceptés : jpeg, png, webp.",
      };
    }

    const imageUrl = await storage.save(buffer, { propertyId, extension });

    const update: Record<string, unknown> = {
      $push: { images: imageUrl },
    };
    const updateSet: Record<string, unknown> = { moderationStatus: "pending" };
    if (!property.coverImage) {
      updateSet.coverImage = existingImages[0] ?? imageUrl;
    }
    update.$set = updateSet;
    update.$unset = { moderationReason: "" };

    const result = await Property.updateOne(
      {
        _id: propertyId,
        ownerId: session.userId,
        deletedAt: null,
        "images.5": { $exists: false },
      },
      update,
    );

    if (result.matchedCount === 0) {
      await storage.delete(imageUrl);
      return {
        success: false,
        message: "Ce logement a déjà atteint le maximum de 6 images.",
      };
    }

    revalidatePath("/dashboard/owner/properties");
    revalidatePath(`/dashboard/owner/properties/${propertyId}/edit`);

    return { success: true, message: "Image ajoutée avec succès." };
  } catch (error: unknown) {
    console.error("[uploadPropertyImage] error:", error);
    return {
      success: false,
      message: "Impossible d'ajouter l'image. Veuillez réessayer.",
    };
  }
}

// ─── REMOVE ───────────────────────────────────────────────────────────────────

export async function removePropertyImage(
  _prevState: PropertyImageActionState | null,
  formData: FormData,
): Promise<PropertyImageActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "OWNER") return forbidden();

  const parsed = propertyImageUploadSchema.safeParse({
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Identifiant de bien invalide." };
  }

  const { propertyId } = parsed.data;

  if (!isValidObjectId(propertyId)) return notFound();

  const imageUrl =
    typeof formData.get("image") === "string"
      ? (formData.get("image") as string)
      : "";

  if (!isManagedImageUrl(imageUrl, propertyId)) {
    return { success: false, message: "Logement introuvable." };
  }

  try {
    await connectDB();

    const result = await Property.updateOne(
      {
        _id: propertyId,
        ownerId: session.userId,
        deletedAt: null,
        images: imageUrl,
      },
      {
        $pull: { images: imageUrl },
        $set: { moderationStatus: "pending" },
        $unset: { moderationReason: "" },
      },
    );

    if (result.matchedCount === 0) {
      return { success: false, message: "Logement introuvable." };
    }

    const property = await Property.findOne({
      _id: propertyId,
      ownerId: session.userId,
      deletedAt: null,
    }).lean();

    try {
      if (property?.coverImage === imageUrl) {
        const images: string[] = (property.images as string[]) ?? [];
        const remaining = images.filter((i) => i !== imageUrl);
        const coverUpdate: Record<string, unknown> =
          remaining.length > 0
            ? { $set: { coverImage: remaining[0] } }
            : { $unset: { coverImage: "" } };
        await Property.updateOne(
          { _id: propertyId, ownerId: session.userId, deletedAt: null },
          coverUpdate,
        );
      }
    } catch (coverError) {
      console.error("[removePropertyImage] cover update error:", coverError);
    }

    await storage.delete(imageUrl);

    revalidatePath("/dashboard/owner/properties");
    revalidatePath(`/dashboard/owner/properties/${propertyId}/edit`);

    return { success: true, message: "Image supprimée avec succès." };
  } catch (error: unknown) {
    console.error("[removePropertyImage] error:", error);
    return {
      success: false,
      message: "Impossible de supprimer l'image. Veuillez réessayer.",
    };
  }
}

// ─── SET COVER ─────────────────────────────────────────────────────────────────

export async function setCoverImage(
  _prevState: PropertyImageActionState | null,
  formData: FormData,
): Promise<PropertyImageActionState> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.activeRole !== "OWNER") return forbidden();

  const parsed = propertyImageUploadSchema.safeParse({
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Identifiant de bien invalide." };
  }

  const { propertyId } = parsed.data;

  if (!isValidObjectId(propertyId)) return notFound();

  const imageUrl =
    typeof formData.get("image") === "string"
      ? (formData.get("image") as string)
      : "";

  if (!isManagedImageUrl(imageUrl, propertyId)) {
    return { success: false, message: "Logement introuvable." };
  }

  try {
    await connectDB();

    const result = await Property.updateOne(
      {
        _id: propertyId,
        ownerId: session.userId,
        deletedAt: null,
        images: imageUrl,
      },
      { $set: { coverImage: imageUrl } },
    );

    if (result.matchedCount === 0) {
      return { success: false, message: "Logement introuvable." };
    }

    revalidatePath(`/dashboard/owner/properties/${propertyId}/edit`);

    return { success: true, message: "Couverture définie avec succès." };
  } catch (error: unknown) {
    console.error("[setCoverImage] error:", error);
    return {
      success: false,
      message: "Impossible de définir la couverture. Veuillez réessayer.",
    };
  }
}
