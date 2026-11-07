import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTOR_ROLES } from "@/src/modules/maintenance/constants";
import { UserModel } from "@/src/models/shared";
import connectDB from "@/src/lib/mongoose";

export async function POST(req: NextRequest) {
  try {
    const { role, userId } = await req.json();

    if (!role || !ACTOR_ROLES.includes(role) || role === "SYSTEM") {
      return NextResponse.json(
        { success: false, message: "Rôle non valide" },
        { status: 400 }
      );
    }

    await connectDB();

    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const user = await UserModel.findOne({ roles: role });
      if (user) {
        resolvedUserId = user._id.toString();
      }
    }

    const cookieStore = await cookies();
    cookieStore.set("homecheck_role", role, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    if (resolvedUserId) {
      cookieStore.set("homecheck_user_id", resolvedUserId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Rôle basculé avec succès vers ${role}`,
      role,
      userId: resolvedUserId,
    });
  } catch (error: unknown) {
    console.error("POST /api/auth/switch-role error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
