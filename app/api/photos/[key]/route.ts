import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import InterventionModel from "@/src/models/intervention";
import { PropertyModel } from "@/src/models/shared";
import { storageService } from "@/src/services/storage.service";

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;
    const session = await auth();
    const { user } = session;

    await connectDB();

    // 1. Authorize access to this photo
    let authorized = user.role === "ADMIN";

    let mimeType = "image/jpeg";
    if (key.endsWith(".png")) mimeType = "image/png";
    if (key.endsWith(".webp")) mimeType = "image/webp";

    if (!authorized) {
      // Check if photo is attached to a MaintenanceRequest
      const reqDoc = await MaintenanceRequestModel.findOne({
        "photos.storageKey": key,
      }).select("tenantId propertyId assignedTechnicianId");

      if (reqDoc) {
        if (user.role === "TENANT" && reqDoc.tenantId.toString() === user.id) {
          authorized = true;
        } else if (user.role === "TECHNICIAN" && reqDoc.assignedTechnicianId?.toString() === user.id) {
          authorized = true;
        } else if (user.role === "OWNER") {
          const prop = await PropertyModel.findById(reqDoc.propertyId).select("ownerId");
          if (prop?.ownerId.toString() === user.id) {
            authorized = true;
          }
        }
      }

      // Check if photo is attached to an Intervention
      if (!authorized) {
        const intervDoc = await InterventionModel.findOne({
          "photos.storageKey": key,
        }).select("technicianId requestId");

        if (intervDoc) {
          if (user.role === "TECHNICIAN" && intervDoc.technicianId.toString() === user.id) {
            authorized = true;
          } else {
            const reqParent = await MaintenanceRequestModel.findById(intervDoc.requestId).select(
              "tenantId propertyId"
            );
            if (reqParent) {
              if (user.role === "TENANT" && reqParent.tenantId.toString() === user.id) {
                authorized = true;
              } else if (user.role === "OWNER") {
                const prop = await PropertyModel.findById(reqParent.propertyId).select("ownerId");
                if (prop?.ownerId.toString() === user.id) {
                  authorized = true;
                }
              }
            }
          }
        }
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "Accès refusé à cette ressource privée." },
        { status: 403 }
      );
    }

    // 2. Fetch file from storage
    try {
      const { buffer } = await storageService.getFile(key);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "private, max-age=86400",
        },
      });
    } catch {
      // If file not on disk (e.g., initial seed mock key), return high quality SVG placeholder
      const svgFallback = `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
          <rect width="600" height="400" fill="#1e293b"/>
          <circle cx="300" cy="180" r="48" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6" stroke-width="2"/>
          <path d="M285 195 L315 165 M285 165 L315 195" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>
          <text x="300" y="260" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16" font-weight="600">
            Photo Documentée : ${path.basename(key)}
          </text>
          <text x="300" y="285" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="13">
            HomeCheck Système de Sécurisation Privée
          </text>
        </svg>
      `.trim();

      return new NextResponse(svgFallback, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "private, max-age=86400",
        },
      });
    }
  } catch (error: unknown) {
    console.error("GET /api/photos/[key] error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
