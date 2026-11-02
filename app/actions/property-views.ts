"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import PropertyView from "@/models/PropertyView";
import Property from "@/models/property";

const propertyIdSchema = z.string().refine(isValidObjectId);

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function recordPropertyView(propertyId: string): Promise<void> {
  try {
    const session = await getSession();
    if (!session || session.activeRole !== "TENANT") {
      return;
    }

    const parsedId = propertyIdSchema.safeParse(propertyId);
    if (!parsedId.success) {
      return;
    }

    await connectDB();

    const property = await Property.findOne({
      _id: parsedId.data,
      ownerId: { $ne: session.userId },
      moderationStatus: "approved",
      deletedAt: null,
    })
      .select("_id")
      .lean();

    if (!property) {
      return;
    }

    const day = new Date().toISOString().slice(0, 10);
    let inserted = false;

    try {
      const result = await PropertyView.updateOne(
        {
          propertyId: property._id,
          viewerId: session.userId,
          day,
        },
        {
          $setOnInsert: {
            propertyId: property._id,
            viewerId: session.userId,
            day,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
      inserted = result.upsertedCount > 0;
    } catch (error: unknown) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    if (inserted) {
      revalidatePath("/dashboard/owner/properties");
    }
  } catch (error: unknown) {
    console.error("[recordPropertyView] error:", error);
  }
}
