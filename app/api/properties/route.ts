import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { PropertyModel } from "@/src/models/shared";

export async function GET() {
  try {
    const session = await auth();
    const { user } = session;

    await connectDB();

    const filter: Record<string, unknown> = {};

    if (user.role === "TENANT") {
      filter.tenantId = user.id;
    } else if (user.role === "OWNER") {
      filter.ownerId = user.id;
    }
    // ADMIN and TECHNICIAN see all properties

    let properties = await PropertyModel.find(filter)
      .populate("ownerId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone")
      .sort({ title: 1 })
      .lean();

    // If tenant/owner has no assigned properties, return all properties for demo convenience
    if (properties.length === 0) {
      properties = await PropertyModel.find({})
        .populate("ownerId", "firstName lastName email phone")
        .populate("tenantId", "firstName lastName email phone")
        .sort({ title: 1 })
        .lean();
    }

    return NextResponse.json({ success: true, data: properties });
  } catch (error: unknown) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
