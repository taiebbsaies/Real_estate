import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { PropertyModel } from "@/src/models/shared";
import { createMaintenanceRequestSchema } from "@/src/modules/maintenance/validations";
import { transitionStatus } from "@/src/services/maintenance-status.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { user } = session;

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
      // Tech sees requests assigned to them, or available accepted requests ready for dispatch
      filter.$or = [
        { assignedTechnicianId: new mongoose.Types.ObjectId(user.id) },
        { status: { $in: ["ACCEPTEE", "TECHNICIEN_ASSIGNE", "EN_COURS", "RESOLUE", "CLOTUREE"] } },
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
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
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

    // 1. Create document in initial status CREEE
    const newRequest = await MaintenanceRequestModel.create({
      title: data.title,
      description: data.description,
      categoryId: new mongoose.Types.ObjectId(data.categoryId),
      propertyId: new mongoose.Types.ObjectId(data.propertyId),
      tenantId: new mongoose.Types.ObjectId(user.id),
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
