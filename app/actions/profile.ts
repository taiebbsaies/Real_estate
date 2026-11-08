"use server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { TechnicianProfileModel } from "@/src/models/shared";
import { parseTechnicianDetails, type TechnicianDetails } from "@/lib/validations/technician";
import { getGovernorateCoordinates } from "@/lib/constants/technician";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export type ProfileState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
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

    // The role comes from the database: a form field or a stale session cannot grant it.
    let technicianDetails: TechnicianDetails | null = null;
    if (user.roles.includes("TECHNICIAN")) {
      const parsed = parseTechnicianDetails(formData);
      if (!parsed.success) {
        return {
          success: false,
          message: "Veuillez corriger les champs indiqués.",
          errors: Object.fromEntries(
            Object.entries(parsed.error.flatten().fieldErrors).filter(
              (entry): entry is [string, string[]] => entry[1] !== undefined,
            ),
          ),
        };
      }
      technicianDetails = parsed.data;
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

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || "");
      if (!isMatch) {
        return {
          success: false,
          message: "Mot de passe actuel incorrect.",
        };
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    if (technicianDetails) {
      // Technicians created before this form existed may not have a profile yet.
      const profile =
        (await TechnicianProfileModel.findOne({ userId: user._id })) ??
        new TechnicianProfileModel({ userId: user._id, verificationStatus: "PENDING" });

      profile.skills = technicianDetails.skills;
      profile.city = technicianDetails.city;
      profile.address = technicianDetails.address || technicianDetails.city;
      profile.phone = technicianDetails.phone;
      profile.yearsExperience = technicianDetails.yearsExperience;
      profile.hourlyRateDT = technicianDetails.hourlyRateDT;
      profile.isAvailable = technicianDetails.isAvailable;
      profile.location = {
        type: "Point",
        coordinates:
          getGovernorateCoordinates(technicianDetails.city) ?? profile.location.coordinates,
      };
      await profile.save();
    }

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
