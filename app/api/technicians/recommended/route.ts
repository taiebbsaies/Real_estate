import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { getRecommendedTechnicians } from "@/src/services/matching.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { user } = session;

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Accès réservé aux propriétaires et administrateurs" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { success: false, message: "Paramètre requestId requis" },
        { status: 400 }
      );
    }

    const recommendations = await getRecommendedTechnicians(requestId);

    return NextResponse.json({
      success: true,
      data: recommendations,
      total: recommendations.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/technicians/recommended error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
