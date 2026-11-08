import { z } from "zod";
import {
  MAINTENANCE_STATUSES,
  PRIORITIES,
  PHOTO_TYPES,
} from "./constants";

export const createMaintenanceRequestSchema = z.object({
  title: z
    .string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(120, "Le titre ne doit pas dépasser 120 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(2000, "La description ne doit pas dépasser 2000 caractères"),
  categoryId: z.string().min(1, "La catégorie est obligatoire"),
  propertyId: z.string().min(1, "La propriété est obligatoire"),
  equipmentId: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES, {
    error: "Priorité invalide (BASSE, MOYENNE, HAUTE, URGENTE)",
  }),
  sourceInspectionItemId: z.string().optional().nullable(),
});

export const updateStatusSchema = z.object({
  targetStatus: z.enum(MAINTENANCE_STATUSES, {
    error: "Statut cible non reconnu",
  }),
  expectedVersion: z.number().int().optional(),
  reason: z.string().optional().nullable(),
  diagnostic: z.string().optional().nullable(),
  workDone: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().optional(),
  directAssignment: z.boolean().optional(),
  action: z.enum(["PROPOSE", "ACCEPT", "REFUSE"]).optional(),
  refusalReason: z.string().optional().nullable(),
});

export const updateInterventionSchema = z.object({
  diagnostic: z.string().optional(),
  workDone: z.string().optional(),
  partsReplaced: z.array(z.string()).optional(),
  cost: z.number().min(0, "Le coût ne peut pas être négatif").optional(),
  durationMinutes: z.number().int().min(0, "La durée ne peut pas être négative").optional(),
  comment: z.string().optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

export const createReviewSchema = z.object({
  requestId: z.string().min(1, "L'identifiant de la demande est obligatoire"),
  technicianId: z.string().min(1, "L'identifiant du technicien est obligatoire"),
  rating: z.number().int().min(1).max(5, "La note doit être comprise entre 1 et 5"),
  comment: z.string().max(1000).optional().nullable(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  slug: z.string().min(2, "Le slug est obligatoire"),
  icon: z.string().default("Wrench"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
