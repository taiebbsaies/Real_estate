import { describe, expect, it } from "vitest";
import { toReceiptDraft } from "@/lib/ai/expense-draft";
import { RECEIPT_CORPUS } from "./receipt-draft.corpus";
import { FIXED_NOW } from "./expense-draft.corpus";

describe("corpus de justificatifs — post-traitement toReceiptDraft", () => {
  for (const testCase of RECEIPT_CORPUS) {
    it(`« ${testCase.document} »`, () => {
      const result = toReceiptDraft(testCase.llmOutput, FIXED_NOW);

      if (!testCase.expected.ok) {
        expect(result).toEqual({ ok: false, reason: testCase.expected.reason });
        return;
      }

      if (!result.ok) {
        throw new Error("Un brouillon était attendu pour ce justificatif.");
      }

      expect(result.draft.amount).toBe(testCase.expected.amount);
      expect(result.draft.date).toBe(testCase.expected.date);
      expect(result.draft.category).toBe(testCase.expected.category);
      expect(result.draft.note).toBe(testCase.expected.note);
      expect([...result.draft.uncertainFields].sort()).toEqual(
        [...testCase.expected.uncertainFields].sort(),
      );
      expect(result.draft.multipleExpenses).toBe(
        testCase.expected.multipleExpenses,
      );
    });
  }
});
