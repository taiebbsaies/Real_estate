import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Conversation, { type IConversation } from "@/models/conversation";
import Property from "@/models/property";
import User from "@/models/user";
import type { ConversationSummary } from "@/lib/messages/types";

async function buildConversationSummary(
  conversation: IConversation & { _id: unknown },
  viewerIsTenant: boolean,
): Promise<ConversationSummary> {
  const counterpartIsTenant = !viewerIsTenant;
  const unread = viewerIsTenant
    ? conversation.tenantUnread
    : conversation.ownerUnread;

  const counterpartId = counterpartIsTenant
    ? conversation.ownerId
    : conversation.tenantId;
  const counterpart = await User.findById(counterpartId)
    .select("firstName")
    .lean();
  const counterpartName = counterpart
    ? counterpart.firstName?.trim() ||
      (counterpartIsTenant ? "Locataire" : "Propriétaire")
    : counterpartIsTenant
      ? "Locataire"
      : "Propriétaire";

  const property = await Property.findById(conversation.propertyId)
    .select("title city type coverImage images deletedAt")
    .lean();
  const images: string[] = (property?.images as string[]) ?? [];
  const coverImage =
    property?.coverImage && images.includes(property.coverImage)
      ? property.coverImage
      : images[0] ?? null;

  return {
    _id: String(conversation._id),
    propertyId: String(conversation.propertyId),
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    lastMessagePreview: conversation.lastMessagePreview,
    tenantUnread: viewerIsTenant ? conversation.tenantUnread : conversation.ownerUnread,
    ownerUnread: viewerIsTenant ? conversation.ownerUnread : conversation.tenantUnread,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    propertyTitle: property?.title ?? "",
    propertyCity: property?.city ?? "",
    propertyType: property?.type ?? null,
    propertyCoverImage: coverImage,
    isListingDeleted: !property || Boolean(property.deletedAt),
    counterpartName,
    unread,
  };
}

export async function listConversationsForTenant(
  userId: string,
): Promise<ConversationSummary[]> {
  const session = await getSession();
  if (!session || session.activeRole !== "TENANT") {
    return [];
  }

  await connectDB();

  const conversations = await Conversation.find({
    tenantId: userId,
  })
    .sort({ lastMessageAt: -1 })
    .lean();

  const summaries: ConversationSummary[] = [];
  for (const conversation of conversations) {
    summaries.push(await buildConversationSummary(conversation, true));
  }
  return summaries;
}

export async function listConversationsForOwner(
  userId: string,
): Promise<ConversationSummary[]> {
  const session = await getSession();
  if (!session || session.activeRole !== "OWNER") {
    return [];
  }

  await connectDB();

  const conversations = await Conversation.find({
    ownerId: userId,
  })
    .sort({ lastMessageAt: -1 })
    .lean();

  const summaries: ConversationSummary[] = [];
  for (const conversation of conversations) {
    summaries.push(await buildConversationSummary(conversation, false));
  }
  return summaries;
}

export async function getConversationForParticipant(
  conversationId: string,
  userId: string,
  role: "TENANT" | "OWNER",
): Promise<ConversationSummary | null> {
  if (!isValidObjectId(conversationId)) {
    return null;
  }

  const session = await getSession();
  if (!session || session.activeRole !== role) {
    return null;
  }

  await connectDB();

  const conversation = await Conversation.findOne({
    _id: conversationId,
    ...(role === "TENANT" ? { tenantId: userId } : { ownerId: userId }),
  }).lean();

  if (!conversation) {
    return null;
  }

  return buildConversationSummary(conversation, role === "TENANT");
}

export async function getConversationByPropertyAndTenant(
  propertyId: string,
  tenantId: string,
): Promise<ConversationSummary | null> {
  if (!isValidObjectId(propertyId)) {
    return null;
  }

  const session = await getSession();
  if (!session || session.activeRole !== "TENANT") {
    return null;
  }

  await connectDB();

  const conversation = await Conversation.findOne({
    propertyId,
    tenantId,
  }).lean();

  if (!conversation) {
    return null;
  }

  return buildConversationSummary(conversation, true);
}

export async function getUnreadTotal(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;
  if (session.activeRole !== "TENANT" && session.activeRole !== "OWNER") {
    return 0;
  }

  await connectDB();

  const isTenant = session.activeRole === "TENANT";
  const result = isTenant
    ? await Conversation.aggregate<{ _id: unknown; total: number }>([
        { $match: { tenantId: session.userId } },
        { $group: { _id: null, total: { $sum: "$tenantUnread" } } },
      ])
    : await Conversation.aggregate<{ _id: unknown; total: number }>([
        { $match: { ownerId: session.userId } },
        { $group: { _id: null, total: { $sum: "$ownerUnread" } } },
      ]);

  return result[0]?.total ?? 0;
}
