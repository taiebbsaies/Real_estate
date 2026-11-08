import { describe, it, expect } from "vitest";
import {
  calculateMatchScore,
  calculateHaversineDistanceKm,
  resolvePropertyCoordinates,
  resolveTechnicianCoordinates,
} from "./matching.service";

describe("Technician location resolution", () => {
  const defaults = { coordinates: [10.1815, 36.8065] };

  it("locates a property from its city when only default coordinates are stored", () => {
    expect(resolvePropertyCoordinates({ city: "Sfax", location: defaults })).toEqual([10.7603, 34.7406]);
    expect(resolvePropertyCoordinates({ city: "Béja" })).toEqual([9.1817, 36.7256]);
  });

  it("falls back to the address, then to unknown instead of assuming Tunis", () => {
    expect(resolvePropertyCoordinates({ city: "Hammamet", address: "Rue X, Nabeul" })).toEqual([10.7376, 36.4561]);
    expect(resolvePropertyCoordinates({ city: "Tunisie", address: "Rue X", location: defaults })).toBeNull();
  });

  it("keeps real stored property coordinates", () => {
    expect(resolvePropertyCoordinates({ city: "Sfax", location: { coordinates: [10.33, 36.855] } })).toEqual([10.33, 36.855]);
  });

  it("treats a technician profile that was never filled in as unknown", () => {
    expect(resolveTechnicianCoordinates({ address: "Tunis, Tunisie", location: defaults })).toBeNull();
    expect(resolveTechnicianCoordinates({ city: "Tunis", address: "Tunis", location: defaults })).toEqual([10.1815, 36.8065]);
  });
});

describe("Technician Matching Algorithm", () => {
  it("does not recommend a non-specialist and handles an unknown distance", () => {
    const match = calculateMatchScore({
      categorySlug: "plomberie",
      technicianSkills: ["serrurerie"],
      isAvailable: true,
      distanceKm: null,
      averageRating: 5,
      completedCount: 0,
    });
    expect(match.distanceScore).toBe(5);
    expect(match.explanation).toContain("distance inconnue");
    expect(match.explanation).not.toContain("recommandé");
  });

  it("computes Haversine distance correctly between two known points", () => {
    // Tunis Centre [10.1815, 36.8065] to Carthage [10.33, 36.855]
    const distance = calculateHaversineDistanceKm(
      [10.1815, 36.8065],
      [10.33, 36.855]
    );
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(20);
  });

  it("yields high match score (>90%) for ideal technician candidate", () => {
    const match = calculateMatchScore({
      categorySlug: "plomberie",
      technicianSkills: ["plomberie", "sanitaire"],
      isAvailable: true,
      distanceKm: 3.2,
      averageRating: 4.9,
      completedCount: 42,
    });

    expect(match.skillScore).toBe(35);
    expect(match.availabilityScore).toBe(25);
    expect(match.distanceScore).toBe(20);
    expect(match.ratingScore).toBeGreaterThanOrEqual(9.8);
    expect(match.experienceScore).toBe(10);
    expect(match.totalScore).toBeGreaterThanOrEqual(95);
    expect(match.explanation).toContain("recommandé");
  });

  it("penalizes lack of skill match and unavailability", () => {
    const match = calculateMatchScore({
      categorySlug: "electricite",
      technicianSkills: ["serrurerie"],
      isAvailable: false,
      distanceKm: 25,
      averageRating: 3.5,
      completedCount: 2,
    });

    expect(match.skillScore).toBe(0);
    expect(match.availabilityScore).toBe(0);
    expect(match.distanceScore).toBe(10);
    expect(match.totalScore).toBeLessThan(30);
  });
});
