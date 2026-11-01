export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "studio",
  "villa",
  "office",
  "land",
] as const;

export const PROPERTY_CONDITIONS = [
  "new",
  "very_good",
  "good",
  "fair",
  "poor",
] as const;

export const PROPERTY_AVAILABILITIES = [
  "available",
  "rented",
  "reserved",
] as const;

export const PROPERTY_EQUIPMENTS = [
  "parking",
  "elevator",
  "air_conditioning",
  "heating",
  "furnished",
  "balcony",
  "garden",
  "internet",
  "pool",
  "security",
  "terrace",
] as const;

export const PROPERTY_MODERATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyCondition = (typeof PROPERTY_CONDITIONS)[number];
export type PropertyAvailability = (typeof PROPERTY_AVAILABILITIES)[number];
export type PropertyEquipment = (typeof PROPERTY_EQUIPMENTS)[number];
export type PropertyModerationStatus = (typeof PROPERTY_MODERATION_STATUSES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Appartement",
  house: "Maison",
  studio: "Studio",
  villa: "Villa",
  office: "Bureau",
  land: "Terrain",
};

export const PROPERTY_CONDITION_LABELS: Record<PropertyCondition, string> = {
  new: "Neuf",
  very_good: "Très bon",
  good: "Bon",
  fair: "Correct",
  poor: "Dégradé",
};

export const PROPERTY_AVAILABILITY_LABELS: Record<PropertyAvailability, string> = {
  available: "Disponible",
  rented: "Loué",
  reserved: "Réservé",
};

export const PROPERTY_EQUIPMENT_LABELS: Record<PropertyEquipment, string> = {
  parking: "Parking",
  elevator: "Ascenseur",
  air_conditioning: "Climatisation",
  heating: "Chauffage",
  furnished: "Meublé",
  balcony: "Balcon",
  garden: "Jardin",
  internet: "Internet",
  pool: "Piscine",
  security: "Sécurité",
  terrace: "Terrasse",
};
