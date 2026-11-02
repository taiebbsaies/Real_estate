import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  PROPERTY_AVAILABILITIES,
  PROPERTY_CONDITIONS,
  PROPERTY_EQUIPMENTS,
  PROPERTY_MODERATION_STATUSES,
  PROPERTY_TYPES,
  type PropertyAvailability,
  type PropertyCondition,
  type PropertyEquipment,
  type PropertyModerationStatus,
  type PropertyType,
} from "@/lib/constants/property";

export type {
  PropertyAvailability,
  PropertyCondition,
  PropertyEquipment,
  PropertyModerationStatus,
  PropertyType,
} from "@/lib/constants/property";

export interface IProperty {
  ownerId: Types.ObjectId;
  title: string;
  description: string;
  /** Monthly rent in Tunisian dinars (DT). */
  price: number;
  city: string;
  zone?: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Living surface in square meters. */
  surface: number;
  bedrooms?: number;
  bathrooms?: number;
  type: PropertyType;
  condition: PropertyCondition;
  availability: PropertyAvailability;
  availableFrom?: Date;
  hasParking: boolean;
  hasElevator: boolean;
  /** Normalized list of selected equipment keys (parking, elevator, air_conditioning, ...). */
  equipments: PropertyEquipment[];
  /** Ordered list of image URLs (array order = display order). */
  images: string[];
  /** Cover image URL, falls back to the first image when absent. */
  coverImage?: string;
  rules?: string;
  moderationStatus: PropertyModerationStatus;
  moderationReason?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    price: {
      type: Number,
      required: true,
      min: [1, "Le loyer doit être supérieur à 0 DT."],
      max: [100000, "Le loyer ne doit pas dépasser 100 000 DT."],
    },

    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    zone: {
      type: String,
      trim: true,
      maxlength: 60,
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    latitude: {
      type: Number,
      required: true,
      min: [-90, "La latitude doit être comprise entre -90 et 90."],
      max: [90, "La latitude doit être comprise entre -90 et 90."],
    },

    longitude: {
      type: Number,
      required: true,
      min: [-180, "La longitude doit être comprise entre -180 et 180."],
      max: [180, "La longitude doit être comprise entre -180 et 180."],
    },

    surface: {
      type: Number,
      required: true,
      min: [1, "La surface doit être supérieure à 0 m²."],
      max: [20000, "La surface ne doit pas dépasser 20 000 m²."],
    },

    bedrooms: {
      type: Number,
      min: [0, "Le nombre de chambres ne peut pas être négatif."],
      max: [8, "Le nombre de chambres ne peut pas dépasser 8."],
    },

    bathrooms: {
      type: Number,
      min: [0, "Le nombre de salles de bain ne peut pas être négatif."],
      max: [8, "Le nombre de salles de bain ne peut pas dépasser 8."],
    },

    type: {
      type: String,
      enum: PROPERTY_TYPES,
      required: true,
    },

    condition: {
      type: String,
      enum: PROPERTY_CONDITIONS,
      required: true,
    },

    availability: {
      type: String,
      enum: PROPERTY_AVAILABILITIES,
      required: true,
      default: "available",
    },

    availableFrom: {
      type: Date,
    },

    hasParking: {
      type: Boolean,
      default: false,
    },

    hasElevator: {
      type: Boolean,
      default: false,
    },

    equipments: {
      type: [
        {
          type: String,
          enum: PROPERTY_EQUIPMENTS,
        },
      ],
      default: [],
    },

    images: {
      type: [String],
      default: [],
    },

    coverImage: {
      type: String,
      default: undefined,
    },

    rules: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    moderationStatus: {
      type: String,
      enum: PROPERTY_MODERATION_STATUSES,
      required: true,
      default: "pending",
    },

    moderationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    deletedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Owner workspace: their own listings, newest first, with the moderation flag.
PropertySchema.index({ ownerId: 1, moderationStatus: 1, createdAt: -1 });
// Public listing search: moderation gate + availability + price sorting.
PropertySchema.index({ moderationStatus: 1, availability: 1, price: 1 });
// Browse by property type within a city.
PropertySchema.index({ type: 1, city: 1, price: 1 });

const Property: Model<IProperty> =
  (mongoose.models.Property as Model<IProperty>) ||
  mongoose.model<IProperty>("Property", PropertySchema);

export default Property;
