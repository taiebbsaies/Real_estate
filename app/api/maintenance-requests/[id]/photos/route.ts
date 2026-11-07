import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { loadRequestFor } from "@/src/lib/maintenance-access";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { storageService, MAX_PHOTOS_PER_REQUEST } from "@/src/services/storage.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    const { user } = session;

    const access = await loadRequestFor(user, id, "act");
    if (access.error) return access.error;

    await connectDB();

    const request = await MaintenanceRequestModel.findById(id);
    if (!request) {
      return NextResponse.json(
        { success: false, message: "Demande introuvable" },
        { status: 404 }
      );
    }

    if (request.photos && request.photos.length >= MAX_PHOTOS_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          message: `Limite maximale de ${MAX_PHOTOS_PER_REQUEST} photos atteinte.`,
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucun fichier fourni dans le champ 'file'." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storedFile = await storageService.saveFile(
      buffer,
      file.name,
      file.type || "image/jpeg"
    );

    request.photos.push(storedFile);
    await request.save();

    return NextResponse.json({
      success: true,
      message: "Photo enregistrée avec succès",
      data: storedFile,
    });
  } catch (error: unknown) {
    console.error("POST /api/maintenance-requests/[id]/photos error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
