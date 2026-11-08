import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { loadRequestFor } from "@/src/lib/maintenance-access";
import { updateStatusSchema } from "@/src/modules/maintenance/validations";
import {
  transitionStatus,
  StatusTransitionError,
} from "@/src/services/maintenance-status.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    const { user } = session;

    // Owner must own the property, tenant must be the requester, technician must be the assigned one
    const access = await loadRequestFor(user, id, "act");
    if (access.error) return access.error;

    const rawBody = await req.json();
    const validation = updateStatusSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données de mise à jour invalides",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { targetStatus, expectedVersion, reason, diagnostic, workDone, comment } =
      validation.data;

    const updatedRequest = await transitionStatus({
      requestId: id,
      targetStatus,
      actorId: user.id,
      actorRole: user.role,
      expectedVersion,
      reason: reason || undefined,
      diagnostic: diagnostic || undefined,
      workDone: workDone || undefined,
      comment: comment || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Statut mis à jour vers "${targetStatus}" avec succès.`,
      data: updatedRequest,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/maintenance-requests/[id]/status error:", error);

    if (error instanceof StatusTransitionError) {
      return NextResponse.json(
        {
          success: false,
          errorCode: error.errorCode,
          message: error.message,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
