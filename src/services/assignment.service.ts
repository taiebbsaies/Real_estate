import mongoose from "mongoose";
import AssignmentModel, { type IAssignment } from "@/src/models/assignment";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import InterventionModel from "@/src/models/intervention";
import { NotificationModel, UserModel } from "@/src/models/shared";
import MaintenanceHistoryModel from "@/src/models/maintenance-history";
import { transitionStatus } from "./maintenance-status.service";
import { getRecommendedTechnicians } from "./matching.service";
import { type ActorRole } from "@/src/modules/maintenance/constants";
import connectDB from "@/src/lib/mongoose";

export interface ProposeAssignmentParams {
  requestId: string;
  technicianId: string;
  proposedById: string;
  proposedByRole: ActorRole;
  directAssignment?: boolean;
}

export interface RespondAssignmentParams {
  assignmentId?: string;
  requestId: string;
  technicianId: string;
  action: "ACCEPT" | "REFUSE";
  refusalReason?: string;
}

export class AssignmentService {
  /**
   * Owner or Admin proposes or directly assigns a technician to a request.
   */
  async proposeAssignment(params: ProposeAssignmentParams): Promise<IAssignment> {
    const { requestId, technicianId, proposedById, directAssignment } = params;
    await connectDB();

    const request = await MaintenanceRequestModel.findById(requestId);
    if (!request) {
      throw new Error(`Demande ${requestId} introuvable.`);
    }

    // Calculate match score
    const recommended = await getRecommendedTechnicians(requestId);
    const candidate = recommended.find((t) => t.technicianId === technicianId);
    if (!candidate) {
      throw new Error("Ce technicien n'est pas disponible pour cette mission.");
    }

    const matchScore = candidate ? candidate.matchScore : 50;
    const matchDetails = candidate
      ? {
          skillScore: candidate.matchDetails.skillScore,
          availabilityScore: candidate.matchDetails.availabilityScore,
          distanceScore: candidate.matchDetails.distanceScore,
          ratingScore: candidate.matchDetails.ratingScore,
          experienceScore: candidate.matchDetails.experienceScore,
          distanceKm: candidate.distanceKm ?? undefined,
          explanation: candidate.matchDetails.explanation,
        }
      : undefined;

    // Cancel any previous pending assignment for this request
    await AssignmentModel.updateMany(
      { requestId: request._id, status: "PROPOSED" },
      { status: "CANCELLED" }
    );

    const initialStatus = directAssignment ? "ACCEPTED" : "PROPOSED";

    const assignment = await AssignmentModel.create({
      requestId: request._id,
      technicianId: new mongoose.Types.ObjectId(technicianId),
      proposedBy: new mongoose.Types.ObjectId(proposedById),
      status: initialStatus,
      matchScore,
      matchDetails,
    });

    if (directAssignment) {
      // Transition request immediately to TECHNICIEN_ASSIGNE
      request.assignedTechnicianId = new mongoose.Types.ObjectId(technicianId);
      await request.save();

      await transitionStatus({
        requestId: request._id.toString(),
        targetStatus: "TECHNICIEN_ASSIGNE",
        actorId: proposedById,
        actorRole: params.proposedByRole,
        comment: `Assignation directe du technicien (${candidate?.name || technicianId})`,
      });

      // Ensure Intervention stub exists
      await InterventionModel.findOneAndUpdate(
        { requestId: request._id },
        {
          technicianId: new mongoose.Types.ObjectId(technicianId),
          diagnostic: "",
          workDone: "",
          cost: 0,
          durationMinutes: 0,
        },
        { upsert: true, new: true }
      );
    } else {
      // Notify technician of proposed mission
      await NotificationModel.create({
        userId: new mongoose.Types.ObjectId(technicianId),
        title: "Nouvelle mission de maintenance proposée",
        message: `Une intervention pour "${request.title}" vous a été proposée (${matchScore}% match).`,
        type: "ASSIGNMENT",
        link: `/maintenance/requests/${request._id}`,
      });
    }

    return assignment;
  }

  /**
   * Admin assigns a technician to an accepted request, or replaces the technician before work starts.
   */
  async reassignTechnician(params: {
    requestId: string;
    technicianId: string;
    actorId: string;
  }): Promise<void> {
    const { requestId, technicianId, actorId } = params;
    await connectDB();

    const request = await MaintenanceRequestModel.findById(requestId);
    if (!request) {
      throw new Error("Demande introuvable.");
    }

    const notifyNewTechnician = () =>
      NotificationModel.create({
        userId: new mongoose.Types.ObjectId(technicianId),
        title: "Nouvelle mission de maintenance",
        message: `L'administrateur vous a assigné l'intervention "${request.title}".`,
        type: "ASSIGNMENT",
        link: `/maintenance/requests/${request._id}`,
      });

    if (request.status === "ACCEPTEE") {
      await this.proposeAssignment({
        requestId,
        technicianId,
        proposedById: actorId,
        proposedByRole: "ADMIN",
        directAssignment: true,
      });
      await notifyNewTechnician();
      return;
    }

    if (request.status !== "TECHNICIEN_ASSIGNE") {
      throw new Error("Le technicien ne peut plus être changé à cette étape.");
    }

    const previousTechnicianId = request.assignedTechnicianId;
    if (previousTechnicianId && String(previousTechnicianId) === technicianId) {
      throw new Error("Ce technicien est déjà assigné à cette demande.");
    }

    const recommended = await getRecommendedTechnicians(requestId);
    const candidate = recommended.find((t) => t.technicianId === technicianId);
    if (!candidate) {
      throw new Error("Ce technicien n'est pas disponible pour cette mission.");
    }

    // The status does not change, so this does not go through transitionStatus.
    await AssignmentModel.updateMany(
      { requestId: request._id, status: { $in: ["PROPOSED", "ACCEPTED"] } },
      { status: "CANCELLED" }
    );
    await AssignmentModel.create({
      requestId: request._id,
      technicianId: new mongoose.Types.ObjectId(technicianId),
      proposedBy: new mongoose.Types.ObjectId(actorId),
      status: "ACCEPTED",
      matchScore: candidate.matchScore,
      matchDetails: {
        ...candidate.matchDetails,
        distanceKm: candidate.distanceKm ?? undefined,
      },
    });

    request.assignedTechnicianId = new mongoose.Types.ObjectId(technicianId);
    await request.save();

    await InterventionModel.updateOne(
      { requestId: request._id },
      { technicianId: new mongoose.Types.ObjectId(technicianId) }
    );

    await MaintenanceHistoryModel.create({
      requestId: request._id,
      propertyId: request.propertyId,
      action: "ASSIGNMENT",
      fromStatus: request.status,
      toStatus: request.status,
      actorId: new mongoose.Types.ObjectId(actorId),
      actorRole: "ADMIN",
      comment: `Technicien remplacé par l'administrateur (${candidate.name})`,
    });

    await notifyNewTechnician();
    if (previousTechnicianId) {
      await NotificationModel.create({
        userId: previousTechnicianId,
        title: "Mission réassignée",
        message: `L'intervention "${request.title}" a été confiée à un autre technicien.`,
        type: "ASSIGNMENT",
      });
    }
  }

  /**
   * Technician accepts or refuses a proposed intervention assignment.
   */
  async respondToAssignment(params: RespondAssignmentParams): Promise<IAssignment> {
    const { requestId, technicianId, action, refusalReason } = params;
    await connectDB();

    const request = await MaintenanceRequestModel.findById(requestId);
    if (!request) {
      throw new Error(`Demande ${requestId} introuvable.`);
    }

    const assignment = await AssignmentModel.findOne({
      requestId: request._id,
      technicianId: new mongoose.Types.ObjectId(technicianId),
      status: "PROPOSED",
    });

    if (!assignment) {
      throw new Error("Aucune proposition d'assignation en attente pour ce technicien.");
    }

    if (action === "ACCEPT") {
      assignment.status = "ACCEPTED";
      assignment.responseDate = new Date();
      await assignment.save();

      request.assignedTechnicianId = new mongoose.Types.ObjectId(technicianId);
      await request.save();

      // Transition to TECHNICIEN_ASSIGNE
      await transitionStatus({
        requestId: request._id.toString(),
        targetStatus: "TECHNICIEN_ASSIGNE",
        actorId: technicianId,
        actorRole: "TECHNICIAN",
        comment: "Proposition acceptée par le technicien.",
      });

      // Ensure Intervention record exists
      await InterventionModel.findOneAndUpdate(
        { requestId: request._id },
        {
          technicianId: new mongoose.Types.ObjectId(technicianId),
          diagnostic: "",
          workDone: "",
          cost: 0,
          durationMinutes: 0,
        },
        { upsert: true, new: true }
      );
    } else {
      assignment.status = "REFUSED";
      assignment.responseDate = new Date();
      assignment.refusalReason = refusalReason || "Technicien indisponible sur ce créneau.";
      await assignment.save();

      // Notify owner that tech declined so they can pick another candidate
      const techUser = await UserModel.findById(technicianId);
      await NotificationModel.create({
        userId: assignment.proposedBy,
        title: "Proposition refusée par le technicien",
        message: `${techUser?.firstName || "Le technicien"} a décliné l'intervention "${request.title}". Motif: ${assignment.refusalReason}`,
        type: "ASSIGNMENT",
        link: `/maintenance/requests/${request._id}`,
      });
    }

    return assignment;
  }
}

export const assignmentService = new AssignmentService();
export default assignmentService;
