import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { PropertyModel, UserModel } from "@/src/models/shared";
import { forbiddenResponse, unauthorizedResponse } from "@/src/lib/maintenance-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/properties/:id/tenant
 * Body: { email: string }  -> assigns the tenant with this email to the property
 * Body: { email: null }    -> removes the current tenant (property becomes vacant)
 *
 * Allowed: the owner of the property, or an admin.
 * Rule: one tenant per property, and a tenant occupies one property at a time.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user } = await auth();
    if (!user) return unauthorizedResponse();

    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Logement invalide." }, { status: 400 });
    }

    await connectDB();

    const property = await PropertyModel.findById(id);
    if (!property) {
      return NextResponse.json({ success: false, message: "Logement introuvable." }, { status: 404 });
    }

    const isOwner = String(property.ownerId) === user.id;
    if (user.role !== "ADMIN" && !(user.role === "OWNER" && isOwner)) {
      return forbiddenResponse("Seul le propriétaire de ce logement peut gérer son locataire.");
    }

    const body = (await req.json().catch(() => ({}))) as { email?: string | null };

    // Remove the tenant
    if (body.email === null || body.email === "") {
      property.tenantId = undefined;
      await property.save();
      return NextResponse.json({
        success: true,
        message: `Le logement "${property.title}" est maintenant vacant.`,
        data: { _id: property._id, tenantId: null },
      });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Adresse e-mail du locataire invalide." },
        { status: 400 }
      );
    }

    const tenant = await UserModel.findOne({ email })
      .select("firstName lastName email phone roles")
      .lean();

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Aucun compte trouvé avec cet e-mail. Le locataire doit d'abord s'inscrire." },
        { status: 404 }
      );
    }

    if (!tenant.roles?.includes("TENANT")) {
      return NextResponse.json(
        { success: false, message: "Ce compte n'a pas le rôle Locataire." },
        { status: 400 }
      );
    }

    const otherProperty = await PropertyModel.findOne({
      tenantId: tenant._id,
      _id: { $ne: property._id },
    })
      .select("title")
      .lean();

    if (otherProperty) {
      return NextResponse.json(
        {
          success: false,
          message: `${tenant.firstName} ${tenant.lastName} occupe déjà le logement "${otherProperty.title}".`,
        },
        { status: 409 }
      );
    }

    property.tenantId = tenant._id;
    await property.save();

    return NextResponse.json({
      success: true,
      message: `${tenant.firstName} ${tenant.lastName} est maintenant locataire de "${property.title}".`,
      data: {
        _id: property._id,
        tenantId: {
          _id: tenant._id,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          phone: tenant.phone,
        },
      },
    });
  } catch (error: unknown) {
    console.error("PUT /api/properties/[id]/tenant error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
