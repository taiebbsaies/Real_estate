"use server";

import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { signUpSchema, loginSchema } from "@/lib/validations/auth";
import type { UserRole } from "@/lib/constants/user";

export type SignUpState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export type LoginState = {
  success: boolean;
  message: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  errors?: Record<string, string[]>;
};

export async function signUp(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const rawData = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: formData.get("role") || "TENANT",
  };

  const parsed = signUpSchema.safeParse(rawData);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: Object.fromEntries(
        Object.entries(fieldErrors).filter(
          (entry): entry is [string, string[]] => entry[1] !== undefined,
        ),
      ),
    };
  }

  try {
    await connectDB();

    const existingUser = await User.findOne({
      email: parsed.data.email,
    })
      .select("_id")
      .lean();

    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists.",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const chosenRole = (parsed.data.role as UserRole) || "TENANT";

    const createdUser = await User.create({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      passwordHash,
      roles: [chosenRole],
      activeRole: chosenRole,
    });

    // Initialize corresponding profile
    if (chosenRole === "TENANT") {
      const TenantProfile = (await import("@/models/tenantProfile")).default;
      await TenantProfile.create({ userId: createdUser._id });
    } else if (chosenRole === "OWNER") {
      const OwnerProfile = (await import("@/models/ownerProfile")).default;
      await OwnerProfile.create({ userId: createdUser._id });
    } else if (chosenRole === "TECHNICIAN") {
      const TechnicianProfile = (await import("@/models/technicianProfile")).default;
      await TechnicianProfile.create({ userId: createdUser._id });
    }

    return {
      success: true,
      message: "Your account has been created successfully. You can now sign in.",
    };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return {
        success: false,
        message: "An account with this email already exists.",
      };
    }

    console.error("[SIGNUP] Unexpected registration error:", error);

    return {
      success: false,
      message: "Unable to create your account. Please try again.",
    };
  }
}

import { setSessionCookie, clearSessionCookie } from "@/lib/session";

export async function signOut() {
  await clearSessionCookie();
}

export async function signIn(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Please fill in all required fields.",
      errors: Object.fromEntries(
        Object.entries(fieldErrors).filter(
          (entry): entry is [string, string[]] => entry[1] !== undefined,
        ),
      ),
    };
  }

  try {
    await connectDB();

    const user = await User.findOne({
      email: parsed.data.email,
    }).select("+passwordHash");

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    const isValidPassword = await bcrypt.compare(
      parsed.data.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    const activeRole = user.activeRole || user.roles[0] || "TENANT";

    // Set secure JWT session cookie
    await setSessionCookie({
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [...user.roles],
      activeRole,
    });

    return {
      success: true,
      message: `Welcome back, ${user.firstName}!`,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: activeRole,
      },
    };
  } catch (error) {
    console.error("[LOGIN] Authentication error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

