import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { ReviewModel, TechnicianProfileModel, NotificationModel } from "@/src/models/shared";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { createReviewSchema } from "@/src/modules/maintenance/validations";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { user } = session;

    if (user.role !== "TENANT" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Seuls les locataires peuvent laisser un avis après intervention." },
        { status: 403 }
      );
    }

    const rawBody = await req.json();
    const validation = createReviewSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données d'avis invalides",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { requestId, technicianId, rating, comment } = validation.data;
    await connectDB();

    const request = await MaintenanceRequestModel.findById(requestId);
    if (!request) {
      return NextResponse.json(
        { success: false, message: "Demande introuvable" },
        { status: 404 }
      );
    }

    // Check if review already exists
    const existing = await ReviewModel.findOne({ requestId: new mongoose.Types.ObjectId(requestId) });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Un avis a déjà été soumis pour cette intervention." },
        { status: 400 }
      );
    }

    const review = await ReviewModel.create({
      requestId: new mongoose.Types.ObjectId(requestId),
      technicianId: new mongoose.Types.ObjectId(technicianId),
      tenantId: new mongoose.Types.ObjectId(user.id),
      rating,
      comment: comment || undefined,
    });

    // Recalculate technician average rating
    const allReviews = await ReviewModel.find({
      technicianId: new mongoose.Types.ObjectId(technicianId),
    }).select("rating");

    if (allReviews.length > 0) {
      const avg =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await TechnicianProfileModel.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(technicianId) },
        { averageRating: Number(avg.toFixed(1)) }
      );
    }

    // Notify technician of new review
    await NotificationModel.create({
      userId: new mongoose.Types.ObjectId(technicianId),
      title: "Nouvel avis client reçu",
      message: `Vous avez reçu une note de ${rating}/5 pour l'intervention "${request.title}".`,
      type: "INTERVENTION",
      link: `/maintenance/requests/${request._id}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Votre avis a été enregistré avec succès. Merci pour votre retour !",
        data: review,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const technicianId = searchParams.get("technicianId");
    const requestId = searchParams.get("requestId");

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (technicianId) filter.technicianId = new mongoose.Types.ObjectId(technicianId);
    if (requestId) filter.requestId = new mongoose.Types.ObjectId(requestId);

    const reviews = await ReviewModel.find(filter)
      .populate("tenantId", "firstName lastName avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: reviews });
  } catch (error: unknown) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
