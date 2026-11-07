import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import InterventionModel from "@/src/models/intervention";
import { storageService, MAX_PHOTOS_PER_REQUEST } from "@/src/services/storage.service";
import { type PhotoType } from "@/src/modules/maintenance/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    const { user } = session;

    if (!["TECHNICIAN", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Action réservée aux techniciens" },
        { status: 403 }
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

    if (intervention.photos && intervention.photos.length >= MAX_PHOTOS_PER_REQUEST) {
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
    const photoType = (formData.get("photoType") as string) || "BEFORE";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucun fichier fourni dans le champ 'file'." },
        { status: 400 }
      );
    }

    if (!["BEFORE", "AFTER"].includes(photoType)) {
      return NextResponse.json(
        { success: false, message: "photoType doit être 'BEFORE' ou 'AFTER'." },
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

    const photoEntry = {
      storageKey: storedFile.storageKey,
      photoType: photoType as PhotoType,
      originalName: storedFile.originalName,
      mimeType: storedFile.mimeType,
      sizeBytes: storedFile.sizeBytes,
      uploadedAt: storedFile.uploadedAt,
    };

    intervention.photos.push(photoEntry);
    await intervention.save();

    return NextResponse.json({
      success: true,
      message: `Photo ${photoType === "BEFORE" ? "Avant travaux" : "Après travaux"} ajoutée avec succès`,
      data: photoEntry,
    });
  } catch (error: unknown) {
    console.error("POST /api/interventions/[id]/photos error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
