import connectDB from "@/src/lib/mongoose";
import { TechnicianProfileModel, UserModel } from "@/src/models/shared";
import { setTechnicianVerification } from "@/app/actions/admin";
import { ADMIN_PAGE_SIZE, parsePage, TECHNICIAN_VERIFICATION_LABELS } from "@/lib/admin/rules";
import { TECHNICIAN_SKILLS } from "@/lib/constants/technician";
import AdminActionButton from "../_components/AdminActionButton";
import Pager from "../_components/Pager";
import { requireAdminPage } from "../_components/guard";
import {
  badgeClass,
  buttonClass,
  cardClass,
  dangerButtonClass,
  headingClass,
  inputClass,
  mutedClass,
  secondaryButtonClass,
  tableClass,
  tdClass,
  thClass,
} from "../_components/styles";

const STATUS_BADGES = {
  PENDING: badgeClass.warning,
  APPROVED: badgeClass.success,
  REJECTED: badgeClass.danger,
};

type SearchParams = { status?: string; page?: string };

export default async function AdminTechniciansPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const params = await searchParams;
  const page = parsePage(params.page);

  // Technicians registered before verification existed have no stored status: they count as approved.
  const filter: Record<string, unknown> = {};
  if (params.status === "PENDING" || params.status === "REJECTED") filter.verificationStatus = params.status;
  if (params.status === "APPROVED") filter.verificationStatus = { $nin: ["PENDING", "REJECTED"] };

  await connectDB();
  const [profiles, total] = await Promise.all([
    TechnicianProfileModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean(),
    TechnicianProfileModel.countDocuments(filter),
  ]);
  const users = await UserModel.find({ _id: { $in: profiles.map((profile) => profile.userId) } })
    .select("firstName lastName email phone suspendedAt")
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  return (
    <>
      <h1 className={headingClass}>Techniciens</h1>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={params.status ?? ""} aria-label="Validation" className={inputClass}>
          <option value="">Toutes les validations</option>
          {Object.entries(TECHNICIAN_VERIFICATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Technicien</th>
              <th className={thClass}>Spécialités</th>
              <th className={thClass}>Localisation</th>
              <th className={thClass}>Activité</th>
              <th className={thClass}>Validation</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const userId = String(profile.userId);
              const user = usersById.get(userId);
              const status = profile.verificationStatus ?? "APPROVED";
              const incomplete = !profile.city || profile.skills.length === 0;

              return (
                <tr key={String(profile._id)}>
                  <td className={tdClass}>
                    <p className="font-medium">{user ? `${user.firstName} ${user.lastName}` : "Compte introuvable"}</p>
                    <p className={mutedClass}>{user?.email}</p>
                    <p className={mutedClass}>{user?.phone ?? profile.phone}</p>
                  </td>
                  <td className={tdClass}>
                    {profile.skills.length > 0
                      ? profile.skills
                          .map((skill) => TECHNICIAN_SKILLS.find((item) => item.value === skill)?.label ?? skill)
                          .join(", ")
                      : "Non renseignées"}
                  </td>
                  <td className={tdClass}>
                    <p>{profile.city ?? "Non renseignée"}</p>
                    <p className={mutedClass}>{profile.address}</p>
                  </td>
                  <td className={tdClass}>
                    <p>{profile.isAvailable ? "Disponible" : "Indisponible"}</p>
                    <p className={mutedClass}>
                      Note {profile.averageRating} · {profile.completedInterventionsCount} interventions
                    </p>
                  </td>
                  <td className={`${tdClass} space-y-1`}>
                    <span className={STATUS_BADGES[status]}>{TECHNICIAN_VERIFICATION_LABELS[status]}</span>
                    {incomplete && (
                      <span className={`${badgeClass.neutral} block w-fit`}>Profil incomplet</span>
                    )}
                    {user?.suspendedAt && <span className={`${badgeClass.danger} block w-fit`}>Suspendu</span>}
                  </td>
                  <td className={`${tdClass} space-y-2`}>
                    {status !== "APPROVED" && (
                      <AdminActionButton
                        action={setTechnicianVerification}
                        fields={{ userId, status: "APPROVED" }}
                        label="Valider"
                        className={secondaryButtonClass}
                      />
                    )}
                    {status !== "REJECTED" && (
                      <AdminActionButton
                        action={setTechnicianVerification}
                        fields={{ userId, status: "REJECTED" }}
                        label="Refuser"
                        className={dangerButtonClass}
                        confirmMessage="Ce technicien ne pourra plus recevoir de nouvelles missions. Continuer ?"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={6} className={`${tdClass} text-center`}>
                  Aucun technicien trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pager path="/dashboard/admin/technicians" searchParams={params} page={page} total={total} />
      </div>
    </>
  );
}
