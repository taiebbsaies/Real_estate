import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";

/** The proxy only reads the role stored in the session cookie: pages check the database as well. */
export async function requireAdminPage() {
  const { user } = await auth();
  if (!user) redirect("/login?callbackUrl=/dashboard/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
