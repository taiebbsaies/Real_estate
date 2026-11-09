import { z } from "zod";

const idField = z
  .string()
  .trim()
  .min(1, "Identifiant du bien manquant.")
  .regex(/^[a-f\d]{24}$/i, "Identifiant de bien invalide.");

export const propertyTranslationInputSchema = z.object({
  propertyId: idField,
  targetLang: z.enum(["fr", "ar", "en"]),
});

export type PropertyTranslationInput = z.infer<
  typeof propertyTranslationInputSchema
>;
