import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { MaintenanceHistoryModel } from "@/src/models/maintenance-history";
import InterventionModel from "@/src/models/intervention";
import AssignmentModel from "@/src/models/assignment";
import { getAllowedTransitions } from "@/src/modules/maintenance/state-machine";
import { canViewRequest, forbiddenResponse, unauthorizedResponse } from "@/src/lib/maintenance-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    const { user } = session;

    if (!user) return unauthorizedResponse();

    await connectDB();

    const request = await MaintenanceRequestModel.findById(id)
      .populate("categoryId", "name slug icon")
      .populate("propertyId", "title address city postalCode ownerId")
      .populate("tenantId", "firstName lastName email phone avatarUrl")
      .populate("assignedTechnicianId", "firstName lastName email phone avatarUrl")
      .populate("equipmentId", "name category brand serialNumber condition notes")
      .lean();

    if (!request) {
      return NextResponse.json(
        { success: false, message: "Demande introuvable" },
        { status: 404 }
      );
    }

    if (!(await canViewRequest(user, request))) {
      return forbiddenResponse();
    }

    // Associated Intervention
    const intervention = await InterventionModel.findOne({ requestId: request._id })
      .populate("technicianId", "firstName lastName email phone avatarUrl")
      .lean();

    // Associated Active Assignment
    const assignment = await AssignmentModel.findOne({
      requestId: request._id,
      status: { $in: ["PROPOSED", "ACCEPTED"] },
    })
      .populate("technicianId", "firstName lastName email phone")
      .populate("proposedBy", "firstName lastName email")
      .lean();

    // Timeline of history entries
    const history = await MaintenanceHistoryModel.find({ requestId: request._id })
      .populate("actorId", "firstName lastName email roles")
      .sort({ timestamp: -1 })
      .lean();

    // Calculate allowed transitions for this user role
    const allowedTransitions = getAllowedTransitions(request.status, user.role);

    return NextResponse.json({
      success: true,
      data: {
        ...request,
        intervention,
        assignment,
        history,
        allowedTransitions,
        currentUser: user,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/maintenance-requests/[id] error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
