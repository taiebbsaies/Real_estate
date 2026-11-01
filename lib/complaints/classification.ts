import {
  COMPLAINT_FALLBACK_CATEGORY,
  COMPLAINT_FALLBACK_PRIORITY,
  type ComplaintCategory,
  type ComplaintClassificationSource,
  type ComplaintClassificationStatus,
  type ComplaintPriority,
} from "@/lib/constants/complaint";
import type { ComplaintClassification } from "@/lib/ai/types";

/**
 * Classification fields persisted on a complaint. Keeping this mapping in a
 * pure module makes the success and failure paths verifiable without calling a
 * real AI provider or a database.
 */
export type ComplaintClassificationFields = {
  category: ComplaintCategory;
  priority: ComplaintPriority;
  classificationStatus: ComplaintClassificationStatus;
  classificationSource: ComplaintClassificationSource;
  aiExplanation?: string;
  recommendedAction?: string;
  classifiedAt: Date;
};

export function getAiComplaintClassification(
  classification: ComplaintClassification,
  now: Date = new Date(),
): ComplaintClassificationFields {
  return {
    category: classification.category,
    priority: classification.priority,
    classificationStatus: "completed",
    classificationSource: "ai",
    aiExplanation: classification.explanation,
    recommendedAction: classification.recommendedAction,
    classifiedAt: now,
  };
}

/**
 * Safe defaults used when the provider is missing, times out, or returns an
 * unusable payload. The complaint is still saved, but staff must review it.
 */
export function getFallbackComplaintClassification(
  now: Date = new Date(),
): ComplaintClassificationFields {
  return {
    category: COMPLAINT_FALLBACK_CATEGORY,
    priority: COMPLAINT_FALLBACK_PRIORITY,
    classificationStatus: "needs_review",
    classificationSource: "fallback",
    classifiedAt: now,
  };
}
