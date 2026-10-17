import "server-only";
import mongoose, { Schema, type Model } from "mongoose";
import { USER_ROLES, type UserRole } from "@/lib/constants/user";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  avatarUrl?: string;

  roles: UserRole[];
  activeRole?: UserRole;

  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
    },

    avatarUrl: {
      type: String,
    },

    roles: {
      type: [
        {
          type: String,
          enum: USER_ROLES,
        },
      ],
      required: true,
      default: ["TENANT"],
      validate: {
        validator: (roles: UserRole[]) =>
          roles.length > 0 && new Set(roles).size === roles.length,
        message: "Roles must be non-empty and unique",
      },
    },

    activeRole: {
      type: String,
      enum: USER_ROLES,
    },

    emailVerifiedAt: {
      type: Date,
    },

    lastLoginAt: {
      type: Date,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

UserSchema.pre("validate", function () {
  if (this.activeRole && !this.roles.includes(this.activeRole)) {
    this.invalidate(
      "activeRole",
      "The active role must be assigned to this user.",
    );
  }
});

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
