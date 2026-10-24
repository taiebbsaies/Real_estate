import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IOwnerProfile {
  userId: Types.ObjectId;
  companyName?: string;
  isProfessional: boolean;
  taxNumber?: string;
  totalProperties: number;
  verifiedOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OwnerProfileSchema = new Schema<IOwnerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: { type: String, trim: true },
    isProfessional: { type: Boolean, default: false },
    taxNumber: { type: String, trim: true },
    totalProperties: { type: Number, default: 0, min: 0 },
    verifiedOwner: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const OwnerProfile: Model<IOwnerProfile> =
  (mongoose.models.OwnerProfile as Model<IOwnerProfile>) ||
  mongoose.model<IOwnerProfile>("OwnerProfile", OwnerProfileSchema);

export default OwnerProfile;
