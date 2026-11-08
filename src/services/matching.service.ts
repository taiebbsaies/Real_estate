import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { PropertyModel, TechnicianProfileModel, UserModel } from "@/src/models/shared";
import AssignmentModel from "@/src/models/assignment";
import CategoryModel from "@/src/models/category";
import { findGovernorateCoordinates } from "@/lib/constants/technician";
import connectDB from "@/src/lib/mongoose";

// Value stored by the schema defaults: it means "never filled in", not "located in Tunis".
const DEFAULT_COORDINATES: [number, number] = [10.1815, 36.8065];
const DEFAULT_TECHNICIAN_ADDRESS = "Tunis, Tunisie";

function isDefaultCoordinates(coordinates?: number[]): boolean {
  return (
    !coordinates ||
    (coordinates[0] === DEFAULT_COORDINATES[0] && coordinates[1] === DEFAULT_COORDINATES[1])
  );
}

/** Properties are created without coordinates, so their position comes from the city or the address. */
export function resolvePropertyCoordinates(property: {
  city?: string;
  address?: string;
  location?: { coordinates?: number[] };
}): [number, number] | null {
  const stored = property.location?.coordinates;
  if (stored && !isDefaultCoordinates(stored)) return [stored[0], stored[1]];
  return findGovernorateCoordinates(property.city, property.address);
}

export function resolveTechnicianCoordinates(profile: {
  city?: string;
  address?: string;
  location?: { coordinates?: number[] };
}): [number, number] | null {
  const coordinates = profile.location?.coordinates;
  if (!coordinates) return null;
  // A technician who never filled in the profile only has the schema defaults.
  if (!profile.city && profile.address === DEFAULT_TECHNICIAN_ADDRESS) return null;
  return [coordinates[0], coordinates[1]];
}

export interface TechnicianMatchResult {
  technicianId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  skills: string[];
  hasRequiredSkill: boolean;
  city?: string;
  address?: string;
  isAvailable: boolean;
  /** null when the position of the property or of the technician is unknown. */
  distanceKm: number | null;
  averageRating: number;
  completedInterventionsCount: number;
  hourlyRateDT: number;
  matchScore: number;
  matchDetails: {
    skillScore: number;
    availabilityScore: number;
    distanceScore: number;
    ratingScore: number;
    experienceScore: number;
    explanation: string;
  };
}

/**
 * Calculates Haversine distance in kilometers between two [lng, lat] coordinate pairs.
 */
export function calculateHaversineDistanceKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Evaluates pure score logic for a technician profile against target parameters.
 * Useful for pure unit testing without DB access.
 */
export function calculateMatchScore(params: {
  categorySlug: string;
  technicianSkills: string[];
  isAvailable: boolean;
  distanceKm: number | null;
  averageRating: number;
  completedCount: number;
}): {
  totalScore: number;
  skillScore: number;
  availabilityScore: number;
  distanceScore: number;
  ratingScore: number;
  experienceScore: number;
  explanation: string;
} {
  const {
    categorySlug,
    technicianSkills,
    isAvailable,
    distanceKm,
    averageRating,
    completedCount,
  } = params;

  // 1. Skill Match: 35 points max
  const hasSkill = technicianSkills.includes(categorySlug);
  const skillScore = hasSkill ? 35 : 0;

  // 2. Availability: 25 points max
  const availabilityScore = isAvailable ? 25 : 0;

  // 3. Proximity: 20 points max
  let distanceScore = 5;
  if (distanceKm === null) distanceScore = 5;
  else if (distanceKm <= 5) distanceScore = 20;
  else if (distanceKm <= 15) distanceScore = 15;
  else if (distanceKm <= 30) distanceScore = 10;

  // 4. Rating: 10 points max
  const ratingScore = Number(((averageRating / 5) * 10).toFixed(1));

  // 5. Experience: 10 points max
  let experienceScore = 3;
  if (completedCount >= 30) experienceScore = 10;
  else if (completedCount >= 15) experienceScore = 7;
  else if (completedCount >= 5) experienceScore = 5;

  const totalScore = Math.min(
    100,
    Math.round(skillScore + availabilityScore + distanceScore + ratingScore + experienceScore)
  );

  const explanation = `${hasSkill ? "Technicien recommandé" : "Technicien disponible"} : ${totalScore} % compatible (${
    hasSkill ? "spécialité exacte" : "autre spécialité"
  }, ${distanceKm === null ? "distance inconnue" : `${distanceKm} km`}, note ${averageRating}/5, ${completedCount} interventions)`;

  return {
    totalScore,
    skillScore,
    availabilityScore,
    distanceScore,
    ratingScore,
    experienceScore,
    explanation,
  };
}

/**
 * Lists the technicians available for a request, best match first.
 * Technicians who are unavailable, not approved, suspended or who refused this mission are left out.
 */
export async function getRecommendedTechnicians(requestId: string): Promise<TechnicianMatchResult[]> {
  await connectDB();

  const request = await MaintenanceRequestModel.findById(requestId);
  if (!request) {
    throw new Error(`Demande ${requestId} introuvable.`);
  }

  const category = await CategoryModel.findById(request.categoryId);
  const property = await PropertyModel.findById(request.propertyId);

  const categorySlug = category?.slug || "";
  const propCoords = property ? resolvePropertyCoordinates(property) : null;

  const refusedBy = await AssignmentModel.distinct("technicianId", {
    requestId: request._id,
    status: "REFUSED",
  });

  const profiles = await TechnicianProfileModel.find({
    isAvailable: true,
    verificationStatus: { $nin: ["PENDING", "REJECTED"] },
    userId: { $nin: refusedBy },
  }).lean();
  const users = await UserModel.find({
    _id: { $in: profiles.map((profile) => profile.userId) },
    roles: "TECHNICIAN",
    deletedAt: { $exists: false },
    suspendedAt: { $exists: false },
  }).lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const results: TechnicianMatchResult[] = [];

  for (const profile of profiles) {
    const user = usersById.get(String(profile.userId));
    if (!user) continue;

    const techCoords = resolveTechnicianCoordinates(profile);
    const distanceKm =
      propCoords && techCoords ? calculateHaversineDistanceKm(propCoords, techCoords) : null;

    const match = calculateMatchScore({
      categorySlug,
      technicianSkills: profile.skills || [],
      isAvailable: profile.isAvailable,
      distanceKm,
      averageRating: profile.averageRating || 5,
      completedCount: profile.completedInterventionsCount || 0,
    });

    results.push({
      technicianId: user._id.toString(),
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || profile.phone,
      avatarUrl: user.avatarUrl,
      skills: profile.skills || [],
      hasRequiredSkill: (profile.skills || []).includes(categorySlug),
      city: profile.city,
      address: profile.address,
      isAvailable: profile.isAvailable,
      distanceKm,
      averageRating: profile.averageRating || 5,
      completedInterventionsCount: profile.completedInterventionsCount || 0,
      hourlyRateDT: profile.hourlyRateDT || 45,
      matchScore: match.totalScore,
      matchDetails: {
        skillScore: match.skillScore,
        availabilityScore: match.availabilityScore,
        distanceScore: match.distanceScore,
        ratingScore: match.ratingScore,
        experienceScore: match.experienceScore,
        explanation: match.explanation,
      },
    });
  }

  // Specialists first, then best score, then closest.
  return results.sort(
    (a, b) =>
      Number(b.hasRequiredSkill) - Number(a.hasRequiredSkill) ||
      b.matchScore - a.matchScore ||
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  );
}
