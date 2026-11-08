import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  generateTextMock,
  getMonthSummaryMock,
  listExpensesMock,
  findOneMock,
  findOneAndUpdateMock,
  findOneAndDeleteMock,
  checkRateLimitMock,
  APICallErrorMock,
  NoObjectGeneratedErrorMock,
} = vi.hoisted(() => {
  class APICallErrorMock extends Error {
    statusCode?: number;

    static isInstance(error: unknown): boolean {
      return error instanceof APICallErrorMock;
    }
  }

  class NoObjectGeneratedErrorMock extends Error {
    static isInstance(error: unknown): boolean {
      return error instanceof NoObjectGeneratedErrorMock;
    }
  }

  return {
    generateTextMock: vi.fn(),
    getMonthSummaryMock: vi.fn(),
    listExpensesMock: vi.fn(),
    findOneMock: vi.fn(),
    findOneAndUpdateMock: vi.fn(),
    findOneAndDeleteMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    APICallErrorMock,
    NoObjectGeneratedErrorMock,
  };
});

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: { object: (spec: unknown) => spec },
  APICallError: APICallErrorMock,
  NoObjectGeneratedError: NoObjectGeneratedErrorMock,
}));

vi.mock("@/lib/ai/model", () => ({
  getExpenseModel: () => "mock-model",
}));

vi.mock("@/lib/budget/current-user", () => ({
  getUserId: async () => "user-1",
}));

vi.mock("@/lib/mongodb", () => ({
  connectDB: async () => {},
}));

vi.mock("@/lib/budget/queries", () => ({
  getMonthSummary: getMonthSummaryMock,
  listExpenses: listExpensesMock,
}));

vi.mock("@/models/budgetInsight", () => ({
  default: {
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
    findOneAndDelete: findOneAndDeleteMock,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

import {
  refreshMonthlySummary,
  refreshPredictiveAlerts,
} from "@/app/actions/budget-insights";
import {
  buildInsightFingerprint,
  toInsightFingerprintInput,
} from "@/lib/budget/insights";
import {
  CURRENT,
  EXPENSES,
  MONTH,
  PREVIOUS,
  expense,
  monthSummary,
} from "@/lib/budget/__tests__/fixtures";

const AI_SUMMARY_OK =
  "Vous avez dépensé 100,000 TND sur un plafond de 150,000 TND.";

const FRESH_FINGERPRINT = buildInsightFingerprint(
  toInsightFingerprintInput({ current: CURRENT, expenses: EXPENSES }),
);

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function cachedDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "i1",
    userId: "user-1",
    month: MONTH,
    kind: "summary",
    source: "ai",
    text: "Résumé en cache.",
    inputFingerprint: FRESH_FINGERPRINT,
    generatedAt: minutesAgo(30),
    lastAiAttemptAt: minutesAgo(30),
    ...overrides,
  };
}

function apiCallError(
  statusCode: number,
): InstanceType<typeof APICallErrorMock> {
  const error = new APICallErrorMock(`HTTP ${statusCode}`);
  error.statusCode = statusCode;

  return error;
}

function mockFindOneResults(docs: unknown | unknown[]): void {
  const sequence = Array.isArray(docs) ? docs : [docs, docs];
  let index = 0;

  findOneMock.mockImplementation(() => ({
    lean: async () => {
      const doc = sequence[Math.min(index, sequence.length - 1)];
      index += 1;
      return doc;
    },
  }));
}

describe("refreshMonthlySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T10:00:00.000Z"));
    checkRateLimitMock.mockReturnValue(true);
    getMonthSummaryMock.mockImplementation(
      async (_userId: string, month: string) => {
        if (month === MONTH) {
          return CURRENT;
        }

        if (month === "2026-10") {
          return PREVIOUS;
        }

        return monthSummary();
      },
    );
    listExpensesMock.mockResolvedValue(EXPENSES);
    mockFindOneResults(null);
    findOneAndUpdateMock.mockResolvedValue({});
    generateTextMock.mockResolvedValue({ output: { summary: AI_SUMMARY_OK } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("régénère par IA et upsert quand aucun cache n'existe", async () => {
    const state = await refreshMonthlySummary(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: {
        text: AI_SUMMARY_OK,
        source: "ai",
      },
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock.mock.calls[0][0].instructions).toContain(
      "vouvoiement",
    );
    expect(generateTextMock.mock.calls[0][0].prompt).toContain(
      '"spentTnd":"100,000"',
    );
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(2);
    expect(findOneAndUpdateMock.mock.calls[0][0]).toEqual({
      userId: "user-1",
      month: MONTH,
      kind: "summary",
      $or: [
        { lastAiAttemptAt: { $exists: false } },
        { lastAiAttemptAt: { $lt: expect.any(Date) } },
      ],
    });
    expect(findOneAndUpdateMock.mock.calls[0][1]).toEqual({
      $set: { lastAiAttemptAt: expect.any(Date) },
      $setOnInsert: {
        source: "template",
        text: expect.any(String),
        inputFingerprint: FRESH_FINGERPRINT,
        generatedAt: expect.any(Date),
      },
    });
    expect(findOneAndUpdateMock.mock.calls[0][2]).toMatchObject({
      upsert: true,
    });
    expect(findOneAndUpdateMock.mock.calls[1][0]).toEqual({
      userId: "user-1",
      month: MONTH,
      kind: "summary",
    });
    expect(findOneAndUpdateMock.mock.calls[1][1].$set).toMatchObject({
      text: AI_SUMMARY_OK,
      source: "ai",
      inputFingerprint: FRESH_FINGERPRINT,
    });
  });

  it("sert le cache IA à jour sans appeler le modèle", async () => {
    mockFindOneResults(
      cachedDoc({
        source: "ai",
        inputFingerprint: FRESH_FINGERPRINT,
      }),
    );

    const state = await refreshMonthlySummary(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { text: "Résumé en cache.", source: "ai" },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("sert un cache template récent sans retenter l'IA", async () => {
    mockFindOneResults(
      cachedDoc({
        source: "template",
        inputFingerprint: FRESH_FINGERPRINT,
        text: "Résumé template.",
      }),
    );

    const state = await refreshMonthlySummary(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { text: "Résumé template.", source: "template" },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("retente l'IA après une heure pour un cache template", async () => {
    mockFindOneResults(
      cachedDoc({
        source: "template",
        inputFingerprint: FRESH_FINGERPRINT,
        lastAiAttemptAt: minutesAgo(120),
        generatedAt: minutesAgo(120),
      }),
    );

    const state = await refreshMonthlySummary(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { source: "ai" },
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(findOneAndUpdateMock.mock.calls[1][1].$set.source).toBe("ai");
  });

  it("respecte le cooldown de 24 h quand les données ont changé", async () => {
    mockFindOneResults(
      cachedDoc({
        source: "ai",
        inputFingerprint: "stale-fingerprint",
        lastAiAttemptAt: minutesAgo(120),
        generatedAt: minutesAgo(120),
      }),
    );

    const state = await refreshMonthlySummary(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { text: "Résumé en cache.", source: "ai" },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("bascule sur le template si un montant est inconnu", async () => {
    generateTextMock.mockResolvedValue({
      output: { summary: "Hausse de 99,999 TND." },
    });

    const state = await refreshMonthlySummary(MONTH);

    expect(state.ok).toBe(true);
    expect(state.ok && state.insight.source).toBe("template");
    expect(state.ok && state.insight.text).toContain(
      "Ce mois-ci, vous avez dépensé 100,000 TND sur un plafond de 150,000 TND.",
    );
    expect(findOneAndUpdateMock.mock.calls[1][1].$set.source).toBe("template");
  });

  it("bascule sur le template si le provider échoue", async () => {
    generateTextMock.mockRejectedValue(apiCallError(429));

    const state = await refreshMonthlySummary(MONTH);

    expect(state.ok).toBe(true);
    expect(state.ok && state.insight.source).toBe("template");
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("sert le cache sans appel IA quand le rate-limit refuse", async () => {
    checkRateLimitMock.mockReturnValue(false);
    mockFindOneResults(
      cachedDoc({ source: "ai", inputFingerprint: FRESH_FINGERPRINT }),
    );

    const state = await refreshMonthlySummary(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { text: "Résumé en cache.", source: "ai" },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("évite un double appel via la re-vérification juste avant l'IA", async () => {
    mockFindOneResults([
      null,
      cachedDoc({
        source: "ai",
        inputFingerprint: FRESH_FINGERPRINT,
        lastAiAttemptAt: minutesAgo(0.1),
        generatedAt: minutesAgo(0.1),
        text: "Résumé concurrent.",
      }),
    ]);

    const state = await refreshMonthlySummary(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { text: "Résumé concurrent.", source: "ai" },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("ne génère qu'un appel IA quand deux requêtes sont simultanées", async () => {
    findOneMock.mockImplementation(() => ({
      lean: async () => null,
    }));
    findOneAndUpdateMock
      .mockResolvedValueOnce({ lastAiAttemptAt: new Date() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(null);

    const winner = await refreshMonthlySummary(MONTH);
    const loser = await refreshMonthlySummary(MONTH);

    expect(winner).toMatchObject({
      ok: true,
      insight: { text: AI_SUMMARY_OK, source: "ai" },
    });
    expect(loser).toMatchObject({
      ok: true,
      insight: { source: "template" },
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(3);
    expect(findOneAndUpdateMock.mock.calls[2][0]).toEqual({
      userId: "user-1",
      month: MONTH,
      kind: "summary",
      $or: [
        { lastAiAttemptAt: { $exists: false } },
        { lastAiAttemptAt: { $lt: expect.any(Date) } },
      ],
    });
  });

  it("rejette un mois passé et ne sert que le cache existant", async () => {
    mockFindOneResults(cachedDoc({ month: "2026-10", text: "Résumé ancien." }));

    const cachedState = await refreshMonthlySummary("2026-10");

    expect(cachedState).toMatchObject({
      ok: true,
      insight: { text: "Résumé ancien.", source: "ai" },
    });
    expect(generateTextMock).not.toHaveBeenCalled();

    mockFindOneResults(null);
    const missedState = await refreshMonthlySummary("2026-10");

    expect(missedState).toEqual({
      ok: false,
      message: "Le résumé mensuel n'est disponible que pour le mois en cours.",
    });
    expect(getMonthSummaryMock).not.toHaveBeenCalled();
    expect(listExpensesMock).not.toHaveBeenCalled();
  });

  it("rejette un mois invalide", async () => {
    const state = await refreshMonthlySummary("2026-13");

    expect(state).toEqual({ ok: false, message: "Mois invalide." });
    expect(getMonthSummaryMock).not.toHaveBeenCalled();
  });

  it("remonte une erreur contrôlée si la base échoue", async () => {
    findOneAndUpdateMock.mockRejectedValue(new Error("mongo down"));

    const state = await refreshMonthlySummary(MONTH);

    expect(state).toEqual({
      ok: false,
      message: "Le résumé mensuel est momentanément indisponible.",
    });
  });
});

describe("refreshPredictiveAlerts", () => {
  const AI_ALERT_TEXT =
    "À ce rythme, vous dépasserez votre budget Divers vers le 17 (≈ 80,000 TND au-dessus du plafond).";

  const ALERTS_CURRENT = monthSummary({
    budget: {
      id: "b2",
      month: MONTH,
      limit: 150_000,
      categoryLimits: { DIVERS: 100_000 },
      createdAt: "2026-11-01T07:00:00.000Z",
      updatedAt: "2026-11-01T07:00:00.000Z",
    },
    spent: 90_000,
    totalsByCategory: { DIVERS: 90_000 },
    sharesByCategory: { DIVERS: 100 },
    remaining: 60_000,
    percentUsed: 60,
    alertLevel: "normal",
  });

  const ALERTS_EXPENSES = [
    expense({
      id: "a1",
      amount: 60_000,
      category: "DIVERS",
      updatedAt: "2026-11-10T09:00:00.000Z",
    }),
    expense({
      id: "a2",
      amount: 30_000,
      category: "DIVERS",
      updatedAt: "2026-11-12T09:00:00.000Z",
    }),
  ];

  const ALERTS_FINGERPRINT = buildInsightFingerprint(
    toInsightFingerprintInput({
      current: ALERTS_CURRENT,
      expenses: ALERTS_EXPENSES,
    }),
  );

  function cachedAlertsDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: "i2",
      userId: "user-1",
      month: MONTH,
      kind: "alerts",
      source: "ai",
      alerts: [
        {
          categoryKey: "DIVERS",
          level: "risk",
          crossingDay: 17,
          text: "Alerte en cache.",
        },
      ],
      inputFingerprint: ALERTS_FINGERPRINT,
      generatedAt: minutesAgo(30),
      lastAiAttemptAt: minutesAgo(30),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T10:00:00.000Z"));
    checkRateLimitMock.mockReturnValue(true);
    getMonthSummaryMock.mockResolvedValue(ALERTS_CURRENT);
    listExpensesMock.mockResolvedValue(ALERTS_EXPENSES);
    mockFindOneResults(null);
    findOneAndUpdateMock.mockResolvedValue({});
    findOneAndDeleteMock.mockResolvedValue(null);
    generateTextMock.mockResolvedValue({
      output: { alerts: [{ key: "DIVERS", text: AI_ALERT_TEXT }] },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("génère les alertes par IA et upsert le cache", async () => {
    const state = await refreshPredictiveAlerts(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: {
        source: "ai",
        alerts: [
          {
            key: "DIVERS",
            label: "Divers",
            level: "risk",
            crossingDay: 17,
            text: AI_ALERT_TEXT,
          },
        ],
      },
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock.mock.calls[0][0].instructions).toContain(
      "vouvoiement",
    );
    expect(generateTextMock.mock.calls[0][0].prompt).toContain(
      '"projectionTnd":"180,000"',
    );
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(2);
    expect(findOneAndUpdateMock.mock.calls[0][0]).toEqual({
      userId: "user-1",
      month: MONTH,
      kind: "alerts",
      $or: [
        { lastAiAttemptAt: { $exists: false } },
        { lastAiAttemptAt: { $lt: expect.any(Date) } },
      ],
    });
    expect(findOneAndUpdateMock.mock.calls[0][1]).toEqual({
      $set: { lastAiAttemptAt: expect.any(Date) },
      $setOnInsert: {
        source: "template",
        alerts: [
          {
            categoryKey: "DIVERS",
            level: "risk",
            crossingDay: 17,
            text: expect.any(String),
          },
        ],
        inputFingerprint: ALERTS_FINGERPRINT,
        generatedAt: expect.any(Date),
      },
    });
    expect(findOneAndUpdateMock.mock.calls[0][2]).toMatchObject({
      upsert: true,
    });
    expect(findOneAndUpdateMock.mock.calls[1][0]).toEqual({
      userId: "user-1",
      month: MONTH,
      kind: "alerts",
    });
    expect(findOneAndUpdateMock.mock.calls[1][1].$set).toMatchObject({
      source: "ai",
      inputFingerprint: ALERTS_FINGERPRINT,
      alerts: [
        {
          categoryKey: "DIVERS",
          level: "risk",
          crossingDay: 17,
          text: AI_ALERT_TEXT,
        },
      ],
    });
  });

  it("sert le cache IA à jour sans appeler le modèle", async () => {
    mockFindOneResults(cachedAlertsDoc());

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: {
        source: "ai",
        alerts: [
          {
            key: "DIVERS",
            label: "Divers",
            crossingDay: 17,
            text: "Alerte en cache.",
          },
        ],
      },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("sert un cache template récent sans retenter l'IA", async () => {
    mockFindOneResults(
      cachedAlertsDoc({ source: "template", lastAiAttemptAt: minutesAgo(20) }),
    );

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state.ok && state.insight.source).toBe("template");
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("respecte le cooldown de 24 h quand les données ont changé", async () => {
    mockFindOneResults(
      cachedAlertsDoc({
        inputFingerprint: "stale-fingerprint",
        lastAiAttemptAt: minutesAgo(120),
        generatedAt: minutesAgo(120),
      }),
    );

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { alerts: [{ text: "Alerte en cache." }] },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("balaie le cache quand il n'y a plus de plafond par catégorie", async () => {
    getMonthSummaryMock.mockResolvedValue(CURRENT);
    listExpensesMock.mockResolvedValue(EXPENSES);
    mockFindOneResults(cachedAlertsDoc());

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state).toMatchObject({ ok: true, insight: { alerts: [] } });
    expect(findOneAndDeleteMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("balaie le cache quand plus aucune alerte n'est calculée", async () => {
    getMonthSummaryMock.mockResolvedValue(
      monthSummary({
        ...ALERTS_CURRENT,
        spent: 10_000,
        totalsByCategory: { DIVERS: 10_000 },
        sharesByCategory: { DIVERS: 100 },
        remaining: 140_000,
        percentUsed: 6.7,
      }),
    );
    listExpensesMock.mockResolvedValue([
      expense({ id: "a1", amount: 10_000, category: "DIVERS" }),
    ]);
    mockFindOneResults(cachedAlertsDoc());

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state).toMatchObject({ ok: true, insight: { alerts: [] } });
    expect(findOneAndDeleteMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("balaie le cache et ne calcule rien pour un mois non courant", async () => {
    mockFindOneResults(cachedAlertsDoc({ month: "2026-10" }));

    const state = await refreshPredictiveAlerts("2026-10");

    expect(state).toMatchObject({ ok: true, insight: { alerts: [] } });
    expect(findOneAndDeleteMock).toHaveBeenCalledTimes(1);
    expect(getMonthSummaryMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("bascule sur le template si un montant est inconnu", async () => {
    generateTextMock.mockResolvedValue({
      output: {
        alerts: [{ key: "DIVERS", text: "Excès estimé à 99,999 TND." }],
      },
    });

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state.ok && state.insight.source).toBe("template");
    expect(state.ok && state.insight.alerts[0].text).toContain(
      "vers le 17 (≈ 80,000 TND au-dessus du plafond)",
    );
    expect(findOneAndUpdateMock.mock.calls[1][1].$set.source).toBe("template");
  });

  it("bascule sur le template si le provider échoue", async () => {
    generateTextMock.mockRejectedValue(apiCallError(429));

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state.ok && state.insight.source).toBe("template");
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("évite un double appel via la re-vérification juste avant l'IA", async () => {
    mockFindOneResults([
      null,
      cachedAlertsDoc({
        lastAiAttemptAt: minutesAgo(0.1),
        generatedAt: minutesAgo(0.1),
      }),
    ]);

    const state = await refreshPredictiveAlerts(MONTH);

    expect(state).toMatchObject({
      ok: true,
      insight: { alerts: [{ text: "Alerte en cache." }] },
    });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("rejette un mois invalide", async () => {
    const state = await refreshPredictiveAlerts("2026-13");

    expect(state).toEqual({ ok: false, message: "Mois invalide." });
  });
});
