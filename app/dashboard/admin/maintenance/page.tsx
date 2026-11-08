import Link from "next/link";
import { isValidObjectId } from "mongoose";
import connectDB from "@/src/lib/mongoose";
import CategoryModel from "@/src/models/category";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { PropertyModel, UserModel } from "@/src/models/shared";
import {
  MAINTENANCE_STATUSES,
  PRIORITIES,
  PRIORITY_CONFIG,
  STATUS_LABELS,
  type MaintenanceStatus,
} from "@/src/modules/maintenance/constants";
import {
  ADMIN_PAGE_SIZE,
  ASSIGNABLE_REQUEST_STATUSES,
  escapeRegex,
  isRequestStuck,
  OPEN_REQUEST_STATUSES,
  parsePage,
  STUCK_AFTER_DAYS,
  stuckCutoffDate,
} from "@/lib/admin/rules";
import Pager from "../_components/Pager";
import ReassignForm from "../_components/ReassignForm";
import { requireAdminPage } from "../_components/guard";
import {
  badgeClass,
  buttonClass,
  cardClass,
  headingClass,
  inputClass,
  mutedClass,
  tableClass,
  tdClass,
  thClass,
} from "../_components/styles";

type SearchParams = {
  q?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  stuck?: string;
  page?: string;
};

export default async function AdminMaintenancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const params = await searchParams;
  const page = parsePage(params.page);

  const filter: Record<string, unknown> = {};
  if (params.q?.trim()) filter.title = new RegExp(escapeRegex(params.q.trim()), "i");
  if ((MAINTENANCE_STATUSES as readonly string[]).includes(params.status ?? "")) filter.status = params.status;
  if ((PRIORITIES as readonly string[]).includes(params.priority ?? "")) filter.priority = params.priority;
  if (params.categoryId && isValidObjectId(params.categoryId)) filter.categoryId = params.categoryId;
  if (params.stuck === "1") {
    filter.updatedAt = { $lt: stuckCutoffDate() };
    if (!filter.status) filter.status = { $in: OPEN_REQUEST_STATUSES };
  }

  await connectDB();
  const [requests, total, categories] = await Promise.all([
    MaintenanceRequestModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean(),
    MaintenanceRequestModel.countDocuments(filter),
    CategoryModel.find({}).sort({ name: 1 }).lean(),
  ]);

  const [properties, technicians] = await Promise.all([
    PropertyModel.find({ _id: { $in: requests.map((request) => request.propertyId) } })
      .select("title city")
      .lean(),
    UserModel.find({
      _id: { $in: requests.flatMap((request) => request.assignedTechnicianId ?? []) },
    })
      .select("firstName lastName suspendedAt")
      .lean(),
  ]);
  const propertiesById = new Map(properties.map((item) => [String(item._id), item]));
  const techniciansById = new Map(technicians.map((item) => [String(item._id), item]));
  const categoriesById = new Map(categories.map((item) => [String(item._id), item]));

  return (
    <>
      <h1 className={headingClass}>Supervision de la maintenance</h1>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={params.q} placeholder="Titre" aria-label="Rechercher" className={inputClass} />
        <select name="status" defaultValue={params.status ?? ""} aria-label="Statut" className={inputClass}>
          <option value="">Tous les statuts</option>
          {MAINTENANCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status].fr}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={params.priority ?? ""} aria-label="Priorité" className={inputClass}>
          <option value="">Toutes les priorités</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_CONFIG[priority].fr}
            </option>
          ))}
        </select>
        <select name="categoryId" defaultValue={params.categoryId ?? ""} aria-label="Catégorie" className={inputClass}>
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={String(category._id)} value={String(category._id)}>
              {category.name}
            </option>
          ))}
        </select>
        <label className={`${mutedClass} flex items-center gap-1.5`}>
          <input type="checkbox" name="stuck" value="1" defaultChecked={params.stuck === "1"} />
          Bloquées depuis {STUCK_AFTER_DAYS} jours
        </label>
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Demande</th>
              <th className={thClass}>Logement</th>
              <th className={thClass}>Statut</th>
              <th className={thClass}>Technicien</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const id = String(request._id);
              const property = propertiesById.get(String(request.propertyId));
              const technicianId = request.assignedTechnicianId
                ? String(request.assignedTechnicianId)
                : undefined;
              const technician = technicianId ? techniciansById.get(technicianId) : undefined;
              const assignable = (ASSIGNABLE_REQUEST_STATUSES as readonly MaintenanceStatus[]).includes(
                request.status,
              );

              return (
                <tr key={id}>
                  <td className={tdClass}>
                    <Link href={`/maintenance/requests/${id}`} className="font-medium hover:underline">
                      {request.title}
                    </Link>
                    <p className={mutedClass}>
                      {categoriesById.get(String(request.categoryId))?.name ?? "Catégorie inconnue"} ·{" "}
                      {PRIORITY_CONFIG[request.priority].fr}
                    </p>
                  </td>
                  <td className={tdClass}>
                    {property ? `${property.title}, ${property.city}` : "Logement introuvable"}
                  </td>
                  <td className={`${tdClass} space-y-1`}>
                    <span className={`${badgeClass.neutral} block w-fit`}>{STATUS_LABELS[request.status].fr}</span>
                    {isRequestStuck(request.status, new Date(request.updatedAt)) && (
                      <span className={`${badgeClass.danger} block w-fit`}>Bloquée</span>
                    )}
                    <p className={mutedClass}>
                      Mise à jour le {new Date(request.updatedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </td>
                  <td className={`${tdClass} space-y-2`}>
                    <p>
                      {technician ? `${technician.firstName} ${technician.lastName}` : "Non assigné"}
                      {technician?.suspendedAt && (
                        <span className={`${badgeClass.danger} ml-2`}>Suspendu</span>
                      )}
                    </p>
                    {assignable && (
                      <ReassignForm requestId={id} currentTechnicianId={technicianId} />
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className={`${tdClass} text-center`}>
                  Aucune demande trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pager path="/dashboard/admin/maintenance" searchParams={params} page={page} total={total} />
      </div>
    </>
  );
}
