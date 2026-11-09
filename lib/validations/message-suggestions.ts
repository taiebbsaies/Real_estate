import { z } from "zod";

const idField = z
  .string()
  .trim()
  .min(1, "Identifiant de conversation invalide.")
  .regex(/^[a-f\d]{24}$/i, "Identifiant invalide.");

export const messageSuggestionInputSchema = z.object({
  conversationId: idField,
});

export type MessageSuggestionInput = z.infer<
  typeof messageSuggestionInputSchema
>;
