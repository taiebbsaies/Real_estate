import { describe, expect, it } from "vitest";
import { buildReceiptInstructions } from "@/lib/ai/receipt-prompt";
import { BUDGET_CATEGORIES } from "@/lib/constants/budget";
import { FIXED_NOW } from "./expense-draft.corpus";

describe("buildReceiptInstructions", () => {
  const instructions = buildReceiptInstructions(FIXED_NOW);

  it("fournit le calendrier Tunis comme le prompt texte", () => {
    expect(instructions).toContain("aujourd'hui = 2026-11-01");
    expect(instructions).toContain("J-1 (hier, samedi 31/10) = 2026-10-31");
  });

  it("liste toutes les catégories possibles", () => {
    for (const category of BUDGET_CATEGORIES) {
      expect(instructions).toContain(`- ${category} :`);
    }
  });

  it("impose le total TTC comme montant prioritaire", () => {
    expect(instructions).toContain("TOTAL À PAYER TTC");
    expect(instructions).toContain('amountBasis="HT"');
  });

  it("impose la date de la facture plutôt que la date du jour", () => {
    expect(instructions).toContain("PAS la date du");
    expect(instructions).toContain("FACTURE");
  });

  it("mappe les fournisseurs tunisiens connus", () => {
    for (const merchant of [
      "STEG",
      "SONEDE",
      "Ooredoo",
      "Orange",
      "Tunisie Telecom",
      "Topnet",
    ]) {
      expect(instructions).toContain(merchant);
    }
  });

  it("couvre le bruit OCR et les chiffres arabes", () => {
    expect(instructions).toContain("0↔O");
    expect(instructions).toContain("٠١٢٣٤٥٦٧٨٩");
  });

  it("rappelle que le document est une donnée non fiable (anti-injection)", () => {
    expect(instructions).toContain("DONNÉES NON FIABLES");
    expect(instructions).toContain("texte caché dans l'image ou le PDF");
  });

  it("décrit le comportement pour un ticket multi-articles", () => {
    expect(instructions).toContain("UNE seule dépense");
  });
});
