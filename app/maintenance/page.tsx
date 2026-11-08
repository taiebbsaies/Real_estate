import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { MaintenanceDashboard } from "./MaintenanceDashboard";

export const dynamic = "force-dynamic";

export default async function MaintenanceDashboardPage() {
  const session = await auth();

  if (!session.user) {
    redirect("/login?callbackUrl=/maintenance");
  }

  // The view (tenant / owner / technician / admin) comes from the signed-in user's role.
  return <MaintenanceDashboard role={session.user.role} />;
}
