import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ITenantProfile {
  userId: Types.ObjectId;
  budgetMin?: number;
  budgetMax?: number;
  preferredCities: string[];
  preferredPropertyTypes: string[];
  minBedrooms?: number;
  requireParking?: boolean;
  requireElevator?: boolean;
  maxDistanceKm?: number;
  savedFavorites: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TenantProfileSchema = new Schema<ITenantProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    preferredCities: { type: [String], default: [] },
    preferredPropertyTypes: { type: [String], default: [] },
    minBedrooms: { type: Number, min: 0 },
    requireParking: { type: Boolean, default: false },
    requireElevator: { type: Boolean, default: false },
    maxDistanceKm: { type: Number, min: 0 },
    savedFavorites: [{ type: Schema.Types.ObjectId, ref: "Property" }],
  },
  { timestamps: true, versionKey: false }
);

const TenantProfile: Model<ITenantProfile> =
  (mongoose.models.TenantProfile as Model<ITenantProfile>) ||
  mongoose.model<ITenantProfile>("TenantProfile", TenantProfileSchema);

export default TenantProfile;
