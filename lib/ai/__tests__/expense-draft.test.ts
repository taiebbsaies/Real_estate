import { describe, expect, it } from "vitest";
import {
  aiExpenseDraftSchema,
  toExpenseDraft,
  type AiExpenseDraft,
} from "@/lib/ai/expense-draft";
import { FIXED_NOW } from "./expense-draft.corpus";

const TODAY = "2026-11-01";

function draft(overrides: Partial<AiExpenseDraft>): AiExpenseDraft {
  return {
    amountTnd: null,
    dateIso: null,
    category: "DIVERS",
    note: null,
    missingFields: [],
    confidence: "high",
    multipleExpenses: false,
    ...overrides,
  };
}

describe("toExpenseDraft", () => {
  it("rejette un montant manquant seul", () => {
    const result = toExpenseDraft(
      draft({ missingFields: ["amountTnd"] }),
      FIXED_NOW,
    );
    expect(result).toEqual({ ok: false, reason: "amount_missing" });
  });

  it("rejette comme hors sujet quand montant, date et catégorie manquent", () => {
    const result = toExpenseDraft(
      draft({ missingFields: ["amountTnd", "dateIso", "category"] }),
      FIXED_NOW,
    );
    expect(result).toEqual({ ok: false, reason: "not_an_expense" });
  });

  it("rejette un montant négatif", () => {
    const result = toExpenseDraft(draft({ amountTnd: -20 }), FIXED_NOW);
    expect(result).toEqual({ ok: false, reason: "amount_invalid" });
  });

  it("rejette un montant nul", () => {
    const result = toExpenseDraft(draft({ amountTnd: 0 }), FIXED_NOW);
    expect(result).toEqual({ ok: false, reason: "amount_invalid" });
  });

  it("rejette un montant non fini", () => {
    const result = toExpenseDraft(draft({ amountTnd: Number.NaN }), FIXED_NOW);
    expect(result).toEqual({ ok: false, reason: "amount_invalid" });
  });

  it("convertit les dinars décimaux en millimes affichables", () => {
    const result = toExpenseDraft(
      draft({ amountTnd: 85.5, dateIso: TODAY, category: "ENERGIE" }),
      FIXED_NOW,
    );
    expect(result).toEqual({
      ok: true,
      draft: {
        amount: "85,500",
        date: TODAY,
        category: "ENERGIE",
        note: "",
        uncertainFields: [],
        multipleExpenses: false,
      },
    });
  });

  it("complète une date absente par la date du jour (Tunis)", () => {
    const result = toExpenseDraft(
      draft({ amountTnd: 85, dateIso: null }),
      FIXED_NOW,
    );
    expect(result.ok && result.draft.date).toBe(TODAY);
  });

  it("replie sur la date du jour pour une date de calendrier invalide", () => {
    const result = toExpenseDraft(
      draft({ amountTnd: 85, dateIso: "2026-02-31" }),
      FIXED_NOW,
    );
    expect(result.ok && result.draft.date).toBe(TODAY);
    expect(result.ok && result.draft.uncertainFields).toContain("date");
  });

  it("replie sur la date du jour pour un mois invalide", () => {
    const result = toExpenseDraft(
      draft({ amountTnd: 85, dateIso: "2026-13-32" }),
      FIXED_NOW,
    );
    expect(result.ok && result.draft.date).toBe(TODAY);
    expect(result.ok && result.draft.uncertainFields).toContain("date");
  });

  it("marque une date future comme incertaine sans la rejeter", () => {
    const result = toExpenseDraft(
      draft({ amountTnd: 800, dateIso: "2026-11-02", category: "LOYER" }),
      FIXED_NOW,
    );
    expect(result.ok && result.draft.date).toBe("2026-11-02");
    expect(result.ok && result.draft.uncertainFields).toContain("date");
  });

  it("mappe missingFields vers les noms de champs de l'UI", () => {
    const result = toExpenseDraft(
      draft({
        amountTnd: 85,
        dateIso: TODAY,
        missingFields: ["amountTnd", "dateIso", "category"],
      }),
      FIXED_NOW,
    );
    expect(result.ok && result.draft.uncertainFields).toEqual([
      "amount",
      "date",
      "category",
    ]);
  });

  it("transforme une note null en chaîne vide", () => {
    const result = toExpenseDraft(
      draft({ amountTnd: 85, dateIso: TODAY, note: null }),
      FIXED_NOW,
    );
    expect(result.ok && result.draft.note).toBe("");
  });

  it("conserve le flag multipleExpenses", () => {
    const result = toExpenseDraft(
      draft({ amountTnd: 50, dateIso: TODAY, multipleExpenses: true }),
      FIXED_NOW,
    );
    expect(result.ok && result.draft.multipleExpenses).toBe(true);
  });

  it("guide le modèle : jamais de montant inventé dans la description du schéma", () => {
    expect(aiExpenseDraftSchema.shape.amountTnd.description).toContain(
      "n'invente jamais un montant",
    );
  });
});
