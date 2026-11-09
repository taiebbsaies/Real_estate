"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Conversation from "@/models/conversation";
import Message, { type IMessage } from "@/models/Message";
import Property from "@/models/property";
import {
  markConversationReadSchema,
  pollMessagesSchema,
  sendMessageSchema,
  startConversationSchema,
} from "@/lib/validations/conversation";
import type { ChatMessage, ConversationActionState } from "@/lib/messages/types";
import { getUnreadTotal as getUnreadTotalForUser } from "@/lib/messages/queries";

const MAX_MESSAGES_PER_WINDOW = 20;
const RATE_WINDOW_MS = 60_000;
const MAX_CONVERSATIONS_PER_HOUR = 5;

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function unauthorized(): ConversationActionState {
  return { success: false, message: "Non autorisé. Veuillez vous connecter." };
}

function forbidden(): ConversationActionState {
  return { success: false, message: "Accès refusé." };
}

function notFound(): ConversationActionState {
  return { success: false, message: "Conversation introuvable." };
}

function toChatMessage(
  doc: IMessage & { _id: unknown },
  userId: string,
): ChatMessage {
  return {
    id: String(doc._id),
    senderRole: doc.senderRole,
    body: doc.body,
    createdAt: doc.createdAt.toISOString(),
    isMine: doc.senderId.toString() === userId,
  };
}

// ─── START CONVERSATION ──────────────────────────────────────────────────────

export async function startConversation(
  propertyId: string,
  body: string,
): Promise<ConversationActionState> {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.activeRole !== "TENANT") return forbidden();

    const parsed = startConversationSchema.safeParse({ propertyId, body });
    if (!parsed.success) {
      const bodyError = parsed.error.issues.some(
        (issue) => issue.path[0] === "body",
      );
      return {
        success: false,
        message: bodyError
          ? "Veuillez saisir un message valide (1 à 1000 caractères)."
          : "Conversation introuvable.",
      };
    }

    const { propertyId: validPropertyId, body: validBody } = parsed.data;

    if (!isValidObjectId(validPropertyId)) {
      return notFound();
    }

    const recentConversations = await Conversation.countDocuments({
      tenantId: session.userId,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recentConversations >= MAX_CONVERSATIONS_PER_HOUR) {
      return {
        success: false,
        message: "Vous avez atteint la limite de 5 conversations par heure. Réessayez plus tard.",
      };
    }

    await connectDB();

    const property = await Property.findOne({
      _id: validPropertyId,
      moderationStatus: "approved",
      deletedAt: null,
    }).lean();
    if (!property) {
      return { success: false, message: "Logement introuvable." };
    }
    if (property.ownerId.toString() === session.userId) {
      return { success: false, message: "Conversation introuvable." };
    }

    const now = new Date();
    const preview = validBody.trim().slice(0, 120);

    let conversationId: string;
    try {
      const conversation = await Conversation.findOneAndUpdate(
        { propertyId: validPropertyId, tenantId: session.userId },
        {
          $setOnInsert: {
            propertyId: validPropertyId,
            tenantId: session.userId,
            ownerId: property.ownerId,
            lastMessageAt: now,
            lastMessagePreview: preview,
            tenantUnread: 0,
            ownerUnread: 0,
          },
        },
        { new: true, upsert: true },
      );
      conversationId = String(conversation._id);
    } catch (error: unknown) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      const existing = await Conversation.findOne({
        propertyId: validPropertyId,
        tenantId: session.userId,
      });
      if (!existing) {
        return notFound();
      }
      conversationId = String(existing._id);
    }

    await Message.create({
      conversationId,
      senderId: session.userId,
      senderRole: "TENANT",
      body: validBody,
    });
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: { lastMessageAt: now, lastMessagePreview: preview },
        $inc: { ownerUnread: 1 },
      },
    );

    revalidatePath("/dashboard/tenant/messages");
    revalidatePath(`/dashboard/tenant/messages/${conversationId}`);

    return {
      success: true,
      message: "Votre message a bien été envoyé.",
      conversationId,
    };
  } catch (error: unknown) {
    console.error("[startConversation] error:", error);
    return {
      success: false,
      message: "Impossible d'envoyer le message. Veuillez réessayer.",
    };
  }
}

// ─── SEND MESSAGE ────────────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<ConversationActionState> {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.activeRole !== "TENANT" && session.activeRole !== "OWNER") {
      return forbidden();
    }

    const parsed = sendMessageSchema.safeParse({ conversationId, body });
    if (!parsed.success) {
      const bodyError = parsed.error.issues.some(
        (issue) => issue.path[0] === "body",
      );
      return {
        success: false,
        message: bodyError
          ? "Veuillez saisir un message valide (1 à 1000 caractères)."
          : "Conversation introuvable.",
      };
    }

    const { conversationId: validConversationId, body: validBody } =
      parsed.data;

    if (!isValidObjectId(validConversationId)) {
      return notFound();
    }

    const recentMessages = await Message.countDocuments({
      senderId: session.userId,
      createdAt: { $gte: new Date(Date.now() - RATE_WINDOW_MS) },
    });
    if (recentMessages >= MAX_MESSAGES_PER_WINDOW) {
      return {
        success: false,
        message: "Vous avez atteint la limite de 20 messages par minute. Réessayez plus tard.",
      };
    }

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: validConversationId,
      ...(session.activeRole === "TENANT"
        ? { tenantId: session.userId }
        : { ownerId: session.userId }),
    }).lean();
    if (!conversation) {
      return notFound();
    }

    const property = await Property.findOne({
      _id: conversation.propertyId,
      deletedAt: null,
    }).lean();
    if (!property) {
      return {
        success: false,
        message: "Cette conversation est fermée car l'annonce a été supprimée.",
      };
    }

    const now = new Date();
    const preview = validBody.trim().slice(0, 120);

    const sentMessage = await Message.create({
      conversationId: validConversationId,
      senderId: session.userId,
      senderRole: session.activeRole,
      body: validBody,
    });

    if (session.activeRole === "TENANT") {
      await Conversation.updateOne(
        { _id: validConversationId },
        {
          $set: { lastMessageAt: now, lastMessagePreview: preview },
          $inc: { ownerUnread: 1 },
        },
      );
    } else {
      await Conversation.updateOne(
        { _id: validConversationId },
        {
          $set: { lastMessageAt: now, lastMessagePreview: preview },
          $inc: { tenantUnread: 1 },
        },
      );
    }

    revalidatePath("/dashboard/tenant/messages");
    revalidatePath("/dashboard/owner/messages");

    return {
      success: true,
      message: "Message envoyé.",
      messageId: String(sentMessage._id),
      createdAt: sentMessage.createdAt.toISOString(),
    };
  } catch (error: unknown) {
    console.error("[sendMessage] error:", error);
    return {
      success: false,
      message: "Impossible d'envoyer le message. Veuillez réessayer.",
    };
  }
}

// ─── GET MESSAGES ────────────────────────────────────────────────────────────

export async function getMessages(
  conversationId: string,
  after?: string,
): Promise<ChatMessage[]> {
  try {
    const session = await getSession();
    if (!session) return [];
    if (session.activeRole !== "TENANT" && session.activeRole !== "OWNER") {
      return [];
    }

    const parsed = pollMessagesSchema.safeParse({ conversationId, after });
    if (!parsed.success) {
      return [];
    }

    const { conversationId: validConversationId, after: afterValue } =
      parsed.data;

    if (!isValidObjectId(validConversationId)) {
      return [];
    }

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: validConversationId,
      ...(session.activeRole === "TENANT"
        ? { tenantId: session.userId }
        : { ownerId: session.userId }),
    }).lean();
    if (!conversation) {
      return [];
    }

    const filter: {
      conversationId: string;
      createdAt?: { $gt: Date };
    } = {
      conversationId: validConversationId,
    };
    if (afterValue) {
      filter.createdAt = { $gt: new Date(afterValue) };
    }

    let query = Message.find(filter).sort({ createdAt: -1 });
    if (!afterValue) {
      query = query.limit(50);
    }
    const docs = await query.lean();

    const messages = docs
      .slice()
      .reverse()
      .map((doc) => toChatMessage(doc as IMessage & { _id: unknown }, session.userId));

    return messages;
  } catch (error: unknown) {
    console.error(
      "[getMessages] error:",
      error instanceof Error ? error.name : "UnknownError",
    );
    throw new Error("Impossible de charger les messages.");
  }
}

// ─── MARK AS READ ────────────────────────────────────────────────────────────

export async function markConversationRead(
  conversationId: string,
): Promise<ConversationActionState> {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.activeRole !== "TENANT" && session.activeRole !== "OWNER") {
      return forbidden();
    }

    const parsed = markConversationReadSchema.safeParse({ conversationId });
    if (!parsed.success) {
      return notFound();
    }

    const { conversationId: validConversationId } = parsed.data;

    if (!isValidObjectId(validConversationId)) {
      return notFound();
    }

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: validConversationId,
      ...(session.activeRole === "TENANT"
        ? { tenantId: session.userId }
        : { ownerId: session.userId }),
    }).lean();
    if (!conversation) {
      return notFound();
    }

    const filter =
      session.activeRole === "TENANT"
        ? { _id: validConversationId, tenantId: session.userId }
        : { _id: validConversationId, ownerId: session.userId };

    const update =
      session.activeRole === "TENANT"
        ? { $set: { tenantUnread: 0 } }
        : { $set: { ownerUnread: 0 } };

    await Conversation.updateOne(filter, update);

    return { success: true, message: "Conversation marquée comme lue." };
  } catch (error: unknown) {
    console.error("[markConversationRead] error:", error);
    return {
      success: false,
      message: "Impossible de marquer la conversation comme lue.",
    };
  }
}

// ─── UNREAD TOTAL ────────────────────────────────────────────────────────────

export async function getUnreadTotal(): Promise<number> {
  try {
    return await getUnreadTotalForUser();
  } catch (error: unknown) {
    console.error("[getUnreadTotal] error:", error);
    return 0;
  }
}
