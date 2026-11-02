"use server";

import { getSession } from "@/lib/session";
import {
  generatePropertyDescription as generateDescription,
  type DescriptionGenerationResult,
} from "@/lib/properties/description-generator";
import { propertyDescriptionInputSchema } from "@/lib/validations/property-description";

export type GeneratePropertyDescriptionResult = {
  success: boolean;
  description: string;
  source: "ai" | "template";
  message: string;
};

type GenerationWindow = {
  startedAt: number;
  count: number;
};

// This in-memory limit resets when the server process restarts.
const generationsByOwner = new Map<string, GenerationWindow>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function applyRateLimit(ownerId: string): boolean {
  const now = Date.now();
  const current = generationsByOwner.get(ownerId);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    generationsByOwner.set(ownerId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT) {
    return false;
  }

  current.count += 1;
  return true;
}

function failure(message: string): GeneratePropertyDescriptionResult {
  return { success: false, description: "", source: "template", message };
}

export async function generatePropertyDescription(
  input: unknown,
): Promise<GeneratePropertyDescriptionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return failure("Veuillez vous connecter.");
    }
    if (session.activeRole !== "OWNER") {
      return failure("La génération est réservée aux propriétaires.");
    }

    const parsed = propertyDescriptionInputSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        "Renseignez les champs obligatoires et vérifiez les caractéristiques du logement.",
      );
    }

    if (!applyRateLimit(session.userId)) {
      return failure(
        "Vous avez atteint la limite de 10 générations par heure. Réessayez plus tard.",
      );
    }

    const result: DescriptionGenerationResult =
      await generateDescription(parsed.data);
    return {
      success: true,
      description: result.description,
      source: result.source,
      message: "Brouillon généré, à relire.",
    };
  } catch (error: unknown) {
    console.error("[generatePropertyDescription] error:", error);
    return failure(
      "Impossible de générer la description. Veuillez réessayer.",
    );
  }
}
