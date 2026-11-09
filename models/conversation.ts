import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IConversation {
  propertyId: Types.ObjectId;
  tenantId: Types.ObjectId;
  ownerId: Types.ObjectId;
  lastMessageAt: Date;
  lastMessagePreview: string;
  tenantUnread: number;
  ownerUnread: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessageAt: {
      type: Date,
      required: true,
    },
    lastMessagePreview: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    tenantUnread: {
      type: Number,
      default: 0,
      min: 0,
    },
    ownerUnread: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// One conversation per tenant per listing.
ConversationSchema.index({ propertyId: 1, tenantId: 1 }, { unique: true });
ConversationSchema.index({ ownerId: 1, lastMessageAt: -1 });
ConversationSchema.index({ tenantId: 1, lastMessageAt: -1 });

const Conversation: Model<IConversation> =
  (mongoose.models.Conversation as Model<IConversation>) ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
