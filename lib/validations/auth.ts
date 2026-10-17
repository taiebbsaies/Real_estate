import { z } from "zod";

export const signUpSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must contain at least 2 characters")
      .max(80, "First name is too long"),

    lastName: z
      .string()
      .trim()
      .min(2, "Last name must contain at least 2 characters")
      .max(80, "Last name is too long"),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254)
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .max(72, "Password must not exceed 72 characters"),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
