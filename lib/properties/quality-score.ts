export type QualityLevel = "weak" | "good" | "excellent";

export type QualityTip = {
  id: string;
  label: string;
  /** Points gained by applying the tip. */
  points: number;
};

export type QualityScore = {
  score: number;
  level: QualityLevel;
  tips: QualityTip[];
};

/**
 * Minimal shape accepted by the scorer. It matches both the serialized
 * listings loaded by the pages and the raw moderation documents.
 */
export type QualityScoreInput = {
  description: string;
  images: string[];
  coverImage?: string;
  equipments: string[];
  zone?: string;
  bedrooms?: number;
  bathrooms?: number;
  type: string;
  rules?: string;
  availableFrom?: string | Date;
  latitude?: number;
  longitude?: number;
  address: string;
};

// Documented weights. The maximum points add up to exactly 100.
export const QUALITY_WEIGHTS = [
  { id: "photos", label: "Photos", maxPoints: 25 },
  { id: "cover", label: "Photo de couverture", maxPoints: 5 },
  { id: "description", label: "Description", maxPoints: 20 },
  { id: "equipments", label: "Équipements", maxPoints: 15 },
  { id: "zone", label: "Zone", maxPoints: 5 },
  { id: "rooms", label: "Chambres et salles de bain", maxPoints: 10 },
  { id: "rules", label: "Règles de location", maxPoints: 5 },
  { id: "availableFrom", label: "Date de disponibilité", maxPoints: 5 },
  { id: "coordinates", label: "Coordonnées", maxPoints: 5 },
  { id: "address", label: "Adresse", maxPoints: 5 },
] as const;

const WEAK_LIMIT = 50;
const EXCELLENT_LIMIT = 80;

function clampInt(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function pointsForPhotos(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 8;
  if (count <= 4) return 16;
  return 25;
}

function pointsForDescription(length: number): number {
  if (length >= 300) return 20;
  if (length >= 150) return 15;
  return 0;
}

function pointsForEquipments(count: number): number {
  if (count >= 6) return 15;
  if (count >= 3) return 10;
  return 0;
}

/**
 * Deterministic listing quality score (0-100). Pure function: it never reads
 * the database, never mutates the listing, and is never used for ranking or
 * moderation decisions.
 */
export function computeQualityScore(
  property: QualityScoreInput,
): QualityScore {
  const images = Array.isArray(property.images) ? property.images : [];
  const equipments = Array.isArray(property.equipments)
    ? property.equipments
    : [];
  const description =
    typeof property.description === "string" ? property.description : "";
  const address = typeof property.address === "string" ? property.address : "";

  const photoCount = images.length;
  const photosPoints = pointsForPhotos(photoCount);
  const coverPoints =
    property.coverImage && images.includes(property.coverImage) ? 5 : 0;

  const descriptionLength = description.trim().length;
  const descriptionPoints = pointsForDescription(descriptionLength);

  const equipmentCount = equipments.length;
  const equipmentPoints = pointsForEquipments(equipmentCount);

  const zonePoints = property.zone?.trim() ? 5 : 0;

  // Land and offices have no bedrooms in the listing form, so the check is
  // considered satisfied for them to keep the scale fair.
  const roomsApplicable =
    property.type !== "land" && property.type !== "office";
  const roomsFilled =
    property.bedrooms !== undefined && property.bathrooms !== undefined;
  const roomsPoints = roomsApplicable && !roomsFilled ? 0 : 10;

  const rulesPoints = property.rules?.trim() ? 5 : 0;
  const availableFromPoints = property.availableFrom ? 5 : 0;
  const coordinatesPoints =
    property.latitude !== undefined && property.longitude !== undefined ? 5 : 0;
  const addressPoints = address.trim().length >= 10 ? 5 : 0;

  const score = clampInt(
    photosPoints +
      coverPoints +
      descriptionPoints +
      equipmentPoints +
      zonePoints +
      roomsPoints +
      rulesPoints +
      availableFromPoints +
      coordinatesPoints +
      addressPoints,
    0,
    100,
  );

  const tips: QualityTip[] = [];

  if (photoCount < 3) {
    const gain = 16 - photosPoints;
    if (gain > 0) {
      tips.push({
        id: "photos",
        label: "Ajoutez au moins 3 photos",
        points: gain,
      });
    }
  } else if (photoCount < 5) {
    const gain = 25 - photosPoints;
    if (gain > 0) {
      tips.push({
        id: "photos",
        label: "Ajoutez au moins 5 photos",
        points: gain,
      });
    }
  }

  if (coverPoints === 0) {
    tips.push({
      id: "cover",
      label: "Définissez une photo de couverture",
      points: 5,
    });
  }

  if (descriptionPoints < 20) {
    tips.push(
      descriptionLength < 150
        ? {
            id: "description",
            label: "Ajoutez une description d'au moins 150 caractères",
            points: 15,
          }
        : {
            id: "description",
            label: "Ajoutez une description d'au moins 300 caractères",
            points: 5,
          },
    );
  }

  if (equipmentPoints < 15) {
    tips.push(
      equipmentCount < 3
        ? {
            id: "equipments",
            label: "Ajoutez au moins 3 équipements",
            points: 10,
          }
        : {
            id: "equipments",
            label: "Ajoutez au moins 6 équipements",
            points: 5,
          },
    );
  }

  if (zonePoints === 0) {
    tips.push({ id: "zone", label: "Renseignez la zone", points: 5 });
  }

  if (roomsApplicable && !roomsFilled) {
    tips.push({
      id: "rooms",
      label: "Renseignez les chambres et les salles de bain",
      points: 10,
    });
  }

  if (rulesPoints === 0) {
    tips.push({
      id: "rules",
      label: "Renseignez les règles de location",
      points: 5,
    });
  }

  if (availableFromPoints === 0) {
    tips.push({
      id: "availableFrom",
      label: "Indiquez une date de disponibilité",
      points: 5,
    });
  }

  if (coordinatesPoints === 0) {
    tips.push({
      id: "coordinates",
      label: "Ajoutez la localisation (latitude et longitude)",
      points: 5,
    });
  }

  if (addressPoints === 0) {
    tips.push({
      id: "address",
      label: "Renseignez une adresse plus précise",
      points: 5,
    });
  }

  tips.sort((a, b) => b.points - a.points);

  const level: QualityLevel =
    score >= EXCELLENT_LIMIT
      ? "excellent"
      : score >= WEAK_LIMIT
        ? "good"
        : "weak";

  return { score, level, tips };
}
