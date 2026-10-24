"use server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export type ProfileState = {
  success: boolean;
  message: string;
};

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Vous devez être connecté." };
  }

  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const currentPassword = formData.get("currentPassword")?.toString();
  const newPassword = formData.get("newPassword")?.toString();

  if (!firstName || !lastName) {
    return { success: false, message: "Le prénom et le nom sont requis." };
  }

  try {
    await connectDB();

    const user = await User.findById(session.userId).select("+passwordHash");
    if (!user) {
      return { success: false, message: "Utilisateur non trouvé." };
    }

    user.firstName = firstName;
    user.lastName = lastName;
    if (phone !== undefined) {
      user.phone = phone;
    }

    // Password change request
    if (newPassword && newPassword.length >= 8) {
      if (!currentPassword) {
        return {
          success: false,
          message: "Veuillez fournir votre mot de passe actuel pour changer de mot de passe.",
        };
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return {
          success: false,
          message: "Mot de passe actuel incorrect.",
        };
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await user.save();
    revalidatePath("/profile");

    return {
      success: true,
      message: "Profil mis à jour avec succès !",
    };
  } catch (error) {
    console.error("[PROFILE] Update error:", error);
    return {
      success: false,
      message: "Erreur lors de la mise à jour du profil.",
    };
  }
}
