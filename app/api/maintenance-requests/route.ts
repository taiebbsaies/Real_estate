import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { PropertyModel } from "@/src/models/shared";
import { createMaintenanceRequestSchema } from "@/src/modules/maintenance/validations";
import { transitionStatus } from "@/src/services/maintenance-status.service";
import { forbiddenResponse, unauthorizedResponse } from "@/src/lib/maintenance-access";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { user } = session;
    if (!user) return unauthorizedResponse();

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const priority = searchParams.get("priority");
    const propertyId = searchParams.get("propertyId");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {};

    // Role-based scoping
    if (user.role === "TENANT") {
      filter.tenantId = new mongoose.Types.ObjectId(user.id);
    } else if (user.role === "OWNER") {
      const ownedProperties = await PropertyModel.find({
        ownerId: new mongoose.Types.ObjectId(user.id),
      }).select("_id");
      const propIds = ownedProperties.map((p) => p._id);
      filter.propertyId = { $in: propIds };
    } else if (user.role === "TECHNICIAN") {
      // Tech sees requests assigned to them, or accepted requests still waiting for a technician
      filter.$or = [
        { assignedTechnicianId: new mongoose.Types.ObjectId(user.id) },
        { status: "ACCEPTEE", assignedTechnicianId: { $exists: false } },
        { status: "ACCEPTEE", assignedTechnicianId: null },
      ];
    }
    // ADMIN has full visibility

    // Query parameters
    if (status) {
      filter.status = status;
    }
    if (categoryId) {
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    if (priority) {
      filter.priority = priority;
    }
    if (propertyId) {
      filter.propertyId = new mongoose.Types.ObjectId(propertyId);
    }
    if (search) {
      // Combined with $and so the search never overrides the technician's $or scope
      filter.$and = [
        {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    const requests = await MaintenanceRequestModel.find(filter)
      .populate("categoryId", "name slug icon")
      .populate("propertyId", "title address city postalCode")
      .populate("tenantId", "firstName lastName email phone")
      .populate("assignedTechnicianId", "firstName lastName email phone avatarUrl")
      .populate("equipmentId", "name category brand serialNumber condition")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      userRole: user.role,
      currentUser: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      data: requests,
      total: requests.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/maintenance-requests error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { user } = session;
    if (!user) return unauthorizedResponse();

    const rawBody = await req.json();
    const validation = createMaintenanceRequestSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données de formulaire invalides",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    await connectDB();

    // The request must target the tenant's own property: its owner is the one who validates it
    const property = await PropertyModel.findById(data.propertyId).select("ownerId tenantId").lean();
    if (!property) {
      return NextResponse.json(
        { success: false, message: "Logement introuvable." },
        { status: 404 }
      );
    }
    if (user.role === "TENANT" && String(property.tenantId) !== user.id) {
      return forbiddenResponse("Vous ne pouvez signaler un problème que pour le logement qui vous est assigné.");
    }
    if (!["TENANT", "ADMIN"].includes(user.role)) {
      return forbiddenResponse("Seuls les locataires peuvent signaler un problème.");
    }

    // 1. Create document in initial status CREEE
    const newRequest = await MaintenanceRequestModel.create({
      title: data.title,
      description: data.description,
      categoryId: new mongoose.Types.ObjectId(data.categoryId),
      propertyId: new mongoose.Types.ObjectId(data.propertyId),
      // An admin reporting on behalf of the tenant: the request stays attached to the occupant
      tenantId:
        user.role === "ADMIN" && property.tenantId
          ? property.tenantId
          : new mongoose.Types.ObjectId(user.id),
      equipmentId: data.equipmentId ? new mongoose.Types.ObjectId(data.equipmentId) : undefined,
      priority: data.priority,
      status: "CREEE",
      sourceInspectionItemId: data.sourceInspectionItemId || undefined,
      photos: [],
    });

    // 2. State machine rule: SYSTEM auto-dispatches from CREEE to EN_ATTENTE
    const transitionedRequest = await transitionStatus({
      requestId: newRequest._id.toString(),
      targetStatus: "EN_ATTENTE",
      actorRole: "SYSTEM",
      comment: "Auto-dispatch initial par le système suite à la soumission du locataire",
    });

    const populated = await MaintenanceRequestModel.findById(transitionedRequest._id)
      .populate("categoryId", "name slug icon")
      .populate("propertyId", "title address city")
      .populate("equipmentId", "name brand serialNumber");

    return NextResponse.json(
      {
        success: true,
        message: "Demande de maintenance signalée avec succès",
        data: populated,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/maintenance-requests error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
