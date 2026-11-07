import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { PropertyModel, UserModel } from "@/src/models/shared";
import { createPropertySchema, firstIssue } from "@/src/modules/maintenance/property-validations";

export async function GET() {
  try {
    const session = await auth();
    const { user } = session;
    if (!user) {
      return NextResponse.json({ success: false, message: "Vous devez être connecté." }, { status: 401 });
    }

    await connectDB();

    const filter: Record<string, unknown> = {};

    if (user.role === "TENANT") {
      filter.tenantId = user.id;
    } else if (user.role === "OWNER") {
      filter.ownerId = user.id;
    }
    // ADMIN and TECHNICIAN see all properties

    const properties = await PropertyModel.find(filter)
      .populate("ownerId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone")
      .sort({ title: 1 })
      .lean();

    // No fallback: a tenant only sees the property assigned to him by its owner.

    return NextResponse.json({ success: true, data: properties });
  } catch (error: unknown) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * An owner adds one of his properties (it starts vacant; he then assigns a tenant).
 * An admin can create a property for an owner by giving ownerEmail.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await auth();
    if (!user) {
      return NextResponse.json({ success: false, message: "Vous devez être connecté." }, { status: 401 });
    }
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Seuls les propriétaires peuvent ajouter un logement." },
        { status: 403 }
      );
    }

    const parsed = createPropertySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: firstIssue(parsed.error) }, { status: 400 });
    }
    const { ownerEmail, ...fields } = parsed.data;

    await connectDB();

    let ownerId: string = user.id;
    if (user.role === "ADMIN") {
      if (!ownerEmail) {
        return NextResponse.json(
          { success: false, message: "Indiquez l'e-mail du propriétaire de ce logement." },
          { status: 400 }
        );
      }
      const owner = await UserModel.findOne({ email: ownerEmail }).select("roles").lean();
      if (!owner || !owner.roles?.includes("OWNER")) {
        return NextResponse.json(
          { success: false, message: "Aucun compte Propriétaire trouvé avec cet e-mail." },
          { status: 404 }
        );
      }
      ownerId = String(owner._id);
    }

    const created = await PropertyModel.create({ ...fields, ownerId });
    const property = await PropertyModel.findById(created._id)
      .populate("ownerId", "firstName lastName email phone")
      .lean();

    return NextResponse.json(
      { success: true, message: `Logement "${created.title}" ajouté.`, data: property },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
