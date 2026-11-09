import { NextResponse } from "next/server";
import {
  isValidPropertyImagePath,
  propertyImageContentType,
  readPropertyImage,
} from "@/lib/storage/blob-storage-provider";

interface RouteParams {
  params: Promise<{ propertyId: string; filename: string }>;
}

// Listing photos are public content: the blob stays private in the store, and
// this route is the only way to read it. Filenames are random and never reused,
// so responses can be cached for a long time.
export async function GET(_request: Request, { params }: RouteParams) {
  const { propertyId, filename } = await params;

  if (!isValidPropertyImagePath(propertyId, filename)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const stream = await readPropertyImage(propertyId, filename);
    if (!stream) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": propertyImageContentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/property-images error:", error);
    return new NextResponse(null, { status: 404 });
  }
}
