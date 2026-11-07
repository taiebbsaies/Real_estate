import { describe, expect, it } from "vitest";
import {
  buildMonthlySummaryInstructions,
  buildPredictiveAlertsInstructions,
} from "@/lib/ai/insight-prompt";

describe("buildMonthlySummaryInstructions", () => {
  it("interdit tout calcul et impose les montants fournis", () => {
    const instructions = buildMonthlySummaryInstructions();

    expect(instructions).toContain("tu ne calcules rien");
    expect(instructions).toContain("EXACTEMENT celui du JSON");
    expect(instructions).toContain("TND");
    expect(instructions).toContain("n'inventes aucun chiffre");
  });

  it("fixe le format attendu du résumé", () => {
    const instructions = buildMonthlySummaryInstructions();

    expect(instructions).toContain("4 à 6 lignes en français");
    expect(instructions).toContain("vouvoiement");
    expect(instructions).toContain("maximum 500 caractères");
    expect(instructions).toContain("Pas de markdown");
    expect(instructions).toContain("aucune prédiction absente du JSON");
  });

  it("conditionne la comparaison au mois précédent", () => {
    const instructions = buildMonthlySummaryInstructions();

    expect(instructions).toContain("hasComparison est true");
    expect(instructions).toContain("ne mentionne aucunement le mois précédent");
    expect(instructions).toContain("overshootRisk est true");
  });
});

describe("buildPredictiveAlertsInstructions", () => {
  it("interdit tout calcul et impose les montants fournis", () => {
    const instructions = buildPredictiveAlertsInstructions();

    expect(instructions).toContain("tu ne calcules rien");
    expect(instructions).toContain("EXACTEMENT celui du JSON");
    expect(instructions).toContain("TND");
  });

  it("impose une alerte par catégorie avec la trame vouvoiement", () => {
    const instructions = buildPredictiveAlertsInstructions();

    expect(instructions).toContain("vouvoiement");
    expect(instructions).toContain("CHAQUE alerte du JSON");
    expect(instructions).toContain("crossingDay");
    expect(instructions).toContain("overshootTnd");
    expect(instructions).toContain(
      "vous dépasserez votre budget {label} vers le {crossingDay}",
    );
    expect(instructions).toContain("aucun conseil non sollicité");
  });
});
