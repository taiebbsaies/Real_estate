import { connectDB } from "@/lib/mongodb";
import { USER_ROLES } from "@/lib/constants/user";
import User from "@/models/user";

class PromoteAdminError extends Error {}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new PromoteAdminError(
      "Exécution refusée : ce script ne peut pas tourner en production.",
    );
  }

  const emailArgument = process.argv[2];
  if (!emailArgument?.trim()) {
    throw new PromoteAdminError(
      "Veuillez fournir l'adresse e-mail de l'administrateur.",
    );
  }

  const normalizedEmail = emailArgument.trim().toLowerCase();
  const adminRole = USER_ROLES.find((role) => role === "ADMIN");
  if (!adminRole) {
    throw new Error("ADMIN role is missing from USER_ROLES.");
  }

  const mongoose = await connectDB();

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $addToSet: { roles: adminRole },
        $set: { activeRole: adminRole },
      },
      { new: true },
    )
      .select("roles")
      .lean();

    if (!updatedUser) {
      throw new PromoteAdminError(
        `Compte introuvable pour l'adresse « ${normalizedEmail} ».`,
      );
    }

    console.log(`Email : ${normalizedEmail}`);
    console.log(`Rôles : ${updatedUser.roles.join(", ")}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof PromoteAdminError) {
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.name : "UnknownError");
  }
  process.exitCode = 1;
});
