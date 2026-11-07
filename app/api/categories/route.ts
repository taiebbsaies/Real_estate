import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import CategoryModel from "@/src/models/category";
import { createCategorySchema } from "@/src/modules/maintenance/validations";

export async function GET() {
  try {
    await connectDB();
    const categories = await CategoryModel.find({ isActive: true }).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: categories });
  } catch (error: unknown) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { user } = session;

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Action réservée aux administrateurs" },
        { status: 403 }
      );
    }

    const rawBody = await req.json();
    const validation = createCategorySchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données de catégorie invalides",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    await connectDB();
    const newCategory = await CategoryModel.create(validation.data);

    return NextResponse.json(
      {
        success: true,
        message: "Catégorie créée avec succès",
        data: newCategory,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
