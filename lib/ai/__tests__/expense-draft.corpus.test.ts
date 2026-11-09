import { describe, expect, it } from "vitest";
import { toExpenseDraft } from "@/lib/ai/expense-draft";
import { CORPUS, FIXED_NOW } from "./expense-draft.corpus";

describe("corpus de phrases — post-traitement toExpenseDraft", () => {
  for (const testCase of CORPUS) {
    it(`« ${testCase.phrase} »`, () => {
      const result = toExpenseDraft(testCase.llmOutput, FIXED_NOW);

      if (!testCase.expected.ok) {
        expect(result).toEqual({ ok: false, reason: testCase.expected.reason });
        return;
      }

      if (!result.ok) {
        throw new Error("Un brouillon était attendu pour cette phrase.");
      }

      expect(result.draft.amount).toBe(testCase.expected.amount);
      expect(result.draft.date).toBe(testCase.expected.date);
      expect(result.draft.category).toBe(testCase.expected.category);
      expect([...result.draft.uncertainFields].sort()).toEqual(
        [...testCase.expected.uncertainFields].sort(),
      );
      expect(result.draft.multipleExpenses).toBe(
        testCase.expected.multipleExpenses,
      );
    });
  }
});
