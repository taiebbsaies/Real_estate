#!/usr/bin/env node
/**
 * Verification for the automatic complaint submission workflow.
 *
 * Usage (from the repository root):
 *   npx --yes tsx scripts/verify-complaint-workflow.ts
 *
 * No database or AI provider is used: the workflow is exercised with fake
 * dependencies so retries, AI failures and persistence can be checked exactly.
 */
import assert from "node:assert/strict";
import {
  createComplaintWithClassification,
  type CreateComplaintDependencies,
  type CreateComplaintRecord,
} from "../lib/complaints/create";
import type { ComplaintClassificationState } from "../lib/ai/types";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
} from "../lib/constants/complaint";

const EXPLANATION =
  "La description mentionne une fuite active qui peut endommager le logement.";
const ACTION = "Envoyer un plombier vérifier la fuite et couper l'alimentation.";

const aiSuccess: ComplaintClassificationState = {
  ok: true,
  classification: {
    category: "plumbing",
    priority: "high",
    explanation: EXPLANATION,
    recommendedAction: ACTION,
  },
};

function harness(options: {
  existingKeys?: Set<string>;
  classify?: () => Promise<ComplaintClassificationState>;
  create?: (record: CreateComplaintRecord) => Promise<unknown>;
}) {
  const existingKeys = options.existingKeys ?? new Set<string>();
  const created: CreateComplaintRecord[] = [];
  let classifyCalls = 0;

  const deps: CreateComplaintDependencies = {
    findExisting: async ({ clientKey }) => existingKeys.has(clientKey),
    classify: async () => {
      classifyCalls += 1;
      return options.classify
        ? options.classify()
        : Promise.resolve(aiSuccess);
    },
    create: async (record) => {
      created.push(record);
      if (options.create) return options.create(record);
      return record;
    },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  };

  return {
    deps,
    created,
    get classifyCalls() {
      return classifyCalls;
    },
  };
}

async function main() {
  const baseInput = {
    tenantId: "64b000000000000000000001",
    title: "Fuite d'eau",
    description: "De l'eau fuit du plafond de la salle de bain.",
    clientKey: "offline-key-123",
  };

  // 1. AI success: one complaint, classification persisted, no fallback flag.
  {
    const h = harness({});
    const result = await createComplaintWithClassification(baseInput, h.deps);
    assert.equal(result.status, "created");
    if (result.status === "created") {
      assert.equal(result.classificationFailure, undefined);
    }
    assert.equal(h.classifyCalls, 1);
    assert.equal(h.created.length, 1);
    const record = h.created[0];
    assert.equal(record.category, "plumbing");
    assert.equal(record.priority, "high");
    assert.equal(record.classificationStatus, "completed");
    assert.equal(record.classificationSource, "ai");
    assert.equal(record.aiExplanation, EXPLANATION);
    assert.equal(record.recommendedAction, ACTION);
    assert.equal(record.status, "pending");
    assert.equal(record.clientKey, "offline-key-123");
  }

  // 2. Duplicate pre-check: no AI call, no second insert.
  {
    const existing = new Set([baseInput.clientKey]);
    const h = harness({ existingKeys: existing });
    const result = await createComplaintWithClassification(baseInput, h.deps);
    assert.equal(result.status, "duplicate");
    assert.equal(h.classifyCalls, 0);
    assert.equal(h.created.length, 0);
  }

  // 3. Retry after a successful insert: the same key is reported as duplicate
  //    and the provider is not called again.
  {
    const existing = new Set<string>();
    const h = harness({
      existingKeys: existing,
      create: async (record) => {
        existing.add(record.clientKey ?? "");
        return record;
      },
    });
    const first = await createComplaintWithClassification(baseInput, h.deps);
    const second = await createComplaintWithClassification(baseInput, h.deps);
    assert.equal(first.status, "created");
    assert.equal(second.status, "duplicate");
    assert.equal(h.classifyCalls, 1);
    assert.equal(h.created.length, 1);
  }

  // 4. Provider failure: the complaint is still saved with safe enum values
  //    and is flagged for staff review.
  {
    const h = harness({
      classify: async () => ({
        ok: false,
        code: "timeout",
        message: "timeout",
      }),
    });
    const result = await createComplaintWithClassification(baseInput, h.deps);
    assert.equal(result.status, "created");
    if (result.status === "created") {
      assert.equal(result.classificationFailure, "timeout");
    }
    assert.equal(h.created.length, 1);
    const record = h.created[0];
    assert.equal(record.category, "other");
    assert.equal(record.priority, "medium");
    assert.equal(record.classificationStatus, "needs_review");
    assert.equal(record.classificationSource, "fallback");
    assert.equal(record.aiExplanation, undefined);
    assert.equal(record.recommendedAction, undefined);
    assert.ok(COMPLAINT_CATEGORIES.includes(record.category));
    assert.ok(COMPLAINT_PRIORITIES.includes(record.priority));
  }

  // 5. Classifier throws unexpectedly: still saved, still marked for review.
  {
    const h = harness({
      classify: async () => {
        throw new Error("network exploded");
      },
    });
    const result = await createComplaintWithClassification(baseInput, h.deps);
    assert.equal(result.status, "created");
    if (result.status === "created") {
      assert.equal(result.classificationFailure, "provider_error");
    }
    assert.equal(h.created[0].classificationStatus, "needs_review");
    assert.equal(h.created[0].classificationSource, "fallback");
  }

  // 6. Unique-index race: a duplicate-key error from the insert is reported as
  //    a duplicate, not as a failed complaint.
  {
    const h = harness({
      create: async () => {
        throw Object.assign(new Error("duplicate"), { code: 11000 });
      },
    });
    const result = await createComplaintWithClassification(baseInput, h.deps);
    assert.equal(result.status, "duplicate");
  }

  // 7. A genuine database error is surfaced to the caller.
  {
    const h = harness({
      create: async () => {
        throw new Error("database down");
      },
    });
    const result = await createComplaintWithClassification(baseInput, h.deps);
    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.match(String(result.error), /database down/);
    }
  }

  // 8. Complaints without a client key still work (online form before the key
  //    is attached is not a real path, but the workflow must not require it).
  {
    const h = harness({});
    const result = await createComplaintWithClassification(
      { ...baseInput, clientKey: undefined },
      h.deps,
    );
    assert.equal(result.status, "created");
    assert.equal(h.created[0].clientKey, undefined);
  }

  console.log("✔ Automatic classification is persisted on success");
  console.log("✔ Offline duplicate is skipped before any AI call");
  console.log("✔ Retrying after a successful insert does not duplicate the AI work");
  console.log("✔ AI failure still saves the complaint with fallback values");
  console.log("✔ Unexpected classifier errors still save the complaint");
  console.log("✔ Duplicate-key race is treated as a duplicate");
  console.log("✔ Genuine persistence errors are surfaced");
  console.log("✔ Submission works with or without a client key");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
