import "server-only";

// TODO(auth): sera remplacée par getCurrentUser() du module auth.
// Tout le module budget passe par getUserId() : un seul fichier à modifier au branchement.
export async function getUserId(): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Le module budget n'est pas encore branché sur le module auth.",
    );
  }

  const userId = process.env.BUDGET_DEV_USER_ID;

  if (!userId) {
    throw new Error(
      "Définissez BUDGET_DEV_USER_ID dans .env.local pour développer le module budget.",
    );
  }

  return userId;
}
