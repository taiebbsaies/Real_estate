import "server-only";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Complaint, { type IComplaint } from "@/models/complaint";
import type { ComplaintStatus } from "@/lib/constants/complaint";
import type { SerializedComplaint } from "@/lib/complaints/types";

const STAFF_ROLES = ["OWNER", "TECHNICIAN", "ADMIN"] as const;

function serializeComplaint(doc: IComplaint & { _id: unknown }): SerializedComplaint {
  return {
    _id: String(doc._id),
    tenantId: doc.tenantId.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    priority: doc.priority,
    status: doc.status,
    technicianId: doc.technicianId?.toString(),
    resolutionNotes: doc.resolutionNotes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Fetch the authenticated tenant's own complaints, newest first.
 * Returns plain serializable objects (no Mongoose documents on client boundary).
 */
export async function getMyComplaints(): Promise<SerializedComplaint[]> {
  const session = await getSession();
  if (!session) return [];

  // Never let another role use this tenant-scoped query.
  if (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN") {
    return [];
  }

  await connectDB();

  const docs = await Complaint.find({ tenantId: session.userId })
    .sort({ createdAt: -1 })
    .lean();

  return docs.map(serializeComplaint);
}

/**
 * Fetch complaints for staff views.
 *
 * - Owners and admins can see every complaint.
 * - Technicians only see unassigned complaints and complaints assigned to them.
 */
export async function getAllComplaints(
  filterStatus?: ComplaintStatus,
): Promise<SerializedComplaint[]> {
  const session = await getSession();
  if (!session) return [];

  const isStaff = STAFF_ROLES.includes(
    session.activeRole as (typeof STAFF_ROLES)[number],
  );
  if (!isStaff) return [];

  await connectDB();

  const query: Record<string, unknown> = {};

  if (session.activeRole === "TECHNICIAN") {
    query.$or = [
      { technicianId: session.userId },
      { technicianId: { $exists: false } },
    ];
  }

  if (filterStatus) {
    query.status = filterStatus;
  }

  const docs = await Complaint.find(query).sort({ createdAt: -1 }).lean();

  return docs.map(serializeComplaint);
}
