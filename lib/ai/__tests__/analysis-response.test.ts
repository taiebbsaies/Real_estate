import { describe, expect, it } from "vitest";
import {
  resolveAnalysis,
  type AnalysisResponseLike,
} from "@/lib/ai/analysis-response";

const THROWN_MESSAGE = "Fichier trop volumineux ou envoi impossible.";

function successResponse(amount: string): AnalysisResponseLike {
  return {
    success: true,
    message: "Brouillon généré — vérifiez avant d'enregistrer.",
    draft: {
      amount,
      date: "2026-11-01",
      category: "ENERGIE",
      note: "Facture STEG",
    },
    uncertainFields: ["date"],
    multipleExpenses: false,
  };
}

describe("resolveAnalysis", () => {
  it("ignore une réponse périmée, même en succès", () => {
    const outcome = resolveAnalysis({
      seq: 1,
      latestSeq: 2,
      formDirty: false,
      response: successResponse("85,000"),
      thrownMessage: THROWN_MESSAGE,
    });

    expect(outcome).toEqual({ kind: "stale" });
  });

  it("deux réponses dans le désordre : seule la plus récente compte", () => {
    const latestSeq = 2;

    const older = resolveAnalysis({
      seq: 1,
      latestSeq,
      formDirty: false,
      response: successResponse("85,000"),
      thrownMessage: THROWN_MESSAGE,
    });
    const newer = resolveAnalysis({
      seq: 2,
      latestSeq,
      formDirty: false,
      response: successResponse("12,000"),
      thrownMessage: THROWN_MESSAGE,
    });

    expect(older).toEqual({ kind: "stale" });
    expect(newer).toEqual({
      kind: "apply",
      draft: {
        amount: "12,000",
        date: "2026-11-01",
        category: "ENERGIE",
        note: "Facture STEG",
        uncertainFields: ["date"],
        multipleExpenses: false,
      },
    });
  });

  it("tient le brouillon si le formulaire a été modifié depuis la dernière application", () => {
    const outcome = resolveAnalysis({
      seq: 3,
      latestSeq: 3,
      formDirty: true,
      response: successResponse("85,000"),
      thrownMessage: THROWN_MESSAGE,
    });

    expect(outcome.kind).toBe("hold");

    if (outcome.kind === "hold") {
      expect(outcome.draft.amount).toBe("85,000");
    }
  });

  it("applique automatiquement si le formulaire est propre", () => {
    const outcome = resolveAnalysis({
      seq: 1,
      latestSeq: 1,
      formDirty: false,
      response: successResponse("85,000"),
      thrownMessage: THROWN_MESSAGE,
    });

    expect(outcome.kind).toBe("apply");
  });

  it("traduit une action qui a levé en message d'erreur imposé", () => {
    const outcome = resolveAnalysis({
      seq: 1,
      latestSeq: 1,
      formDirty: false,
      response: null,
      thrownMessage: THROWN_MESSAGE,
    });

    expect(outcome).toEqual({ kind: "error", message: THROWN_MESSAGE });
  });

  it("propage le message d'erreur serveur", () => {
    const outcome = resolveAnalysis({
      seq: 1,
      latestSeq: 1,
      formDirty: false,
      response: { success: false, message: "Trop de scans. Réessayez dans une minute." },
      thrownMessage: THROWN_MESSAGE,
    });

    expect(outcome).toEqual({
      kind: "error",
      message: "Trop de scans. Réessayez dans une minute.",
    });
  });
});
