import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  await connectDB();
  const dbUser = await User.findById(session.userId).lean();

  if (!dbUser) {
    redirect("/login");
  }

  const roleDashboardMap: Record<string, string> = {
    TENANT: "/dashboard/tenant",
    OWNER: "/dashboard/owner",
    TECHNICIAN: "/dashboard/technician",
  };

  const dashboardUrl = roleDashboardMap[session.activeRole] || "/";

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-blue-600 dark:text-blue-400">
              HomeCheck
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Paramètres du compte
            </span>
          </div>

          <Link
            href={dashboardUrl}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Accéder à mon tableau de bord
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Mon Profil
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Gérez vos informations personnelles et identifiants de sécurité.
            </p>
          </div>

          <ProfileForm
            user={{
              firstName: dbUser.firstName,
              lastName: dbUser.lastName,
              email: dbUser.email,
              phone: dbUser.phone,
              role: session.activeRole,
            }}
          />
        </div>
      </main>
    </div>
  );
}
