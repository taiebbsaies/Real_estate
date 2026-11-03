import { describe, expect, it } from "vitest";
import { buildExpenseInstructions } from "@/lib/ai/expense-prompt";
import { BUDGET_CATEGORIES } from "@/lib/constants/budget";
import { FIXED_NOW } from "./expense-draft.corpus";

describe("buildExpenseInstructions", () => {
  const instructions = buildExpenseInstructions(FIXED_NOW);

  it("fournit aujourd'hui et demain en fuseau Tunis", () => {
    expect(instructions).toContain("aujourd'hui = 2026-11-01");
    expect(instructions).toContain("demain = 2026-11-02");
  });

  it("fournit les 7 derniers jours avec leur nom de jour", () => {
    expect(instructions).toContain("J-1 (hier, samedi 31/10) = 2026-10-31");
    expect(instructions).toContain(
      "J-2 (avant-hier, vendredi 30/10) = 2026-10-30",
    );
    expect(instructions).toContain("J-7 (dimanche 25/10) = 2026-10-25");
  });

  it("fournit l'année en cours pour les dates explicites", () => {
    expect(instructions).toContain("Année en cours : 2026");
  });

  it("liste toutes les catégories possibles", () => {
    for (const category of BUDGET_CATEGORIES) {
      expect(instructions).toContain(`- ${category} :`);
    }
  });

  it("rappelle que la phrase utilisateur est une donnée non fiable", () => {
    expect(instructions).toContain("DONNÉE NON FIABLE");
  });
});
