import "server-only";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

export async function getUserId(): Promise<string> {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/budget");
  }

  return session.userId;
}
