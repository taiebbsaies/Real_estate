import { describe, expect, it } from "vitest";
import {
  buildInsightFingerprint,
  buildMonthlySummaryData,
  buildTemplateSummary,
  toInsightFingerprintInput,
  type BuildMonthlySummaryDataArgs,
} from "@/lib/budget/insights";
import {
  CURRENT,
  EXPENSES,
  MONTH,
  NOW,
  PREVIOUS,
  monthSummary,
} from "@/lib/budget/__tests__/fixtures";

const BASE_INPUT = {
  budgetUpdatedAt: "2026-11-01T10:00:00.000Z",
  expenseCount: 3,
  spentTotal: 85_000,
  maxExpenseUpdatedAt: "2026-11-05T08:30:00.000Z",
};

function buildData(overrides: Partial<BuildMonthlySummaryDataArgs> = {}) {
  return buildMonthlySummaryData({
    month: MONTH,
    now: NOW,
    current: CURRENT,
    previous: PREVIOUS,
    expenses: EXPENSES,
    ...overrides,
  });
}

describe("buildInsightFingerprint", () => {
  it("joint les composants dans un ordre stable", () => {
    expect(buildInsightFingerprint(BASE_INPUT)).toBe(
      "2026-11-01T10:00:00.000Z|3|85000|2026-11-05T08:30:00.000Z",
    );
  });

  it("est déterministe pour des entrées identiques", () => {
    expect(buildInsightFingerprint(BASE_INPUT)).toBe(
      buildInsightFingerprint({ ...BASE_INPUT }),
    );
  });

  it("change si le budget est modifié", () => {
    expect(
      buildInsightFingerprint({
        ...BASE_INPUT,
        budgetUpdatedAt: "2026-11-02T10:00:00.000Z",
      }),
    ).not.toBe(buildInsightFingerprint(BASE_INPUT));
  });

  it("change si le nombre de dépenses change", () => {
    expect(
      buildInsightFingerprint({ ...BASE_INPUT, expenseCount: 4 }),
    ).not.toBe(buildInsightFingerprint(BASE_INPUT));
  });

  it("change si le total dépensé change", () => {
    expect(
      buildInsightFingerprint({ ...BASE_INPUT, spentTotal: 86_000 }),
    ).not.toBe(buildInsightFingerprint(BASE_INPUT));
  });

  it("change si la dernière dépense modifiée change", () => {
    expect(
      buildInsightFingerprint({
        ...BASE_INPUT,
        maxExpenseUpdatedAt: "2026-11-06T08:30:00.000Z",
      }),
    ).not.toBe(buildInsightFingerprint(BASE_INPUT));
  });

  it("utilise « none » en l'absence de budget ou de dépenses", () => {
    expect(
      buildInsightFingerprint({
        budgetUpdatedAt: null,
        expenseCount: 0,
        spentTotal: 0,
        maxExpenseUpdatedAt: null,
      }),
    ).toBe("none|0|0|none");
  });

  it("distingue un budget absent d'un budget présent", () => {
    expect(
      buildInsightFingerprint({ ...BASE_INPUT, budgetUpdatedAt: null }),
    ).not.toBe(buildInsightFingerprint(BASE_INPUT));
  });
});

describe("buildMonthlySummaryData", () => {
  it("structure le mois et le budget avec prévision de fin de mois", () => {
    const data = buildData();

    expect(data.month).toBe("2026-11");
    expect(data.monthLabel).toBe("Novembre 2026");
    expect(data.prevMonthLabel).toBe("Octobre 2026");
    expect(data.dayOfMonth).toBe(15);
    expect(data.daysInMonth).toBe(30);
    expect(data.currency).toBe("TND");
    expect(data.budget).toEqual({
      limitTnd: "150,000",
      incomeTnd: "200,000",
      spentTnd: "100,000",
      remainingTnd: "50,000",
      percentUsed: 66.7,
      alertLevel: "normal",
      forecastTnd: "170,000",
      overshootRisk: true,
      overshootTnd: "+20,000",
    });
  });

  it("trie les catégories par montant décroissant avec deltas", () => {
    const data = buildData();

    expect(data.categories.map((category) => category.key)).toEqual([
      "ENERGIE",
      "LOYER",
      "DIVERS",
      "INTERNET",
    ]);
    expect(data.categories[0]).toEqual({
      key: "ENERGIE",
      label: "Électricité/Eau/Gaz",
      spentTnd: "40,000",
      share: 40,
      prevSpentTnd: "20,000",
      deltaTnd: "+20,000",
      deltaPercent: 100,
    });
    expect(data.categories[1].deltaTnd).toBe("0,000");
    expect(data.categories[1].deltaPercent).toBe(0);
    expect(data.categories[2].prevSpentTnd).toBe("0,000");
    expect(data.categories[2].deltaPercent).toBeNull();
    expect(data.categories[3]).toEqual({
      key: "INTERNET",
      label: "Internet",
      spentTnd: "10,000",
      share: 10,
      prevSpentTnd: "25,000",
      deltaTnd: "-15,000",
      deltaPercent: -60,
    });
  });

  it("sélectionne les 3 plus grosses dépenses sans exposer les notes", () => {
    const data = buildData();

    expect(data.topExpenses).toHaveLength(3);
    expect(data.topExpenses.map((item) => item.amountTnd)).toEqual([
      "40,000",
      "30,000",
      "12,000",
    ]);
    expect(data.topExpenses[0]).toEqual({
      category: "ENERGIE",
      label: "Électricité/Eau/Gaz",
      amountTnd: "40,000",
      dateIso: "2026-11-05",
    });
    for (const item of data.topExpenses) {
      expect(Object.hasOwn(item, "note")).toBe(false);
    }
  });

  it("identifie les notables au-dessus des seuils", () => {
    const data = buildData();

    expect(data.notables.hasComparison).toBe(true);
    expect(data.notables.biggestIncrease).toEqual({
      key: "ENERGIE",
      label: "Électricité/Eau/Gaz",
      deltaTnd: "+20,000",
    });
    expect(data.notables.biggestDecrease).toEqual({
      key: "INTERNET",
      label: "Internet",
      deltaTnd: "-15,000",
    });
    expect(data.notables.newCategory).toEqual({
      key: "DIVERS",
      label: "Divers",
      spentTnd: "20,000",
    });
  });

  it("ignore les variations non significatives", () => {
    const data = buildData({
      previous: monthSummary({
        budget: PREVIOUS.budget,
        spent: 101_000,
        totalsByCategory: {
          ENERGIE: 38_000,
          LOYER: 30_000,
          DIVERS: 18_000,
          INTERNET: 15_000,
        },
        sharesByCategory: { ENERGIE: 37.6, LOYER: 29.7, DIVERS: 17.8, INTERNET: 14.9 },
        remaining: 39_000,
        percentUsed: 72.1,
        alertLevel: "normal",
      }),
    });

    expect(data.notables.hasComparison).toBe(true);
    expect(data.notables.biggestIncrease).toBeNull();
    expect(data.notables.biggestDecrease).toBeNull();
    expect(data.notables.newCategory).toBeNull();
  });

  it("gère un mois précédent sans aucune dépense", () => {
    const data = buildData({ previous: monthSummary() });

    expect(data.notables.hasComparison).toBe(false);
    expect(data.notables.biggestIncrease).toBeNull();
    expect(data.notables.biggestDecrease).toBeNull();
    expect(data.notables.newCategory).toBeNull();
    expect(data.categories[0].prevSpentTnd).toBe("0,000");
    expect(data.categories[0].deltaPercent).toBeNull();
  });

  it("gère l'absence de budget tout en gardant la prévision", () => {
    const data = buildData({
      current: monthSummary({
        ...CURRENT,
        budget: null,
      }),
    });

    expect(data.budget.limitTnd).toBeNull();
    expect(data.budget.incomeTnd).toBeNull();
    expect(data.budget.remainingTnd).toBeNull();
    expect(data.budget.percentUsed).toBeNull();
    expect(data.budget.alertLevel).toBeNull();
    expect(data.budget.spentTnd).toBe("100,000");
    expect(data.budget.forecastTnd).toBe("170,000");
    expect(data.budget.overshootRisk).toBeNull();
    expect(data.budget.overshootTnd).toBeNull();
  });

  it("gère un mois sans dépenses", () => {
    const data = buildData({
      current: monthSummary({ budget: CURRENT.budget }),
      expenses: [],
    });

    expect(data.categories).toEqual([]);
    expect(data.topExpenses).toEqual([]);
    expect(data.budget.spentTnd).toBe("0,000");
    expect(data.budget.forecastTnd).toBeNull();
    expect(data.budget.overshootRisk).toBeNull();
  });

  it("ne calcule pas la prévision pour un mois passé", () => {
    const data = buildData({ month: "2026-10" });

    expect(data.monthLabel).toBe("Octobre 2026");
    expect(data.prevMonthLabel).toBe("Septembre 2026");
    expect(data.dayOfMonth).toBeNull();
    expect(data.daysInMonth).toBe(31);
    expect(data.budget.forecastTnd).toBeNull();
    expect(data.budget.overshootRisk).toBeNull();
  });
});

describe("toInsightFingerprintInput", () => {
  it("dérive les arguments depuis les données du mois", () => {
    expect(
      toInsightFingerprintInput({ current: CURRENT, expenses: EXPENSES }),
    ).toEqual({
      budgetUpdatedAt: "2026-11-01T07:00:00.000Z",
      expenseCount: 5,
      spentTotal: 100_000,
      maxExpenseUpdatedAt: "2026-11-12T09:00:00.000Z",
    });
  });

  it("renvoie none sans budget ni dépenses", () => {
    const input = toInsightFingerprintInput({
      current: monthSummary(),
      expenses: [],
    });

    expect(input).toEqual({
      budgetUpdatedAt: null,
      expenseCount: 0,
      spentTotal: 0,
      maxExpenseUpdatedAt: null,
    });
    expect(buildInsightFingerprint(input)).toBe("none|0|0|none");
  });
});

describe("buildTemplateSummary", () => {
  it("produit un résumé complet de 6 lignes maximum", () => {
    const text = buildTemplateSummary(buildData());

    expect(text).toBe(
      [
        "Ce mois-ci, vous avez dépensé 100,000 TND sur un plafond de 150,000 TND.",
        "Répartition : Électricité/Eau/Gaz 40,000 TND, Loyer 30,000 TND, Divers 20,000 TND.",
        "Plus forte hausse vs octobre 2026 : Électricité/Eau/Gaz (+20,000 TND) · plus forte baisse : Internet (-15,000 TND) · Divers apparaît ce mois-ci (20,000 TND).",
        "Plus grosse dépense : Électricité/Eau/Gaz 40,000 TND le 5 nov.",
        "Reste à dépenser : 50,000 TND pour les 15 prochains jours (66,7 % utilisés).",
        "À ce rythme, vous risquez de dépasser le plafond d'environ 20,000 TND en fin de mois.",
      ].join("\n"),
    );
  });

  it("gère un mois sans dépenses ni budget", () => {
    const text = buildTemplateSummary(
      buildData({ current: monthSummary(), expenses: [] }),
    );

    expect(text).toBe(
      [
        "Vous n'avez aucune dépense enregistrée ce mois-ci.",
        "Aucun plafond n'est défini pour ce mois.",
      ].join("\n"),
    );
  });

  it("gère un mois sans dépenses avec budget", () => {
    const text = buildTemplateSummary(
      buildData({ current: monthSummary({ budget: CURRENT.budget }), expenses: [] }),
    );

    expect(text).toBe("Vous n'avez aucune dépense enregistrée ce mois-ci.");
  });

  it("omet le plafond et le risque quand il n'y a pas de budget", () => {
    const text = buildTemplateSummary(
      buildData({ current: monthSummary({ ...CURRENT, budget: null }) }),
    );

    expect(text).toBe(
      [
        "Ce mois-ci, vous avez dépensé 100,000 TND.",
        "Répartition : Électricité/Eau/Gaz 40,000 TND, Loyer 30,000 TND, Divers 20,000 TND.",
        "Plus forte hausse vs octobre 2026 : Électricité/Eau/Gaz (+20,000 TND) · plus forte baisse : Internet (-15,000 TND) · Divers apparaît ce mois-ci (20,000 TND).",
        "Plus grosse dépense : Électricité/Eau/Gaz 40,000 TND le 5 nov.",
        "Aucun plafond n'est défini pour ce mois.",
      ].join("\n"),
    );
  });

  it("omet la ligne de comparaison sans données sur le mois précédent", () => {
    const text = buildTemplateSummary(buildData({ previous: monthSummary() }));

    expect(text).toBe(
      [
        "Ce mois-ci, vous avez dépensé 100,000 TND sur un plafond de 150,000 TND.",
        "Répartition : Électricité/Eau/Gaz 40,000 TND, Loyer 30,000 TND, Divers 20,000 TND.",
        "Plus grosse dépense : Électricité/Eau/Gaz 40,000 TND le 5 nov.",
        "Reste à dépenser : 50,000 TND pour les 15 prochains jours (66,7 % utilisés).",
        "À ce rythme, vous risquez de dépasser le plafond d'environ 20,000 TND en fin de mois.",
      ].join("\n"),
    );
  });

  it("omet les jours restants pour un mois passé", () => {
    const text = buildTemplateSummary(buildData({ month: "2026-10" }));

    expect(text).toContain(
      "Reste à dépenser : 50,000 TND (66,7 % utilisés).",
    );
    expect(text).not.toContain("prochains jours");
  });
});
