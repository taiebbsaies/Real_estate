import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export const MESSAGE_SENDER_ROLES = ["TENANT", "OWNER"] as const;
export type MessageSenderRole = (typeof MESSAGE_SENDER_ROLES)[number];

export interface IMessage {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: MessageSenderRole;
  body: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: MESSAGE_SENDER_ROLES,
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
