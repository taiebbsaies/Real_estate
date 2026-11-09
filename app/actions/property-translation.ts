"use server";

import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Property from "@/models/property";
import { propertyTranslationInputSchema } from "@/lib/validations/property-translation";
import { translatePropertyDescription } from "@/lib/properties/description-translator";
import { createRateLimiter } from "@/lib/rate-limit";

export type TranslateDescriptionResult = {
  ok: boolean;
  message: string;
  translation?: string;
};

const consumeTranslation = createRateLimiter(20, 60 * 60 * 1000);

const UNAVAILABLE: TranslateDescriptionResult = {
  ok: false,
  message: "Traduction indisponible.",
};

const NOT_FOUND: TranslateDescriptionResult = {
  ok: false,
  message: "Logement introuvable.",
};

export async function translateDescription(
  input: unknown,
): Promise<TranslateDescriptionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { ok: false, message: "Veuillez vous connecter." };
    }
    if (session.activeRole !== "TENANT") {
      return { ok: false, message: "Accès refusé." };
    }

    const parsed = propertyTranslationInputSchema.safeParse(input);
    if (!parsed.success) {
      return NOT_FOUND;
    }

    const { propertyId, targetLang } = parsed.data;
    if (!isValidObjectId(propertyId)) {
      return NOT_FOUND;
    }

    await connectDB();

    const property = await Property.findOne({
      _id: propertyId,
      moderationStatus: "approved",
      deletedAt: null,
    })
      .select("description")
      .lean();

    const description =
      typeof property?.description === "string"
        ? property.description.trim()
        : "";

    if (!description) {
      return NOT_FOUND;
    }

    if (!consumeTranslation(session.userId)) {
      return {
        ok: false,
        message:
          "Vous avez atteint la limite de 20 traductions par heure. Réessayez plus tard.",
      };
    }

    const translation = await translatePropertyDescription(
      description,
      targetLang,
    );

    if (!translation.ok) {
      if (translation.reason === "no_key") {
        return {
          ok: false,
          message: "Traduction non configurée.",
        };
      }
      return UNAVAILABLE;
    }

    return { ok: true, message: "", translation: translation.text };
  } catch (error: unknown) {
    console.error(
      "[translateDescription] error:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return UNAVAILABLE;
  }
}
