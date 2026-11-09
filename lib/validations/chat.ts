import { z } from "zod";

export const MAX_CHAT_MESSAGE_LENGTH = 1000;
export const MAX_CHAT_HISTORY = 20;

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

/** The conversation sent by the widget. It must end with the user's question. */
export const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1)
    .max(MAX_CHAT_HISTORY)
    .refine(
      (messages) => {
        const last = messages[messages.length - 1];
        return (
          last?.role === "user" &&
          last.content.length <= MAX_CHAT_MESSAGE_LENGTH
        );
      },
      { error: "Message invalide." },
    ),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
