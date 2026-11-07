import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  transitionStatus,
  StatusTransitionError,
} from "./maintenance-status.service";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { MAINTENANCE_ERROR_CODES } from "@/src/modules/maintenance/constants";

// Mock Mongoose model queries for unit test speed and determinism
vi.mock("@/src/models/maintenance-request", () => {
  return {
    MaintenanceRequestModel: {
      findById: vi.fn(),
      findOneAndUpdate: vi.fn(),
    },
  };
});

vi.mock("@/src/models/shared", () => {
  return {
    PropertyModel: {
      findById: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          title: "Apt Test",
          ownerId: "660000000000000000000002",
        }),
      }),
    },
    NotificationModel: {
      insertMany: vi.fn().mockResolvedValue([]),
    },
    UserModel: {
      findById: vi.fn().mockResolvedValue({ firstName: "Test" }),
    },
  };
});

vi.mock("@/src/models/maintenance-history", () => {
  return {
    MaintenanceHistoryModel: vi.fn().mockImplementation(() => ({
      save: vi.fn().mockResolvedValue(true),
    })),
  };
});

vi.mock("@/src/models/intervention", () => {
  return {
    InterventionModel: {
      findOne: vi.fn().mockResolvedValue(null),
    },
    default: {
      findOne: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock("@/src/lib/mongoose", () => {
  return {
    default: vi.fn().mockResolvedValue({}),
  };
});

describe("MaintenanceStatusService & Concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 409 Conflict when expectedVersion does not match current request version", async () => {
    // Current request is at version 3
    vi.mocked(MaintenanceRequestModel.findById).mockResolvedValue({
      _id: "660000000000000000000010",
      status: "EN_ATTENTE",
      __v: 3,
      propertyId: "660000000000000000000020",
    } as any);

    // Caller attempts transition expecting version 2 (stale read)
    await expect(
      transitionStatus({
        requestId: "660000000000000000000010",
        targetStatus: "ACCEPTEE",
        actorRole: "OWNER",
        expectedVersion: 2, // Out of sync!
      })
    ).rejects.toThrow(StatusTransitionError);

    try {
      await transitionStatus({
        requestId: "660000000000000000000010",
        targetStatus: "ACCEPTEE",
        actorRole: "OWNER",
        expectedVersion: 2,
      });
    } catch (err) {
      const error = err as StatusTransitionError;
      expect(error.status).toBe(409);
      expect(error.errorCode).toBe(MAINTENANCE_ERROR_CODES.OPTIMISTIC_LOCK_CONFLICT);
    }
  });

  it("throws 400 when rejection is attempted without a reason", async () => {
    vi.mocked(MaintenanceRequestModel.findById).mockResolvedValue({
      _id: "660000000000000000000010",
      status: "EN_ATTENTE",
      __v: 1,
      propertyId: "660000000000000000000020",
    } as any);

    await expect(
      transitionStatus({
        requestId: "660000000000000000000010",
        targetStatus: "REJETEE",
        actorRole: "OWNER",
        reason: "", // Empty reason!
      })
    ).rejects.toThrow(StatusTransitionError);
  });

  it("throws 400 when resolution is attempted without diagnostic or workDone", async () => {
    vi.mocked(MaintenanceRequestModel.findById).mockResolvedValue({
      _id: "660000000000000000000010",
      status: "EN_COURS",
      __v: 2,
      propertyId: "660000000000000000000020",
    } as any);

    await expect(
      transitionStatus({
        requestId: "660000000000000000000010",
        targetStatus: "RESOLUE",
        actorRole: "TECHNICIAN",
        diagnostic: "",
        workDone: "",
      })
    ).rejects.toThrow(StatusTransitionError);
  });
});
