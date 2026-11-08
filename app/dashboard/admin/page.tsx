import Link from "next/link";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { TechnicianProfileModel, UserModel } from "@/src/models/shared";
import { OPEN_REQUEST_STATUSES, STUCK_AFTER_DAYS, stuckCutoffDate } from "@/lib/admin/rules";
import { cardClass, headingClass, mutedClass } from "./_components/styles";
import { requireAdminPage } from "./_components/guard";

function Stat({ label, value, href, alert }: { label: string; value: number; href: string; alert?: boolean }) {
  return (
    <Link href={href} className={`${cardClass} block p-5 hover:border-[#166534] dark:hover:border-emerald-400`}>
      <p className={mutedClass}>{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          alert && value > 0 ? "text-red-700 dark:text-red-400" : "text-[#1F2937] dark:text-zinc-50"
        }`}
      >
        {value}
      </p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  await requireAdminPage();
  await connectDB();

  const cutoff = stuckCutoffDate();
  const open = { status: { $in: OPEN_REQUEST_STATUSES } };
  const existing = { deletedAt: { $exists: false } };

  const [tenants, owners, technicians, suspended, openRequests, urgent, unassigned, stuck, pending, incomplete] =
    await Promise.all([
      UserModel.countDocuments({ ...existing, roles: "TENANT" }),
      UserModel.countDocuments({ ...existing, roles: "OWNER" }),
      UserModel.countDocuments({ ...existing, roles: "TECHNICIAN" }),
      UserModel.countDocuments({ ...existing, suspendedAt: { $exists: true } }),
      MaintenanceRequestModel.countDocuments(open),
      MaintenanceRequestModel.countDocuments({ ...open, priority: "URGENTE" }),
      MaintenanceRequestModel.countDocuments({ status: "ACCEPTEE" }),
      MaintenanceRequestModel.countDocuments({ ...open, updatedAt: { $lt: cutoff } }),
      TechnicianProfileModel.countDocuments({ verificationStatus: "PENDING" }),
      TechnicianProfileModel.countDocuments({
        $or: [{ skills: { $size: 0 } }, { city: { $exists: false } }],
      }),
    ]);

  return (
    <>
      <h1 className={headingClass}>Aperçu</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#1F2937] dark:text-zinc-100">À traiter</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Techniciens à valider" value={pending} href="/dashboard/admin/technicians?status=PENDING" alert />
          <Stat label="Demandes urgentes" value={urgent} href="/dashboard/admin/maintenance?priority=URGENTE" alert />
          <Stat label="Demandes sans technicien" value={unassigned} href="/dashboard/admin/maintenance?status=ACCEPTEE" alert />
          <Stat label={`Bloquées depuis ${STUCK_AFTER_DAYS} jours`} value={stuck} href="/dashboard/admin/maintenance?stuck=1" alert />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#1F2937] dark:text-zinc-100">Plateforme</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat label="Locataires" value={tenants} href="/dashboard/admin/users?role=TENANT" />
          <Stat label="Propriétaires" value={owners} href="/dashboard/admin/users?role=OWNER" />
          <Stat label="Techniciens" value={technicians} href="/dashboard/admin/technicians" />
          <Stat label="Comptes suspendus" value={suspended} href="/dashboard/admin/users?status=suspended" />
          <Stat label="Demandes ouvertes" value={openRequests} href="/dashboard/admin/maintenance" />
          <Stat label="Profils techniciens incomplets" value={incomplete} href="/dashboard/admin/technicians" />
        </div>
      </section>
    </>
  );
}
