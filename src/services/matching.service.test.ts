import { describe, it, expect } from "vitest";
import { calculateMatchScore, calculateHaversineDistanceKm } from "./matching.service";

describe("Technician Matching Algorithm", () => {
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
