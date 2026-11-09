import mongoose from "mongoose";
import { MaintenanceRequestModel, type IMaintenanceRequest } from "@/src/models/maintenance-request";
import { MaintenanceHistoryModel } from "@/src/models/maintenance-history";
import { NotificationModel, PropertyModel, UserModel } from "@/src/models/shared";
import { InterventionModel } from "@/src/models/intervention";
import { validateTransition } from "@/src/modules/maintenance/state-machine";
import {
  type MaintenanceStatus,
  type ActorRole,
  MAINTENANCE_ERROR_CODES,
} from "@/src/modules/maintenance/constants";
import connectDB from "@/src/lib/mongoose";

export interface TransitionStatusParams {
  requestId: string;
  targetStatus: MaintenanceStatus;
  actorId?: string;
  actorRole: ActorRole;
  expectedVersion?: number; // For optimistic locking (__v)
  reason?: string;
  diagnostic?: string;
  workDone?: string;
  comment?: string;
}

export class StatusTransitionError extends Error {
  errorCode: string;
  status: number;

  constructor(errorCode: string, message: string, status = 400) {
    super(message);
    this.name = "StatusTransitionError";
    this.errorCode = errorCode;
    this.status = status;
  }
}

/**
 * Executes a state transition with optimistic locking, state machine validation,
 * audit history appending, and stakeholder notification.
 */
export async function transitionStatus(params: TransitionStatusParams): Promise<IMaintenanceRequest> {
  const {
    requestId,
    targetStatus,
    actorId,
    actorRole,
    expectedVersion,
    reason,
    diagnostic,
    workDone,
    comment,
  } = params;

  await connectDB();

  // Load the current request
  const request = await MaintenanceRequestModel.findById(requestId);
  if (!request) {
    throw new StatusTransitionError(
      MAINTENANCE_ERROR_CODES.REQUEST_NOT_FOUND,
      `Demande d'intervention avec l'identifiant ${requestId} introuvable.`,
      404
    );
  }

  // Optimistic lock check if expectedVersion provided
  if (expectedVersion !== undefined && request.__v !== expectedVersion) {
    throw new StatusTransitionError(
      MAINTENANCE_ERROR_CODES.OPTIMISTIC_LOCK_CONFLICT,
      `Conflit de modification: la demande a été modifiée par un autre utilisateur (version courante: ${request.__v}, attendue: ${expectedVersion}). Veuillez recharger.`,
      409
    );
  }

  // If transition to RESOLUE, verify intervention record if diagnostic/workDone not passed directly
  let effectiveDiagnostic = diagnostic;
  let effectiveWorkDone = workDone;

  if (targetStatus === "RESOLUE" && (!effectiveDiagnostic || !effectiveWorkDone)) {
    const intervention = await InterventionModel.findOne({ requestId: request._id });
    if (intervention) {
      if (!effectiveDiagnostic) effectiveDiagnostic = intervention.diagnostic;
      if (!effectiveWorkDone) effectiveWorkDone = intervention.workDone;
    }
  }

  // Validate state machine rule
  const validation = validateTransition({
    fromStatus: request.status,
    toStatus: targetStatus,
    actorRole,
    reason,
    diagnostic: effectiveDiagnostic,
    workDone: effectiveWorkDone,
  });

  if (!validation.valid) {
    throw new StatusTransitionError(
      validation.errorCode || MAINTENANCE_ERROR_CODES.INVALID_TRANSITION,
      validation.message || "Transition interdite.",
      400
    );
  }

  const previousStatus = request.status;

  // Check if replica set is active for session/transaction
  let session: mongoose.ClientSession | null = null;
  let canUseTransactions = false;

  try {
    session = await mongoose.startSession();
    // Verify replica set or mongos
    const client = mongoose.connection.getClient() as unknown as { topology?: { description?: { type?: string } } };
    const topology = client.topology;
    const type = topology?.description?.type;
    canUseTransactions = Boolean(
      type &&
      type !== "Unknown" &&
      type !== "Single"
    );
  } catch {
    session = null;
    canUseTransactions = false;
  }

  const executeOperations = async (sess: mongoose.ClientSession | null) => {
    // 1. Update the request document with optimistic concurrency check
    const updateData: Record<string, unknown> = {
      status: targetStatus,
      $inc: { __v: 1 },
    };

    if (reason && targetStatus === "REJETEE") {
      updateData.rejectionReason = reason;
    }
    if (reason && targetStatus === "REOUVERTE") {
      updateData.reopenReason = reason;
    }
    if (targetStatus === "RESOLUE") {
      updateData.resolvedAt = new Date();
    }
    if (targetStatus === "CLOTUREE") {
      updateData.closedAt = new Date();
    }

    const query: Record<string, unknown> = {
      _id: request._id,
      __v: request.__v, // Enforce optimistic lock at the database query level
    };

    const queryOptions: mongoose.QueryOptions = { new: true };
    if (sess && canUseTransactions) {
      queryOptions.session = sess;
    }

    const updatedRequest = await MaintenanceRequestModel.findOneAndUpdate(
      query,
      updateData,
      queryOptions
    );

    if (!updatedRequest) {
      throw new StatusTransitionError(
        MAINTENANCE_ERROR_CODES.OPTIMISTIC_LOCK_CONFLICT,
        "Conflit de concurrence: la demande a été mise à jour simultanément.",
        409
      );
    }

    // 2. Append immutable history record
    const historyDoc = new MaintenanceHistoryModel({
      requestId: request._id,
      propertyId: request.propertyId,
      action: "STATUS_CHANGE",
      fromStatus: previousStatus,
      toStatus: targetStatus,
      actorId: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
      actorRole,
      comment: reason || comment || `Statut passé de ${previousStatus} à ${targetStatus}`,
      timestamp: new Date(),
    });

    if (sess && canUseTransactions) {
      await historyDoc.save({ session: sess });
    } else {
      await historyDoc.save();
    }

    // 3. Create notifications for relevant actors
    await dispatchNotifications({
      request: updatedRequest,
      previousStatus,
      targetStatus,
      reason,
      session: sess && canUseTransactions ? sess : undefined,
    });

    return updatedRequest;
  };

  try {
    if (session && canUseTransactions) {
      session.startTransaction();
      const result = await executeOperations(session);
      await session.commitTransaction();
      return result;
    } else {
      return await executeOperations(null);
    }
  } catch (error) {
    if (session && canUseTransactions) {
      try {
        await session.abortTransaction();
      } catch {
        // Ignore abort error
      }
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

/**
 * Dispatches relevant in-app notifications according to state changes
 */
async function dispatchNotifications(params: {
  request: IMaintenanceRequest;
  previousStatus: MaintenanceStatus;
  targetStatus: MaintenanceStatus;
  reason?: string;
  session?: mongoose.ClientSession;
}) {
  const { request, targetStatus, reason, session } = params;

  // Retrieve property to find owner
  const property = await PropertyModel.findById(request.propertyId).select("title ownerId tenantId");
  const notificationsToCreate: Array<{
    userId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: "MAINTENANCE" | "ASSIGNMENT" | "INTERVENTION" | "SYSTEM";
    link: string;
  }> = [];

  const reqLink = `/maintenance/requests/${request._id}`;

  if (targetStatus === "EN_ATTENTE" && property?.ownerId) {
    notificationsToCreate.push({
      userId: property.ownerId,
      title: "Nouvelle demande d'intervention",
      message: `Une nouvelle demande "${request.title}" nécessite votre validation pour "${property.title}".`,
      type: "MAINTENANCE",
      link: reqLink,
    });
  } else if (targetStatus === "ACCEPTEE" && request.tenantId) {
    notificationsToCreate.push({
      userId: request.tenantId,
      title: "Demande approuvée",
      message: `Votre propriétaire a validé votre demande "${request.title}". L'assignation d'un technicien est en cours.`,
      type: "MAINTENANCE",
      link: reqLink,
    });
  } else if (targetStatus === "REJETEE" && request.tenantId) {
    notificationsToCreate.push({
      userId: request.tenantId,
      title: "Demande refusée",
      message: `Votre demande "${request.title}" n'a pas été retenue. Motif: ${reason || "Non précisé"}.`,
      type: "MAINTENANCE",
      link: reqLink,
    });
  } else if (targetStatus === "TECHNICIEN_ASSIGNE" && request.assignedTechnicianId) {
    notificationsToCreate.push({
      userId: request.assignedTechnicianId,
      title: "Intervention assignée",
      message: `Vous avez été assigné à l'intervention "${request.title}".`,
      type: "ASSIGNMENT",
      link: reqLink,
    });
  } else if (targetStatus === "EN_COURS") {
    if (request.tenantId) {
      notificationsToCreate.push({
        userId: request.tenantId,
        title: "Intervention en cours",
        message: `Le technicien a démarré les travaux pour "${request.title}".`,
        type: "INTERVENTION",
        link: reqLink,
      });
    }
    if (property?.ownerId) {
      notificationsToCreate.push({
        userId: property.ownerId,
        title: "Intervention en cours",
        message: `L'intervention "${request.title}" a démarré sur votre propriété.`,
        type: "INTERVENTION",
        link: reqLink,
      });
    }
  } else if (targetStatus === "RESOLUE") {
    if (request.tenantId) {
      notificationsToCreate.push({
        userId: request.tenantId,
        title: "Travaux terminés — À vérifier",
        message: `Le technicien a résolu "${request.title}". Veuillez vérifier et clôturer la demande.`,
        type: "INTERVENTION",
        link: reqLink,
      });
    }
    if (property?.ownerId) {
      notificationsToCreate.push({
        userId: property.ownerId,
        title: "Intervention résolue",
        message: `Les travaux pour "${request.title}" sont terminés.`,
        type: "INTERVENTION",
        link: reqLink,
      });
    }
  } else if (targetStatus === "REOUVERTE" && property?.ownerId) {
    notificationsToCreate.push({
      userId: property.ownerId,
      title: "Demande réouverte",
      message: `La demande "${request.title}" a été réouverte par le locataire. Motif: ${reason}.`,
      type: "MAINTENANCE",
      link: reqLink,
    });
  }

  if (notificationsToCreate.length > 0) {
    if (session) {
      await NotificationModel.insertMany(notificationsToCreate, { session });
    } else {
      await NotificationModel.insertMany(notificationsToCreate);
    }
  }
}
