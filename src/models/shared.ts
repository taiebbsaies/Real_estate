import mongoose, { Schema, type Document, type Types } from "mongoose";
import { getOrCreateModel } from "@/src/lib/model";
import { USER_ROLES, type UserRole } from "@/lib/constants/user";

// Canonical User model — shared by signup layer and maintenance module
export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  avatarUrl?: string;
  roles: UserRole[];
  activeRole?: UserRole;
  // Audit fields (populated by signup layer)
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  suspendedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, select: false },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    roles: {
      type: [{ type: String, enum: USER_ROLES }],
      required: true,
      default: ["TENANT"],
      validate: {
        validator: (roles: UserRole[]) =>
          roles.length > 0 && new Set(roles).size === roles.length,
        message: "Roles must be non-empty and unique",
      },
    },
    activeRole: { type: String, enum: USER_ROLES },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
    suspendedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

UserSchema.pre("validate", function () {
  if (this.activeRole && !this.roles.includes(this.activeRole)) {
    this.invalidate("activeRole", "The active role must be assigned to this user.");
  }
});

export const UserModel = getOrCreateModel<IUser>("User", UserSchema);

// Technician Profile with GeoJSON location for proximity matching
export type TechnicianVerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ITechnicianProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  skills: string[]; // Category slugs (e.g., "plomberie", "electricite")
  isAvailable: boolean;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  city?: string;
  address: string;
  phone?: string;
  yearsExperience?: number;
  verificationStatus: TechnicianVerificationStatus;
  averageRating: number;
  completedInterventionsCount: number;
  hourlyRateDT?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianProfileSchema = new Schema<ITechnicianProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [10.1815, 36.8065], // Default Tunis [lng, lat]
      },
    },
    city: { type: String, trim: true },
    address: { type: String, default: "Tunis, Tunisie" },
    phone: { type: String },
    yearsExperience: { type: Number, min: 0 },
    // Signup stores PENDING explicitly. The default keeps technicians registered before verification existed approved.
    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED",
      index: true,
    },
    averageRating: { type: Number, default: 5.0, min: 1, max: 5 },
    completedInterventionsCount: { type: Number, default: 0 },
    hourlyRateDT: { type: Number, default: 45 },
  },
  { timestamps: true }
);

TechnicianProfileSchema.index({ location: "2dsphere" });

export const TechnicianProfileModel = getOrCreateModel<ITechnicianProfile>(
  "TechnicianProfile",
  TechnicianProfileSchema
);

// Property Stub
export interface IProperty extends Document {
  _id: Types.ObjectId;
  title: string;
  address: string;
  city: string;
  postalCode: string;
  ownerId: Types.ObjectId;
  tenantId?: Types.ObjectId;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    title: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, default: "Tunis" },
    postalCode: { type: String, default: "1000" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "User" },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [10.1815, 36.8065],
      },
    },
  },
  { timestamps: true }
);

export const PropertyModel = getOrCreateModel<IProperty>("Property", PropertySchema);

// Equipment Stub
export interface IEquipment extends Document {
  _id: Types.ObjectId;
  propertyId: Types.ObjectId;
  name: string;
  category: string;
  brand?: string;
  serialNumber?: string;
  installedAt?: Date;
  condition: "EXCELLENT" | "BON" | "MOYEN" | "MAUVAIS";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    brand: { type: String },
    serialNumber: { type: String },
    installedAt: { type: Date, default: Date.now },
    condition: {
      type: String,
      enum: ["EXCELLENT", "BON", "MOYEN", "MAUVAIS"],
      default: "BON",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export const EquipmentModel = getOrCreateModel<IEquipment>("Equipment", EquipmentSchema);

// Notification Model
export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: "MAINTENANCE" | "ASSIGNMENT" | "INTERVENTION" | "SYSTEM";
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["MAINTENANCE", "ASSIGNMENT", "INTERVENTION", "SYSTEM"],
      default: "MAINTENANCE",
    },
    link: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NotificationModel = getOrCreateModel<INotification>("Notification", NotificationSchema);

// Review Model
export interface IReview extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  technicianId: Types.ObjectId;
  tenantId: Types.ObjectId;
  rating: number; // 1 to 5
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "MaintenanceRequest", required: true, unique: true },
    technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ReviewModel = getOrCreateModel<IReview>("Review", ReviewSchema);
