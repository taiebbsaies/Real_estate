import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { PropertyModel, TechnicianProfileModel, UserModel } from "@/src/models/shared";
import CategoryModel from "@/src/models/category";
import connectDB from "@/src/lib/mongoose";

export interface TechnicianMatchResult {
  technicianId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  skills: string[];
  isAvailable: boolean;
  distanceKm: number;
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
  distanceKm: number;
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
  if (distanceKm <= 5) distanceScore = 20;
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

  const explanation = `Technicien recommandé : ${totalScore} % compatible (${
    hasSkill ? "Spécialité exacte" : "Polyvalent"
  }, ${distanceKm} km, note ${averageRating}/5, ${completedCount} interventions)`;

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
 * Fetches and ranks recommended technicians for a given maintenance request.
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
  const propCoords: [number, number] = property?.location?.coordinates || [10.1815, 36.8065];

  const profiles = await TechnicianProfileModel.find({}).lean();
  const results: TechnicianMatchResult[] = [];

  for (const profile of profiles) {
    const user = await UserModel.findById(profile.userId).lean();
    if (!user) continue;

    const techCoords: [number, number] = profile.location?.coordinates || [10.1815, 36.8065];
    const distanceKm = calculateHaversineDistanceKm(propCoords, techCoords);

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

  // Sort descending by matchScore
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
