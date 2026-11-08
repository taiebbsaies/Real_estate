import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

const DASHBOARDS: Record<string, string> = {
  TENANT: "/dashboard/tenant",
  OWNER: "/dashboard/owner",
  TECHNICIAN: "/dashboard/technician",
  ADMIN: "/dashboard/admin",
};

// The mobile navigation is the same for every role: this sends each user to their own dashboard.
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/dashboard");
  redirect(DASHBOARDS[session.activeRole] ?? "/");
}
