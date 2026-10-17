"use server";

import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { signUpSchema } from "@/lib/validations/auth";

export type SignUpState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function signUp(
  _previousState: SignUpState | null,
  formData: FormData,
): Promise<SignUpState> {
  const rawData = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signUpSchema.safeParse(rawData);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;

    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: Object.fromEntries(
        Object.entries(errors).filter(
          (entry): entry is [string, string[]] => entry[1] !== undefined,
        ),
      ),
    };
  }

  try {
    await connectDB();

    const existingUser = await User.findOne({
      email: parsed.data.email,
    }).lean();

    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists.",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await User.create({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      passwordHash,
      roles: ["TENANT"],
      activeRole: "TENANT",
    });

    return {
      success: true,
      message: "Your account has been created successfully.",
    };
  } catch (error: unknown) {
    // A unique-index conflict can occur if two requests race.
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

    console.error("Sign-up failed:", error);

    return {
      success: false,
      message: "Unable to create your account. Please try again.",
    };
  }
}
