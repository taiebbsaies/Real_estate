"use server";

import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Conversation from "@/models/conversation";
import Message from "@/models/Message";
import Property from "@/models/property";
import { messageSuggestionInputSchema } from "@/lib/validations/message-suggestions";
import { generateReplySuggestions } from "@/lib/messages/suggestions";
import { createRateLimiter } from "@/lib/rate-limit";

export type SuggestRepliesResult = {
  ok: boolean;
  suggestions: string[];
  message?: string;
};

const consumeSuggestion = createRateLimiter(20, 60 * 60 * 1000);

const NOT_FOUND = "Conversation introuvable.";

function failure(message: string): SuggestRepliesResult {
  return { ok: false, suggestions: [], message };
}

export async function suggestReplies(
  input: unknown,
): Promise<SuggestRepliesResult> {
  try {
    const session = await getSession();
    if (!session) {
      return failure("Veuillez vous connecter.");
    }
    if (session.activeRole !== "OWNER") {
      return failure("Accès refusé.");
    }

    const parsed = messageSuggestionInputSchema.safeParse(input);
    if (!parsed.success) {
      return failure(NOT_FOUND);
    }

    const { conversationId } = parsed.data;
    if (!isValidObjectId(conversationId)) {
      return failure(NOT_FOUND);
    }

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ownerId: session.userId,
    }).lean();
    if (!conversation) {
      return failure(NOT_FOUND);
    }

    const property = await Property.findOne({
      _id: conversation.propertyId,
      deletedAt: null,
    })
      .select("title city price")
      .lean();
    if (!property) {
      return failure(NOT_FOUND);
    }

    const docs = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("senderRole body")
      .lean();

    const lastMessage = docs[0];
    if (!lastMessage || lastMessage.senderRole !== "TENANT") {
      return { ok: true, suggestions: [] };
    }

    if (!consumeSuggestion(session.userId)) {
      return failure(
        "Vous avez atteint la limite de 20 suggestions par heure. Réessayez plus tard.",
      );
    }

    const messages = docs
      .slice()
      .reverse()
      .map((doc) => ({
        senderRole: doc.senderRole,
        body: doc.body,
      }));

    const suggestions = await generateReplySuggestions({
      property: {
        title: property.title,
        city: property.city,
        price: property.price,
      },
      messages,
    });

    return { ok: true, suggestions };
  } catch (error: unknown) {
    console.error(
      "[suggestReplies] error:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return failure("Suggestions indisponibles.");
  }
}
