import { type UserRole } from "@/lib/constants/user";
import { UserModel, type IUser } from "@/src/models/shared";
import connectDB from "@/src/lib/mongoose";
import { getSession } from "@/lib/session";

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: AuthUser;
}

/**
 * Resolves strictly the currently authenticated user from the active session.
 */
export async function auth(): Promise<AuthSession> {
  const session = await getSession();

  if (!session || !session.userId) {
    return {
      user: null as any,
    };
  }

  const role = (session.activeRole || session.roles?.[0] || "TENANT") as UserRole;

  try {
    await connectDB();
    const dbUser = (await UserModel.findById(session.userId).lean()) as (IUser & {
      _id: { toString(): string };
    }) | null;

    if (dbUser) {
      return {
        user: {
          id: dbUser._id.toString(),
          role: dbUser.activeRole || role,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          avatarUrl: dbUser.avatarUrl,
        },
      };
    }
  } catch (error) {
    console.error("[AUTH] Database lookup error:", error);
  }

  return {
    user: {
      id: session.userId,
      role,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
    },
  };
}
