import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceHistoryModel } from "@/src/models/maintenance-history";
import { PropertyModel } from "@/src/models/shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    const { user } = session;

    await connectDB();

    const property = await PropertyModel.findById(id);
    if (!property) {
      return NextResponse.json(
        { success: false, message: "Propriété introuvable" },
        { status: 404 }
      );
    }

    // Authorization: owner, current tenant, or admin
    if (
      user.role !== "ADMIN" &&
      property.ownerId.toString() !== user.id &&
      property.tenantId?.toString() !== user.id
    ) {
      return NextResponse.json(
        { success: false, message: "Accès refusé à l'historique de cette propriété." },
        { status: 403 }
      );
    }

    const history = await MaintenanceHistoryModel.find({ propertyId: property._id })
      .populate("requestId", "title status priority")
      .populate("actorId", "firstName lastName email roles")
      .sort({ timestamp: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      property: {
        id: property._id,
        title: property.title,
        address: property.address,
        city: property.city,
      },
      data: history,
      total: history.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/properties/[id]/maintenance-history error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
