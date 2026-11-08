import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { PropertiesManager } from "./PropertiesManager";

export const dynamic = "force-dynamic";

export default async function MaintenancePropertiesPage() {
  const { user } = await auth();

  if (!user) {
    redirect("/login?callbackUrl=/maintenance/properties");
  }

  // Only owners (for their own properties) and admins manage who lives where
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect("/maintenance");
  }

  return <PropertiesManager isAdmin={user.role === "ADMIN"} />;
}
