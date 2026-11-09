import { z } from "zod";

const idField = z
  .string()
  .trim()
  .min(1, "Identifiant de conversation invalide.")
  .regex(/^[a-f\d]{24}$/i, "Identifiant invalide.");

const bodyField = z
  .string()
  .trim()
  .min(1, "Le message doit contenir au moins 1 caractère.")
  .max(1000, "Le message ne doit pas dépasser 1000 caractères.");

export const startConversationSchema = z.object({
  propertyId: idField,
  body: bodyField,
});

export const sendMessageSchema = z.object({
  conversationId: idField,
  body: bodyField,
});

export const markConversationReadSchema = z.object({
  conversationId: idField,
});

export const pollMessagesSchema = z.object({
  conversationId: idField,
  after: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Date invalide.",
    }),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkConversationReadInput = z.infer<
  typeof markConversationReadSchema
>;
export type PollMessagesInput = z.infer<typeof pollMessagesSchema>;
