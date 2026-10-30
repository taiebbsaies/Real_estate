import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/constants/user";

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
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "La variable d'environnement JWT_SECRET est manquante. Définissez-la dans .env.local (voir .env.example).",
    );
  }

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

  return await verifySessionToken(token);
}

/**
 * Destroy user session (logout)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
