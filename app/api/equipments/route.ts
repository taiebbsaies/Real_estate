import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/src/lib/mongoose";
import { EquipmentModel } from "@/src/models/shared";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (propertyId) {
      filter.propertyId = propertyId;
    }

    const equipments = await EquipmentModel.find(filter).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: equipments });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (error as { digest?: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }
    console.error("GET /api/equipments error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
