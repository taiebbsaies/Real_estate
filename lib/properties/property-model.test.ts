import { describe, expect, it } from "vitest";
import "@/lib/mongodb";
import Property from "@/models/property";
import { PropertyModel } from "@/src/models/shared";

// lib/mongodb.ts loads the maintenance models first, as it does in the app.
describe("Property models", () => {
  it("keeps the listing schema when the maintenance models load first", () => {
    const listing = new Property({ price: 500, images: ["/a.jpg"] }).toObject();

    expect(listing.price).toBe(500);
    expect(listing.images).toEqual(["/a.jpg"]);
    expect(listing.moderationStatus).toBe("pending");
  });

  it("stores both models in the same collection", () => {
    expect(PropertyModel.modelName).not.toBe(Property.modelName);
    expect(PropertyModel.collection.name).toBe(Property.collection.name);
  });
});
