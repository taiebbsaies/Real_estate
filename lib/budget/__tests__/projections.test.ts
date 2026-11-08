import { describe, expect, it } from "vitest";
import {
  buildCategoryProjections,
  buildTemplateAlertText,
  toPredictiveAlertViews,
} from "@/lib/budget/projections";
import { expense } from "@/lib/budget/__tests__/fixtures";

function buildArgs(
  overrides: Partial<Parameters<typeof buildCategoryProjections>[0]> = {},
) {
  return {
    totalsByCategory: { DIVERS: 40_000 },
    expenses: [
      expense({ id: "d1", amount: 25_000, category: "DIVERS" }),
      expense({ id: "d2", amount: 15_000, category: "DIVERS" }),
    ],
    categoryLimits: { DIVERS: 100_000 },
    dayOfMonth: 10,
    daysOfTheMonth: 30,
    ...overrides,
  };
}

describe("buildCategoryProjections", () => {
  it("projette un risque de dépassement avec le jour estimé", () => {
    const result = buildCategoryProjections(buildArgs());

    expect(result).toEqual({
      dayOfMonth: 10,
      daysOfTheMonth: 30,
      alerts: [
        {
          key: "DIVERS",
          label: "Divers",
          level: "risk",
          limit: 100_000,
          spent: 40_000,
          projection: 120_000,
          overshoot: 20_000,
          limitTnd: "100,000",
          spentTnd: "40,000",
          projectionTnd: "120,000",
          overshootTnd: "+20,000",
          crossingDay: 25,
        },
      ],
    });
  });

  it("ignore un dépassement projeté inférieur à la marge", () => {
    const result = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { DIVERS: 34_000 },
        expenses: [
          expense({ id: "d1", amount: 20_000, category: "DIVERS" }),
          expense({ id: "d2", amount: 14_000, category: "DIVERS" }),
        ],
      }),
    );

    expect(result.alerts).toEqual([]);
  });

  it("ne déclenche pas d'alerte quand la projection égale le plafond plus la marge", () => {
    const atBoundary = buildCategoryProjections(
      buildArgs({
        categoryLimits: { DIVERS: 55_000 },
        dayOfMonth: 10,
        daysOfTheMonth: 15,
      }),
    );

    expect(atBoundary.alerts).toEqual([]);

    const justAbove = buildCategoryProjections(
      buildArgs({
        categoryLimits: { DIVERS: 54_900 },
        dayOfMonth: 10,
        daysOfTheMonth: 15,
      }),
    );

    expect(justAbove.alerts).toHaveLength(1);
    expect(justAbove.alerts[0]).toMatchObject({
      level: "risk",
      crossingDay: 14,
    });
  });

  it("ignore les catégories sans plafond", () => {
    const result = buildCategoryProjections(
      buildArgs({ categoryLimits: { ENERGIE: 100_000 } }),
    );

    expect(result.alerts).toEqual([]);
  });

  it("plafonne le jour estimé au dernier jour du mois", () => {
    const result = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { DIVERS: 30_000 },
        expenses: [expense({ id: "d1", amount: 30_000, category: "DIVERS" })],
        categoryLimits: { DIVERS: 94_000 },
        dayOfMonth: 3,
        daysOfTheMonth: 10,
      }),
    );

    expect(result).toEqual({
      dayOfMonth: 3,
      daysOfTheMonth: 10,
      alerts: [
        {
          key: "DIVERS",
          label: "Divers",
          level: "risk",
          limit: 94_000,
          spent: 30_000,
          projection: 100_000,
          overshoot: 6_000,
          limitTnd: "94,000",
          spentTnd: "30,000",
          projectionTnd: "100,000",
          overshootTnd: "+6,000",
          crossingDay: 10,
        },
      ],
    });
  });

  it("ignore un plafond nul ou négatif", () => {
    const result = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { DIVERS: 40_000, ENERGIE: 50_000 },
        expenses: [
          expense({ id: "d1", amount: 25_000, category: "DIVERS" }),
          expense({ id: "d2", amount: 15_000, category: "DIVERS" }),
          expense({ id: "e1", amount: 50_000, category: "ENERGIE" }),
        ],
        categoryLimits: { DIVERS: 0, ENERGIE: -1 },
      }),
    );

    expect(result.alerts).toEqual([]);
  });

  it("signale un dépassement déjà effectif même en début de mois", () => {
    const result = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { ENERGIE: 35_000 },
        expenses: [expense({ id: "e1", amount: 35_000, category: "ENERGIE" })],
        categoryLimits: { ENERGIE: 30_000 },
        dayOfMonth: 2,
        daysOfTheMonth: 30,
      }),
    );

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({
      key: "ENERGIE",
      level: "exceeded",
      crossingDay: null,
      overshootTnd: "+5,000",
    });
  });

  it("ignore le loyer pour les alertes prédictives mais pas le dépassement effectif", () => {
    const predictive = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { LOYER: 40_000 },
        expenses: [
          expense({ id: "l1", amount: 25_000, category: "LOYER" }),
          expense({ id: "l2", amount: 15_000, category: "LOYER" }),
        ],
        categoryLimits: { LOYER: 100_000 },
      }),
    );

    expect(predictive.alerts).toEqual([]);

    const exceeded = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { LOYER: 110_000 },
        expenses: [expense({ id: "l1", amount: 110_000, category: "LOYER" })],
        categoryLimits: { LOYER: 100_000 },
      }),
    );

    expect(exceeded.alerts[0]).toMatchObject({
      key: "LOYER",
      level: "exceeded",
      overshootTnd: "+10,000",
    });
  });

  it("ignore les alertes prédictives en début de mois", () => {
    const result = buildCategoryProjections(
      buildArgs({ dayOfMonth: 2, daysOfTheMonth: 30 }),
    );

    expect(result.alerts).toEqual([]);
  });

  it("exige un minimum de données pour une alerte prédictive", () => {
    const singleExpense = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { ENERGIE: 12_000 },
        expenses: [expense({ id: "e1", amount: 12_000, category: "ENERGIE" })],
        categoryLimits: { ENERGIE: 100_000 },
        dayOfMonth: 3,
        daysOfTheMonth: 31,
      }),
    );

    expect(singleExpense.alerts).toEqual([]);

    const twoExpenses = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { ENERGIE: 12_000 },
        expenses: [
          expense({ id: "e1", amount: 8_000, category: "ENERGIE" }),
          expense({ id: "e2", amount: 4_000, category: "ENERGIE" }),
        ],
        categoryLimits: { ENERGIE: 100_000 },
        dayOfMonth: 3,
        daysOfTheMonth: 31,
      }),
    );

    expect(twoExpenses.alerts).toHaveLength(1);
    expect(twoExpenses.alerts[0]).toMatchObject({
      key: "ENERGIE",
      level: "risk",
      crossingDay: 25,
    });
  });

  it("accepte une dépense unique si elle dépasse 20 % du plafond", () => {
    const result = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { ENERGIE: 25_000 },
        expenses: [expense({ id: "e1", amount: 25_000, category: "ENERGIE" })],
        categoryLimits: { ENERGIE: 100_000 },
        dayOfMonth: 3,
        daysOfTheMonth: 31,
      }),
    );

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ level: "risk" });
  });

  it("ignore le dernier jour du mois et les catégories sans dépense", () => {
    const lastDay = buildCategoryProjections(
      buildArgs({ dayOfMonth: 30, daysOfTheMonth: 30 }),
    );

    expect(lastDay.alerts).toEqual([]);

    const noSpend = buildCategoryProjections(
      buildArgs({
        totalsByCategory: {},
        expenses: [],
      }),
    );

    expect(noSpend.alerts).toEqual([]);
  });

  it("trie les alertes par urgence décroissante", () => {
    const result = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { DIVERS: 40_000, ENERGIE: 150_000 },
        expenses: [
          expense({ id: "d1", amount: 25_000, category: "DIVERS" }),
          expense({ id: "d2", amount: 15_000, category: "DIVERS" }),
          expense({ id: "e1", amount: 100_000, category: "ENERGIE" }),
          expense({ id: "e2", amount: 50_000, category: "ENERGIE" }),
        ],
        categoryLimits: { DIVERS: 100_000, ENERGIE: 200_000 },
      }),
    );

    expect(result.alerts.map((alert) => alert.key)).toEqual([
      "ENERGIE",
      "DIVERS",
    ]);
  });
});

describe("buildTemplateAlertText", () => {
  it("rédige une alerte de risque avec le jour estimé", () => {
    const result = buildCategoryProjections(buildArgs());

    expect(result.alerts[0] && buildTemplateAlertText(result.alerts[0])).toBe(
      "À ce rythme, vous dépasserez votre budget Divers vers le 25 (≈ 20,000 TND au-dessus du plafond).",
    );
  });

  it("constate un dépassement effectif", () => {
    const result = buildCategoryProjections(
      buildArgs({
        totalsByCategory: { DIVERS: 110_000 },
        expenses: [expense({ id: "d1", amount: 110_000, category: "DIVERS" })],
      }),
    );

    expect(result.alerts[0] && buildTemplateAlertText(result.alerts[0])).toBe(
      "Budget Divers dépassé de 10,000 TND.",
    );
  });
});

describe("toPredictiveAlertViews", () => {
  it("enrichit les alertes stockées avec labels et jours", () => {
    expect(
      toPredictiveAlertViews([
        {
          categoryKey: "DIVERS",
          level: "risk",
          crossingDay: 17,
          text: "Alerte.",
        },
        {
          categoryKey: "INCONNUE",
          level: "exceeded",
          text: "Dépassé.",
        },
      ]),
    ).toEqual([
      {
        key: "DIVERS",
        label: "Divers",
        level: "risk",
        crossingDay: 17,
        text: "Alerte.",
      },
      {
        key: "INCONNUE",
        label: "INCONNUE",
        level: "exceeded",
        crossingDay: null,
        text: "Dépassé.",
      },
    ]);
  });
});
