import { cookies, headers } from "next/headers";
import { type ActorRole } from "@/src/modules/maintenance/constants";
import { type UserRole } from "@/lib/constants/user";
import { UserModel, type IUser } from "@/src/models/shared";
import connectDB from "@/src/lib/mongoose";

export interface AuthUser {
  id: string;
  /** Active role for this session. Never "SYSTEM" — that is an internal actor only. */
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: AuthUser;
}

// Fallback mock accounts if DB is empty or during early bootstrap
export const DEFAULT_DEMO_USERS: Record<Exclude<ActorRole, "SYSTEM">, AuthUser> = {
  TENANT: {
    id: "660000000000000000000001",
    role: "TENANT",
    email: "youssef.locataire@homecheck.tn",
    firstName: "Youssef",
    lastName: "Trabelsi",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
  },
  OWNER: {
    id: "660000000000000000000002",
    role: "OWNER",
    email: "sarah.proprietaire@homecheck.tn",
    firstName: "Sarah",
    lastName: "Ben Ali",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
  },
  TECHNICIAN: {
    id: "660000000000000000000003",
    role: "TECHNICIAN",
    email: "ahmed.plombier@homecheck.tn",
    firstName: "Ahmed",
    lastName: "Gharbi",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  ADMIN: {
    id: "660000000000000000000004",
    role: "ADMIN",
    email: "admin@homecheck.tn",
    firstName: "Admin",
    lastName: "HomeCheck",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  },
};

/**
 * Resolves current authenticated user with cookie or header override.
 * Perfect for evaluation defense and rapid role switching.
 */
export async function auth(): Promise<AuthSession> {
  let targetRole: UserRole = "TENANT";
  let targetUserId: string | null = null;

  const VALID_USER_ROLES: readonly string[] = ["TENANT", "OWNER", "TECHNICIAN", "ADMIN"];

  try {
    const cookieStore = await cookies();
    const cookieRole = cookieStore.get("homecheck_role")?.value;
    const cookieUserId = cookieStore.get("homecheck_user_id")?.value;

    if (cookieRole && VALID_USER_ROLES.includes(cookieRole)) {
      targetRole = cookieRole as UserRole;
    }
    if (cookieUserId) {
      targetUserId = cookieUserId;
    }
  } catch {
    // In environments where cookies() might not be available
  }

  try {
    const headerStore = await headers();
    const headerRole = headerStore.get("x-user-role");
    const headerUserId = headerStore.get("x-user-id");

    if (headerRole && VALID_USER_ROLES.includes(headerRole)) {
      targetRole = headerRole as UserRole;
    }
    if (headerUserId) {
      targetUserId = headerUserId;
    }
  } catch {
    // In environments where headers() might not be available
  }

  // Attempt to fetch matching user from database if available
  try {
    await connectDB();
    let dbUser: (IUser & { _id: { toString(): string } }) | null = null;

    if (targetUserId) {
      dbUser = await UserModel.findById(targetUserId).lean() as unknown as (IUser & { _id: { toString(): string } }) | null;
    }

    if (!dbUser && targetRole) {
      dbUser = await UserModel.findOne({
        roles: targetRole,
      }).lean() as unknown as (IUser & { _id: { toString(): string } }) | null;
    }

    if (dbUser) {
      return {
        user: {
          id: dbUser._id.toString(),
          role: targetRole,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          avatarUrl: dbUser.avatarUrl,
        },
      };
    }
  } catch {
    // DB lookup failed or not connected yet; fall back to static demo user
  }

  const fallback = DEFAULT_DEMO_USERS[targetRole as Exclude<ActorRole, "SYSTEM">] || DEFAULT_DEMO_USERS.TENANT;
  return {
    user: {
      ...fallback,
      id: targetUserId || fallback.id,
    },
  };
}
