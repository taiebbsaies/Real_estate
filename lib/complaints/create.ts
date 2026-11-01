import type {
  ComplaintClassificationErrorCode,
  ComplaintClassificationState,
} from "@/lib/ai/types";
import {
  getAiComplaintClassification,
  getFallbackComplaintClassification,
  type ComplaintClassificationFields,
} from "@/lib/complaints/classification";

export type CreateComplaintRecord = {
  tenantId: string;
  title: string;
  description: string;
  propertyId?: string;
  clientKey?: string;
  status: "pending";
} & ComplaintClassificationFields;

export type CreateComplaintDependencies = {
  /** True when this tenant already stored a complaint with this client key. */
  findExisting: (input: {
    tenantId: string;
    clientKey: string;
  }) => Promise<boolean>;
  create: (record: CreateComplaintRecord) => Promise<unknown>;
  classify: (input: {
    title: string;
    description: string;
  }) => Promise<ComplaintClassificationState>;
  /** Injectable for deterministic tests. */
  now?: () => Date;
};

export type CreateComplaintResult =
  | { status: "duplicate" }
  | {
      status: "created";
      classification: ComplaintClassificationFields;
      /** Present when the AI failed and the safe fallback was used. */
      classificationFailure?: ComplaintClassificationErrorCode;
    }
  | { status: "failed"; error: unknown };

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

/**
 * Core submission workflow, independent from authentication and Next.js:
 *
 * 1. A client key already stored means the retry is a duplicate: no second AI
 *    call and no second complaint.
 * 2. Classification runs before the insert. Any provider failure is converted
 *    into safe enum fallbacks marked "needs_review".
 * 3. The complaint is always saved, even when classification failed.
 * 4. A concurrent retry that loses the unique-index race is reported as a
 *    duplicate instead of an error.
 */
export async function createComplaintWithClassification(
  input: {
    tenantId: string;
    title: string;
    description: string;
    propertyId?: string;
    clientKey?: string;
  },
  deps: CreateComplaintDependencies,
): Promise<CreateComplaintResult> {
  if (input.clientKey) {
    const exists = await deps.findExisting({
      tenantId: input.tenantId,
      clientKey: input.clientKey,
    });
    if (exists) return { status: "duplicate" };
  }

  let classificationState: ComplaintClassificationState;
  try {
    classificationState = await deps.classify({
      title: input.title,
      description: input.description,
    });
  } catch {
    classificationState = {
      ok: false,
      code: "provider_error",
      message: "Le service de classification automatique est indisponible.",
    };
  }

  const now = deps.now?.() ?? new Date();
  const classification = classificationState.ok
    ? getAiComplaintClassification(classificationState.classification, now)
    : getFallbackComplaintClassification(now);

  const record: CreateComplaintRecord = {
    tenantId: input.tenantId,
    title: input.title,
    description: input.description,
    ...(input.propertyId ? { propertyId: input.propertyId } : {}),
    ...(input.clientKey ? { clientKey: input.clientKey } : {}),
    ...classification,
    status: "pending",
  };

  try {
    await deps.create(record);
  } catch (error: unknown) {
    if (input.clientKey && isDuplicateKeyError(error)) {
      return { status: "duplicate" };
    }
    return { status: "failed", error };
  }

  return {
    status: "created",
    classification,
    ...(classificationState.ok
      ? {}
      : { classificationFailure: classificationState.code }),
  };
}
