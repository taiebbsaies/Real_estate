import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { loadRequestFor } from "@/src/lib/maintenance-access";
import { assignTechnicianSchema } from "@/src/modules/maintenance/validations";
import { assignmentService } from "@/src/services/assignment.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    const { user } = session;

    // Only the owner of the property (or an admin) assigns; a technician answers a proposal he can see
    const access = await loadRequestFor(user, id, user?.role === "TECHNICIAN" ? "view" : "act");
    if (access.error) return access.error;

    const rawBody = await req.json();
    const validation = assignTechnicianSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données d'assignation invalides",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { technicianId, directAssignment, action, refusalReason } = validation.data;

    if (user.role === "TECHNICIAN") {
      // Tech accepts or refuses
      if (!action || !["ACCEPT", "REFUSE"].includes(action)) {
        return NextResponse.json(
          { success: false, message: "Action requise: ACCEPT ou REFUSE" },
          { status: 400 }
        );
      }

      const updatedAssignment = await assignmentService.respondToAssignment({
        requestId: id,
        technicianId: user.id,
        action: action as "ACCEPT" | "REFUSE",
        refusalReason: refusalReason || undefined,
      });

      return NextResponse.json({
        success: true,
        message:
          action === "ACCEPT"
            ? "Intervention acceptée et programmée avec succès"
            : "Intervention refusée",
        data: updatedAssignment,
      });
    } else if (["OWNER", "ADMIN"].includes(user.role)) {
      if (!technicianId) {
        return NextResponse.json(
          { success: false, message: "technicianId est obligatoire pour une assignation" },
          { status: 400 }
        );
      }

      const assignment = await assignmentService.proposeAssignment({
        requestId: id,
        technicianId,
        proposedById: user.id,
        proposedByRole: user.role,
        directAssignment: directAssignment ?? true, // Default to direct assignment for smooth demo
      });

      return NextResponse.json({
        success: true,
        message: directAssignment
          ? "Technicien assigné avec succès à l'intervention."
          : "Proposition d'intervention envoyée au technicien.",
        data: assignment,
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Action non autorisée pour votre rôle." },
        { status: 403 }
      );
    }
  } catch (error: unknown) {
    console.error("POST /api/maintenance-requests/[id]/assign error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
