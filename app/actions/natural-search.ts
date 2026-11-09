"use server";

import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Property from "@/models/property";
import { naturalSearchSchema } from "@/lib/validations/natural-search";
import {
  interpretSearchText,
  type InterpretedFilters,
  type NaturalSearchSource,
} from "@/lib/properties/natural-search";

export type NaturalSearchState = {
  success: boolean;
  message: string;
  source?: NaturalSearchSource;
  explanation?: string[];
  queryString?: string;
};

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// In-memory only: this resets on server restart and is not shared across
// instances. It is a best-effort guard, not a durable quota.
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function isAllowed(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || entry.resetAt <= now) {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count += 1;
  return true;
}

function buildQueryString(filters: InterpretedFilters): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.priceMin !== undefined) {
    params.set("priceMin", String(filters.priceMin));
  }
  if (filters.priceMax !== undefined) {
    params.set("priceMax", String(filters.priceMax));
  }
  if (filters.surfaceMin !== undefined) {
    params.set("surfaceMin", String(filters.surfaceMin));
  }
  if (filters.surfaceMax !== undefined) {
    params.set("surfaceMax", String(filters.surfaceMax));
  }
  if (filters.bedrooms !== undefined) {
    params.set("bedrooms", String(filters.bedrooms));
  }
  if (filters.bathrooms !== undefined) {
    params.set("bathrooms", String(filters.bathrooms));
  }
  if (filters.type) params.set("type", filters.type);
  for (const equipment of filters.equipments ?? []) {
    params.set(`equipment_${equipment}`, "1");
  }
  if (filters.sort && filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }
  return params.toString();
}

export async function searchWithText(
  _previousState: NaturalSearchState,
  formData: FormData,
): Promise<NaturalSearchState> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Veuillez vous connecter." };
  }
  if (session.activeRole !== "TENANT") {
    return {
      success: false,
      message: "Cette recherche est réservée aux locataires.",
    };
  }

  const parsed = naturalSearchSchema.safeParse({ text: formData.get("text") });
  if (!parsed.success) {
    return {
      success: false,
      message: "Saisissez une recherche de 3 à 300 caractères.",
    };
  }

  if (!isAllowed(session.userId)) {
    return {
      success: false,
      message: "Trop de recherches. Veuillez réessayer dans une heure.",
    };
  }

  let cities: string[] = [];
  try {
    await connectDB();
    const values = await Property.distinct("city", {
      moderationStatus: "approved",
      deletedAt: null,
    });
    cities = values.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.name : "UnknownError");
  }

  const interpreted = await interpretSearchText(parsed.data.text, cities);
  if (interpreted.explanation.length === 0) {
    return {
      success: false,
      message:
        "Je n'ai pas compris, essayez avec une ville, un type ou un budget.",
    };
  }

  return {
    success: true,
    message: "Recherche comprise.",
    source: interpreted.source,
    explanation: interpreted.explanation,
    queryString: buildQueryString(interpreted.filters),
  };
}
