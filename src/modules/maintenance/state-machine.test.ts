import { describe, it, expect } from "vitest";
import { validateTransition, getAllowedTransitions } from "./state-machine";
import { MAINTENANCE_ERROR_CODES } from "./constants";

describe("Maintenance State Machine", () => {
  describe("Creation and System Dispatch", () => {
    it("allows SYSTEM to auto-dispatch from CREEE to EN_ATTENTE", () => {
      const result = validateTransition({
        fromStatus: "CREEE",
        toStatus: "EN_ATTENTE",
        actorRole: "SYSTEM",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects unauthorized actors transitioning CREEE to EN_ATTENTE", () => {
      const result = validateTransition({
        fromStatus: "CREEE",
        toStatus: "EN_ATTENTE",
        actorRole: "TENANT",
      });
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(MAINTENANCE_ERROR_CODES.UNAUTHORIZED_ACTOR);
    });

    it("rejects illegal direct transition from CREEE to RESOLUE", () => {
      const result = validateTransition({
        fromStatus: "CREEE",
        toStatus: "RESOLUE",
        actorRole: "SYSTEM",
      });
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(MAINTENANCE_ERROR_CODES.INVALID_TRANSITION);
    });
  });

  describe("Cancellation", () => {
    it("allows TENANT to cancel pending request in CREEE or EN_ATTENTE", () => {
      expect(
        validateTransition({
          fromStatus: "CREEE",
          toStatus: "ANNULEE",
          actorRole: "TENANT",
        }).valid
      ).toBe(true);

      expect(
        validateTransition({
          fromStatus: "EN_ATTENTE",
          toStatus: "ANNULEE",
          actorRole: "TENANT",
        }).valid
      ).toBe(true);
    });

    it("allows ADMIN to cancel pending request", () => {
      expect(
        validateTransition({
          fromStatus: "EN_ATTENTE",
          toStatus: "ANNULEE",
          actorRole: "ADMIN",
        }).valid
      ).toBe(true);
    });

    it("rejects TECHNICIAN cancelling a request", () => {
      const res = validateTransition({
        fromStatus: "EN_ATTENTE",
        toStatus: "ANNULEE",
        actorRole: "TECHNICIAN",
      });
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe(MAINTENANCE_ERROR_CODES.UNAUTHORIZED_ACTOR);
    });
  });

  describe("Owner Review (Accept / Reject)", () => {
    it("allows OWNER to accept request in EN_ATTENTE", () => {
      const res = validateTransition({
        fromStatus: "EN_ATTENTE",
        toStatus: "ACCEPTEE",
        actorRole: "OWNER",
      });
      expect(res.valid).toBe(true);
    });

    it("requires reason when OWNER rejects request", () => {
      const resWithoutReason = validateTransition({
        fromStatus: "EN_ATTENTE",
        toStatus: "REJETEE",
        actorRole: "OWNER",
      });
      expect(resWithoutReason.valid).toBe(false);
      expect(resWithoutReason.errorCode).toBe(MAINTENANCE_ERROR_CODES.REASON_REQUIRED);

      const resWithReason = validateTransition({
        fromStatus: "EN_ATTENTE",
        toStatus: "REJETEE",
        actorRole: "OWNER",
        reason: "Réparation non imputable au bailleur selon le bail.",
      });
      expect(resWithReason.valid).toBe(true);
    });
  });

  describe("Technician Assignment & Progression", () => {
    it("allows assignment to TECHNICIEN_ASSIGNE", () => {
      const resOwner = validateTransition({
        fromStatus: "ACCEPTEE",
        toStatus: "TECHNICIEN_ASSIGNE",
        actorRole: "OWNER",
      });
      expect(resOwner.valid).toBe(true);

      const resTech = validateTransition({
        fromStatus: "ACCEPTEE",
        toStatus: "TECHNICIEN_ASSIGNE",
        actorRole: "TECHNICIAN",
      });
      expect(resTech.valid).toBe(true);
    });

    it("allows TECHNICIAN to start intervention (EN_COURS)", () => {
      const res = validateTransition({
        fromStatus: "TECHNICIEN_ASSIGNE",
        toStatus: "EN_COURS",
        actorRole: "TECHNICIAN",
      });
      expect(res.valid).toBe(true);
    });

    it("rejects non-technician starting intervention", () => {
      const res = validateTransition({
        fromStatus: "TECHNICIEN_ASSIGNE",
        toStatus: "EN_COURS",
        actorRole: "TENANT",
      });
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe(MAINTENANCE_ERROR_CODES.UNAUTHORIZED_ACTOR);
    });
  });

  describe("Intervention Resolution (RESOLUE)", () => {
    it("enforces diagnostic AND workDone to resolve", () => {
      const resMissingAll = validateTransition({
        fromStatus: "EN_COURS",
        toStatus: "RESOLUE",
        actorRole: "TECHNICIAN",
      });
      expect(resMissingAll.valid).toBe(false);
      expect(resMissingAll.errorCode).toBe(MAINTENANCE_ERROR_CODES.DIAGNOSTIC_REQUIRED);

      const resMissingWork = validateTransition({
        fromStatus: "EN_COURS",
        toStatus: "RESOLUE",
        actorRole: "TECHNICIAN",
        diagnostic: "Joint de siphon défectueux",
      });
      expect(resMissingWork.valid).toBe(false);
      expect(resMissingWork.errorCode).toBe(MAINTENANCE_ERROR_CODES.WORK_DONE_REQUIRED);

      const resComplete = validateTransition({
        fromStatus: "EN_COURS",
        toStatus: "RESOLUE",
        actorRole: "TECHNICIAN",
        diagnostic: "Joint de siphon défectueux",
        workDone: "Remplacement du joint 32mm et test d'écoulement sans fuite",
      });
      expect(resComplete.valid).toBe(true);
    });
  });

  describe("Closure & Reopening", () => {
    it("allows TENANT and OWNER to close resolved request", () => {
      expect(
        validateTransition({
          fromStatus: "RESOLUE",
          toStatus: "CLOTUREE",
          actorRole: "TENANT",
        }).valid
      ).toBe(true);

      expect(
        validateTransition({
          fromStatus: "RESOLUE",
          toStatus: "CLOTUREE",
          actorRole: "OWNER",
        }).valid
      ).toBe(true);
    });

    it("requires reason when reopening from RESOLUE or CLOTUREE", () => {
      const resNoReason = validateTransition({
        fromStatus: "RESOLUE",
        toStatus: "REOUVERTE",
        actorRole: "TENANT",
      });
      expect(resNoReason.valid).toBe(false);
      expect(resNoReason.errorCode).toBe(MAINTENANCE_ERROR_CODES.REASON_REQUIRED);

      const resWithReason = validateTransition({
        fromStatus: "CLOTUREE",
        toStatus: "REOUVERTE",
        actorRole: "TENANT",
        reason: "La fuite réapparaît sous forte pression",
      });
      expect(resWithReason.valid).toBe(true);
    });

    it("allows OWNER to accept reopened request", () => {
      const res = validateTransition({
        fromStatus: "REOUVERTE",
        toStatus: "ACCEPTEE",
        actorRole: "OWNER",
      });
      expect(res.valid).toBe(true);
    });
  });

  describe("getAllowedTransitions", () => {
    it("returns correct actions for OWNER on EN_ATTENTE", () => {
      const actions = getAllowedTransitions("EN_ATTENTE", "OWNER");
      const targetStatuses = actions.map((a) => a.to);
      expect(targetStatuses).toContain("ACCEPTEE");
      expect(targetStatuses).toContain("REJETEE");
      expect(targetStatuses).not.toContain("EN_COURS");
    });

    it("returns correct actions for TENANT on EN_ATTENTE", () => {
      const actions = getAllowedTransitions("EN_ATTENTE", "TENANT");
      const targetStatuses = actions.map((a) => a.to);
      expect(targetStatuses).toContain("ANNULEE");
      expect(targetStatuses).not.toContain("ACCEPTEE");
    });
  });
});
