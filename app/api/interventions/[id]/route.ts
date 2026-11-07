import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import InterventionModel from "@/src/models/intervention";
import { updateInterventionSchema } from "@/src/modules/maintenance/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const intervention = await InterventionModel.findById(id)
      .populate("requestId")
      .populate("technicianId", "firstName lastName email phone avatarUrl");

    if (!intervention) {
      return NextResponse.json(
        { success: false, message: "Intervention introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: intervention,
    });
  } catch (error: unknown) {
    console.error("GET /api/interventions/[id] error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    const { user } = session;

    if (!["TECHNICIAN", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Seuls les techniciens peuvent modifier une intervention." },
        { status: 403 }
      );
    }

    const rawBody = await req.json();
    const validation = updateInterventionSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données d'intervention invalides",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    await connectDB();

    const intervention = await InterventionModel.findById(id);
    if (!intervention) {
      return NextResponse.json(
        { success: false, message: "Intervention introuvable" },
        { status: 404 }
      );
    }

    const data = validation.data;
    if (data.diagnostic !== undefined) intervention.diagnostic = data.diagnostic;
    if (data.workDone !== undefined) intervention.workDone = data.workDone;
    if (data.partsReplaced !== undefined) intervention.partsReplaced = data.partsReplaced;
    if (data.cost !== undefined) intervention.cost = data.cost;
    if (data.durationMinutes !== undefined) intervention.durationMinutes = data.durationMinutes;
    if (data.comment !== undefined) intervention.comment = data.comment || undefined;
    if (data.startedAt !== undefined) {
      intervention.startedAt = data.startedAt ? new Date(data.startedAt) : undefined;
    }
    if (data.completedAt !== undefined) {
      intervention.completedAt = data.completedAt ? new Date(data.completedAt) : undefined;
    }

    await intervention.save();

    return NextResponse.json({
      success: true,
      message: "Rapport d'intervention mis à jour avec succès",
      data: intervention,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/interventions/[id] error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
