import "server-only";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Complaint, { type IComplaint } from "@/models/complaint";
import type { ComplaintStatus } from "@/lib/constants/complaint";
import type { SerializedComplaint } from "@/lib/complaints/types";
import { isTestPropertiesEnabled } from "@/lib/test-properties/config";
import {
  getOwnedTestPropertyIds,
  getTestPropertyMap,
} from "@/lib/test-properties/queries";

const STAFF_ROLES = ["OWNER", "TECHNICIAN", "ADMIN"] as const;

function serializeComplaint(doc: IComplaint & { _id: unknown }): SerializedComplaint {
  return {
    _id: String(doc._id),
    tenantId: doc.tenantId.toString(),
    propertyId: doc.propertyId?.toString(),
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
 * Attach the test apartment code/address used by the complaint cards.
 * Complaints without a property (including all legacy complaints) are untouched.
 */
async function attachTestProperties(
  complaints: SerializedComplaint[],
): Promise<void> {
  const propertyIds = complaints
    .map((complaint) => complaint.propertyId)
    .filter((id): id is string => Boolean(id));

  if (propertyIds.length === 0) return;

  const propertyMap = await getTestPropertyMap(propertyIds);
  for (const complaint of complaints) {
    if (!complaint.propertyId) continue;
    const property = propertyMap.get(complaint.propertyId);
    if (property) complaint.property = property;
  }
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

  const complaints = docs.map(serializeComplaint);
  await attachTestProperties(complaints);

  return complaints;
}

/**
 * Fetch complaints for staff views.
 *
 * - Admins can see every complaint.
 * - Owners see legacy complaints (no apartment) and complaints targeting their
 *   own test apartments. The filter only applies while the development-only
 *   test apartments are enabled.
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
  } else if (session.activeRole === "OWNER" && isTestPropertiesEnabled()) {
    const ownedPropertyIds = await getOwnedTestPropertyIds(session.userId);
    query.$or = [
      { propertyId: { $exists: false } },
      { propertyId: null },
      { propertyId: { $in: ownedPropertyIds } },
    ];
  }

  if (filterStatus) {
    query.status = filterStatus;
  }

  const docs = await Complaint.find(query).sort({ createdAt: -1 }).lean();

  const complaints = docs.map(serializeComplaint);
  await attachTestProperties(complaints);

  return complaints;
}
