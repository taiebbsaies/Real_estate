import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { loadRequestFor, unauthorizedResponse } from "@/src/lib/maintenance-access";
import { getRecommendedTechnicians } from "@/src/services/matching.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { user } = session;

    if (!user) return unauthorizedResponse();

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

    // An owner only sees the technicians for a request on one of his own properties.
    const access = await loadRequestFor(user, requestId, "act");
    if (access.error) return access.error;

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
