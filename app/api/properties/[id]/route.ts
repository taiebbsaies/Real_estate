import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth, type AuthUser } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { PropertyModel } from "@/src/models/shared";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { forbiddenResponse, unauthorizedResponse } from "@/src/lib/maintenance-access";
import { firstIssue, propertyInputSchema } from "@/src/modules/maintenance/property-validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Loads the property if the user is its owner (or an admin). */
async function loadOwnedProperty(user: AuthUser | null, id: string) {
  if (!user) return { error: unauthorizedResponse() };
  if (!isValidObjectId(id)) {
    return { error: NextResponse.json({ success: false, message: "Logement invalide." }, { status: 400 }) };
  }

  await connectDB();
  const property = await PropertyModel.findById(id);
  if (!property) {
    return { error: NextResponse.json({ success: false, message: "Logement introuvable." }, { status: 404 }) };
  }

  const isOwner = user.role === "OWNER" && String(property.ownerId) === user.id;
  if (user.role !== "ADMIN" && !isOwner) {
    return { error: forbiddenResponse("Seul le propriétaire de ce logement peut le modifier.") };
  }
  return { property };
}

/** PATCH /api/properties/:id — edit title / address / city / postal code. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user } = await auth();
    const { property, error } = await loadOwnedProperty(user, id);
    if (error) return error;

    const parsed = propertyInputSchema.partial().safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: firstIssue(parsed.error) }, { status: 400 });
    }

    property.set(parsed.data);
    await property.save();

    return NextResponse.json({
      success: true,
      message: "Logement mis à jour.",
      data: {
        _id: property._id,
        title: property.title,
        address: property.address,
        city: property.city,
        postalCode: property.postalCode,
      },
    });
  } catch (error: unknown) {
    console.error("PATCH /api/properties/[id] error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/properties/:id
 * Only a vacant property with no maintenance history can be deleted,
 * so past requests and their timeline are never orphaned.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user } = await auth();
    const { property, error } = await loadOwnedProperty(user, id);
    if (error) return error;

    if (property.tenantId) {
      return NextResponse.json(
        { success: false, message: "Retirez d'abord le locataire avant de supprimer ce logement." },
        { status: 409 }
      );
    }

    const requestCount = await MaintenanceRequestModel.countDocuments({ propertyId: property._id });
    if (requestCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Impossible de supprimer : ce logement a ${requestCount} demande(s) de maintenance dans son historique.`,
        },
        { status: 409 }
      );
    }

    await property.deleteOne();
    return NextResponse.json({ success: true, message: `Logement "${property.title}" supprimé.` });
  } catch (error: unknown) {
    console.error("DELETE /api/properties/[id] error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
