import connectDB from "@/src/lib/mongoose";
import { UserModel } from "@/src/models/shared";
import { reactivateUser, suspendUser } from "@/app/actions/admin";
import { ADMIN_PAGE_SIZE, escapeRegex, parsePage } from "@/lib/admin/rules";
import { USER_ROLES } from "@/lib/constants/user";
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

const ROLE_LABELS: Record<string, string> = {
  TENANT: "Locataire",
  OWNER: "Propriétaire",
  TECHNICIAN: "Technicien",
  ADMIN: "Administrateur",
};

type SearchParams = { q?: string; role?: string; status?: string; page?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const page = parsePage(params.page);

  const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (params.q?.trim()) {
    const pattern = new RegExp(escapeRegex(params.q.trim()), "i");
    filter.$or = [{ firstName: pattern }, { lastName: pattern }, { email: pattern }];
  }
  if ((USER_ROLES as readonly string[]).includes(params.role ?? "")) filter.roles = params.role;
  if (params.status === "suspended") filter.suspendedAt = { $exists: true };
  if (params.status === "active") filter.suspendedAt = { $exists: false };

  await connectDB();
  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  return (
    <>
      <h1 className={headingClass}>Utilisateurs</h1>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Nom ou e-mail"
          aria-label="Rechercher"
          className={inputClass}
        />
        <select name="role" defaultValue={params.role ?? ""} aria-label="Rôle" className={inputClass}>
          <option value="">Tous les rôles</option>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} aria-label="État" className={inputClass}>
          <option value="">Tous les états</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </select>
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Utilisateur</th>
              <th className={thClass}>Rôles</th>
              <th className={thClass}>État</th>
              <th className={thClass}>Dernière connexion</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const id = String(user._id);
              return (
                <tr key={id}>
                  <td className={tdClass}>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className={mutedClass}>{user.email}</p>
                  </td>
                  <td className={tdClass}>{user.roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}</td>
                  <td className={tdClass}>
                    <span className={user.suspendedAt ? badgeClass.danger : badgeClass.success}>
                      {user.suspendedAt ? "Suspendu" : "Actif"}
                    </span>
                  </td>
                  <td className={tdClass}>
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("fr-FR") : "Jamais"}
                  </td>
                  <td className={tdClass}>
                    {id === admin.id ? (
                      <span className={mutedClass}>Votre compte</span>
                    ) : user.suspendedAt ? (
                      <AdminActionButton
                        action={reactivateUser}
                        fields={{ userId: id }}
                        label="Réactiver"
                        className={secondaryButtonClass}
                      />
                    ) : (
                      <AdminActionButton
                        action={suspendUser}
                        fields={{ userId: id }}
                        label="Suspendre"
                        className={dangerButtonClass}
                        confirmMessage={`Suspendre le compte de ${user.firstName} ${user.lastName} ?`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className={`${tdClass} text-center`}>
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pager path="/dashboard/admin/users" searchParams={params} page={page} total={total} />
      </div>
    </>
  );
}
