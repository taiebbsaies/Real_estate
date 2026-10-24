import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export const TECHNICIAN_SPECIALTIES = [
  "PLUMBING", // Plomberie
  "ELECTRICAL", // Électricité
  "PAINTING", // Peinture
  "HVAC", // Climatisation / Chauffage
  "LOCKSMITH", // Serrurerie
  "MASONRY", // Maçonnerie / Carrelage
  "GENERAL_MAINTENANCE", // Maintenance générale
] as const;

export type TechnicianSpecialty = (typeof TECHNICIAN_SPECIALTIES)[number];

export interface ITechnicianProfile {
  userId: Types.ObjectId;
  specialties: TechnicianSpecialty[];
  coverageZones: string[]; // Cities or postal areas
  hourlyRate?: number;
  available: boolean;
  yearsExperience?: number;
  ratingAverage: number;
  ratingCount: number;
  completedInterventionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianProfileSchema = new Schema<ITechnicianProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialties: {
      type: [String],
      enum: TECHNICIAN_SPECIALTIES,
      required: true,
      default: ["GENERAL_MAINTENANCE"],
    },
    coverageZones: {
      type: [String],
      default: [],
    },
    hourlyRate: {
      type: Number,
      min: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },
    yearsExperience: {
      type: Number,
      min: 0,
      default: 0,
    },
    ratingAverage: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedInterventionsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true, versionKey: false }
);

const TechnicianProfile: Model<ITechnicianProfile> =
  (mongoose.models.TechnicianProfile as Model<ITechnicianProfile>) ||
  mongoose.model<ITechnicianProfile>("TechnicianProfile", TechnicianProfileSchema);

export default TechnicianProfile;
