import type {
  PropertyAvailability,
  PropertyCondition,
  PropertyEquipment,
  PropertyModerationStatus,
  PropertyType,
} from "@/lib/constants/property";

export type PropertyActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  /** Last submitted form values, so a failed validation can restore the form. */
  values?: Record<string, string | string[]>;
  /** Id of the created property, returned on successful creation (create flow). */
  propertyId?: string;
};

export type PropertyImageActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export type SerializedProperty = {
  _id: string;
  ownerId: string;
  title: string;
  description: string;
  /** Monthly rent in Tunisian dinars (DT). */
  price: number;
  city: string;
  zone?: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Living surface in square meters. */
  surface: number;
  bedrooms?: number;
  bathrooms?: number;
  type: PropertyType;
  condition: PropertyCondition;
  availability: PropertyAvailability;
  availableFrom?: string;
  hasParking: boolean;
  hasElevator: boolean;
  equipments: PropertyEquipment[];
  images: string[];
  coverImage?: string;
  rules?: string;
  moderationStatus: PropertyModerationStatus;
  moderationReason?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SerializedFavorite = {
  _id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
};
