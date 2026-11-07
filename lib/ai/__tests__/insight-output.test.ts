import { describe, expect, it } from "vitest";
import {
  collectAllowedAmounts,
  extractTndAmounts,
  validateMonthlySummaryOutput,
  validatePredictiveAlertsOutput,
} from "@/lib/ai/insight-output";
import { buildMonthlySummaryData } from "@/lib/budget/insights";
import { buildCategoryProjections } from "@/lib/budget/projections";
import {
  CURRENT,
  EXPENSES,
  MONTH,
  NOW,
  PREVIOUS,
  expense,
} from "@/lib/budget/__tests__/fixtures";

function buildData() {
  return buildMonthlySummaryData({
    month: MONTH,
    now: NOW,
    current: CURRENT,
    previous: PREVIOUS,
    expenses: EXPENSES,
  });
}

function buildAlertProjections() {
  return buildCategoryProjections({
    totalsByCategory: { DIVERS: 40_000, ENERGIE: 110_000 },
    expenses: [
      expense({ id: "d1", amount: 25_000, category: "DIVERS" }),
      expense({ id: "d2", amount: 15_000, category: "DIVERS" }),
      expense({ id: "e1", amount: 110_000, category: "ENERGIE" }),
    ],
    categoryLimits: { DIVERS: 100_000, ENERGIE: 100_000 },
    dayOfMonth: 10,
    daysOfTheMonth: 30,
  }).alerts;
}

describe("extractTndAmounts", () => {
  it("extrait les montants suivis de TND", () => {
    expect(extractTndAmounts("40,000 TND puis 1 200 TND.")).toEqual([
      "40,000",
      "1 200",
    ]);
  });

  it("ignore les pourcentages et les jours", () => {
    expect(extractTndAmounts("66,7 % utilisés, 15 jours restants.")).toEqual(
      [],
    );
  });

  it("normalise les espaces insécables", () => {
    expect(extractTndAmounts("100,000\u202FTND")).toEqual(["100,000"]);
  });
});

describe("collectAllowedAmounts", () => {
  it("contient tous les montants des données, sans signe", () => {
    const allowed = collectAllowedAmounts(buildData());

    expect(allowed.has("100,000")).toBe(true);
    expect(allowed.has("150,000")).toBe(true);
    expect(allowed.has("200,000")).toBe(true);
    expect(allowed.has("50,000")).toBe(true);
    expect(allowed.has("170,000")).toBe(true);
    expect(allowed.has("20,000")).toBe(true);
    expect(allowed.has("0,000")).toBe(true);
    expect(allowed.has("12,000")).toBe(true);
    expect(allowed.has("99,999")).toBe(false);
  });
});

describe("validateMonthlySummaryOutput", () => {
  it("accepte un résumé dont les montants figurent dans les données", () => {
    const result = validateMonthlySummaryOutput(
      "  Vous avez dépensé 100,000 TND sur un plafond de 150,000 TND (66,7 %).\nIl reste 50,000 TND pour 15 jours.  ",
      buildData(),
    );

    expect(result).toEqual({
      ok: true,
      text: "Vous avez dépensé 100,000 TND sur un plafond de 150,000 TND (66,7 %).\nIl reste 50,000 TND pour 15 jours.",
    });
  });

  it("accepte les montants préfixés d'un signe ou d'une approximation", () => {
    const result = validateMonthlySummaryOutput(
      "Hausse de +20,000 TND, projection ≈ 170,000 TND.",
      buildData(),
    );

    expect(result.ok).toBe(true);
  });

  it("rejette un montant absent des données", () => {
    const result = validateMonthlySummaryOutput(
      "Un total de 99,999 TND ce mois-ci.",
      buildData(),
    );

    expect(result).toEqual({ ok: false, reason: "unknown_amount" });
  });

  it("rejette un montant au format modifié", () => {
    const result = validateMonthlySummaryOutput(
      "Vous avez dépensé 40 TND.",
      buildData(),
    );

    expect(result).toEqual({ ok: false, reason: "unknown_amount" });
  });

  it("rejette un montant avec séparateur de milliers incorrect", () => {
    const result = validateMonthlySummaryOutput(
      "Vous avez dépensé 1 200 TND.",
      buildData(),
    );

    expect(result).toEqual({ ok: false, reason: "unknown_amount" });
  });

  it("rejette un résumé vide", () => {
    expect(validateMonthlySummaryOutput("   ", buildData())).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("rejette un résumé trop long", () => {
    const result = validateMonthlySummaryOutput("a".repeat(601), buildData());

    expect(result).toEqual({ ok: false, reason: "too_long" });
  });
});

describe("validatePredictiveAlertsOutput", () => {
  it("accepte des messages dont les montants correspondent à leur catégorie", () => {
    const projections = buildAlertProjections();

    const result = validatePredictiveAlertsOutput(
      [
        {
          key: "DIVERS",
          text: "À ce rythme, vous dépasserez votre budget Divers vers le 25 (≈ +20,000 TND au-dessus du plafond).",
        },
        {
          key: "ENERGIE",
          text: "Budget Électricité/Eau/Gaz dépassé de 10,000 TND.",
        },
      ],
      projections,
    );

    expect(result).toEqual({
      ok: true,
      texts: {
        DIVERS:
          "À ce rythme, vous dépasserez votre budget Divers vers le 25 (≈ +20,000 TND au-dessus du plafond).",
        ENERGIE: "Budget Électricité/Eau/Gaz dépassé de 10,000 TND.",
      },
    });
  });

  it("rejette le montant d'une autre catégorie", () => {
    const result = validatePredictiveAlertsOutput(
      [
        { key: "DIVERS", text: "Dépenses déjà à hauteur de 110,000 TND." },
        { key: "ENERGIE", text: "Budget dépassé de 10,000 TND." },
      ],
      buildAlertProjections(),
    );

    expect(result).toEqual({ ok: false, reason: "unknown_amount" });
  });

  it("rejette un montant inconnu", () => {
    const result = validatePredictiveAlertsOutput(
      [
        { key: "DIVERS", text: "Excès estimé à 99,999 TND." },
        { key: "ENERGIE", text: "Budget dépassé de 10,000 TND." },
      ],
      buildAlertProjections(),
    );

    expect(result).toEqual({ ok: false, reason: "unknown_amount" });
  });

  it("rejette une clé manquante", () => {
    const result = validatePredictiveAlertsOutput(
      [{ key: "DIVERS", text: "Alerte avec 40,000 TND dépensés." }],
      buildAlertProjections(),
    );

    expect(result).toEqual({ ok: false, reason: "missing_keys" });
  });

  it("rejette une clé inconnue ou dupliquée", () => {
    const projections = buildAlertProjections();

    expect(
      validatePredictiveAlertsOutput(
        [
          { key: "DIVERS", text: "Alerte." },
          { key: "ENERGIE", text: "Alerte." },
          { key: "INTERNET", text: "Alerte." },
        ],
        projections,
      ),
    ).toEqual({ ok: false, reason: "unknown_key" });

    expect(
      validatePredictiveAlertsOutput(
        [
          { key: "DIVERS", text: "Alerte 40,000 TND." },
          { key: "DIVERS", text: "Alerte 40,000 TND." },
          { key: "ENERGIE", text: "Alerte 10,000 TND." },
        ],
        projections,
      ),
    ).toEqual({ ok: false, reason: "unknown_key" });
  });

  it("rejette un message vide ou trop long", () => {
    const projections = buildAlertProjections();

    expect(
      validatePredictiveAlertsOutput(
        [
          { key: "DIVERS", text: "   " },
          { key: "ENERGIE", text: "Alerte." },
        ],
        projections,
      ),
    ).toEqual({ ok: false, reason: "empty_text" });

    expect(
      validatePredictiveAlertsOutput(
        [
          { key: "DIVERS", text: "a".repeat(301) },
          { key: "ENERGIE", text: "Alerte." },
        ],
        projections,
      ),
    ).toEqual({ ok: false, reason: "too_long" });
  });
});
