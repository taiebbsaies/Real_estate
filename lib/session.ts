import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/constants/user";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/src/models/shared";

export const SESSION_COOKIE_NAME = "homecheck_session";
const SESSION_EXPIRATION = "7d";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  activeRole: UserRole;
  [key: string]: unknown;
};

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "default_homecheck_jwt_secret_dev_32chars_min_2026";

  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT token with session payload
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  // Ensure the payload is a plain cloneable JavaScript object (stripping Mongoose document proxies/CoreMongooseArray)
  const plainPayload = JSON.parse(JSON.stringify(payload));

  return await new SignJWT(plainPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(getJwtSecret());
}

/**
 * Verify and decode session JWT token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Store session in HTTP-only, Secure cookie
 */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Retrieve current user session from request cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session) return null;

  // The cookie stays valid for days, so a suspension has to be checked against the database.
  return (await isAccountBlocked(session.userId)) ? null : session;
}

async function isAccountBlocked(userId: string): Promise<boolean> {
  try {
    await connectDB();
    const user = await UserModel.findById(userId).select("suspendedAt deletedAt").lean();
    return Boolean(user?.suspendedAt || user?.deletedAt);
  } catch (error) {
    // A database outage must not log everyone out: pages reading data will report it themselves.
    console.error("[SESSION] Account status lookup failed:", error);
    return false;
  }
}

/**
 * Destroy user session (logout)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
