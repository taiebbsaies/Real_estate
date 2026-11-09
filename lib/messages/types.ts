import type { PropertyType } from "@/lib/constants/property";

export type MessageSenderRole = "TENANT" | "OWNER";

export type ChatMessage = {
  id: string;
  senderRole: MessageSenderRole;
  body: string;
  createdAt: string;
  isMine: boolean;
};

export type ConversationSummary = {
  _id: string;
  propertyId: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  tenantUnread: number;
  ownerUnread: number;
  createdAt: string;
  updatedAt: string;
  propertyTitle: string;
  propertyCity: string;
  propertyType: PropertyType | null;
  propertyCoverImage: string | null;
  isListingDeleted: boolean;
  counterpartName: string;
  unread: number;
};

export type ConversationActionState = {
  success: boolean;
  message: string;
  conversationId?: string;
  messageId?: string;
  createdAt?: string;
};
