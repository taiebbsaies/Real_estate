import { describe, expect, it } from "vitest";
import { budgetSchema } from "@/lib/validations/budget";
import { BUDGET_CATEGORIES } from "@/lib/constants/budget";

const VALID_BUDGET = {
  month: "2026-11",
  limit: "1 100,000",
};

describe("budgetSchema categoryLimits", () => {
  it("accepte un budget sans plafonds de catégorie", () => {
    const result = budgetSchema.safeParse({
      ...VALID_BUDGET,
      categoryLimits: Object.fromEntries(
        BUDGET_CATEGORIES.map((category) => [category, undefined]),
      ),
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.categoryLimits).toBeUndefined();
  });

  it("convertit les montants valides en millimes", () => {
    const result = budgetSchema.safeParse({
      ...VALID_BUDGET,
      categoryLimits: {
        LOYER: "300",
        ENERGIE: 85.5,
        INTERNET: "60,500",
      },
    });

    expect(result.success && result.data.categoryLimits).toEqual({
      LOYER: 300_000,
      ENERGIE: 85_500,
      INTERNET: 60_500,
    });
  });

  it("ignore les champs vides et renvoie undefined si tout est vide", () => {
    const result = budgetSchema.safeParse({
      ...VALID_BUDGET,
      categoryLimits: { LOYER: "300", INTERNET: "" },
    });

    expect(result.success && result.data.categoryLimits).toEqual({
      LOYER: 300_000,
    });

    const allEmpty = budgetSchema.safeParse({
      ...VALID_BUDGET,
      categoryLimits: { LOYER: "", ENERGIE: "" },
    });

    expect(allEmpty.success && allEmpty.data.categoryLimits).toBeUndefined();
  });

  it("retire les catégories inconnues", () => {
    const result = budgetSchema.safeParse({
      ...VALID_BUDGET,
      categoryLimits: { FOO: "50", LOYER: "300" },
    });

    expect(result.success && result.data.categoryLimits).toEqual({
      LOYER: 300_000,
    });
  });

  it("accepte chaque catégorie connue", () => {
    for (const category of BUDGET_CATEGORIES) {
      const result = budgetSchema.safeParse({
        ...VALID_BUDGET,
        categoryLimits: { [category]: "100" },
      });

      expect(result.success && result.data.categoryLimits).toEqual({
        [category]: 100_000,
      });
    }
  });

  it("rejette un plafond de catégorie nul ou invalide", () => {
    for (const invalid of ["0", "abc", "-5"]) {
      const result = budgetSchema.safeParse({
        ...VALID_BUDGET,
        categoryLimits: { LOYER: invalid },
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.flatten().fieldErrors.categoryLimits).toEqual([
          "Le plafond de catégorie doit être supérieur à 0.",
        ]);
      }
    }
  });
});
