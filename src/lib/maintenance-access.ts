import { NextResponse } from "next/server";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { PropertyModel } from "@/src/models/shared";
import type { AuthUser } from "@/src/lib/auth";

/**
 * Access rules for the maintenance module, based on the tenant/owner link stored on Property:
 *  - ADMIN      : every request
 *  - TENANT     : requests he created, on the property he occupies
 *  - OWNER      : requests on properties he owns (he validates them and assigns the technician)
 *  - TECHNICIAN : requests assigned to him, plus accepted requests still waiting for a technician
 */

type RequestLike = {
  propertyId: unknown;
  tenantId: unknown;
  assignedTechnicianId?: unknown;
  status: string;
};

function idOf(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: "Vous devez être connecté." },
    { status: 401 }
  );
}

export function forbiddenResponse(message = "Accès refusé à cette demande.") {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

export async function isPropertyOwner(propertyId: unknown, userId: string): Promise<boolean> {
  const id = idOf(propertyId);
  if (!id) return false;
  await connectDB();
  const property = await PropertyModel.findById(id).select("ownerId").lean();
  return Boolean(property && String(property.ownerId) === userId);
}

/** Can this user see the request? */
export async function canViewRequest(user: AuthUser, request: RequestLike): Promise<boolean> {
  switch (user.role) {
    case "ADMIN":
      return true;
    case "TENANT":
      return idOf(request.tenantId) === user.id;
    case "OWNER":
      return isPropertyOwner(request.propertyId, user.id);
    case "TECHNICIAN":
      return idOf(request.assignedTechnicianId) === user.id || request.status === "ACCEPTEE";
    default:
      return false;
  }
}

/** Can this user act on the request (change its status, assign, add photos)? */
export async function canActOnRequest(user: AuthUser, request: RequestLike): Promise<boolean> {
  if (user.role === "TECHNICIAN") {
    // A technician only works on the requests assigned to him.
    return idOf(request.assignedTechnicianId) === user.id;
  }
  return canViewRequest(user, request);
}

/** Loads the request and checks access. Returns either the request or a ready-to-send error response. */
export async function loadRequestFor(
  user: AuthUser | null,
  requestId: string,
  mode: "view" | "act"
): Promise<{ request: RequestLike; error?: undefined } | { request?: undefined; error: NextResponse }> {
  if (!user) return { error: unauthorizedResponse() };

  await connectDB();
  const request = (await MaintenanceRequestModel.findById(requestId)
    .select("propertyId tenantId assignedTechnicianId status")
    .lean()) as RequestLike | null;

  if (!request) {
    return {
      error: NextResponse.json({ success: false, message: "Demande introuvable" }, { status: 404 }),
    };
  }

  const allowed =
    mode === "view" ? await canViewRequest(user, request) : await canActOnRequest(user, request);

  if (!allowed) return { error: forbiddenResponse() };
  return { request };
}
