import mongoose from "mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import { EquipmentModel, PropertyModel } from "@/src/models/shared";
import connectDB from "@/src/lib/mongoose";

export interface PredictiveAlert {
  equipmentId?: string;
  equipmentName: string;
  propertyId: string;
  propertyTitle: string;
  interventionsCount: number;
  totalCostDT: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  recommendation: string;
  diagnosticHistory: string[];
}

export interface CategoryCostStats {
  categoryId: string;
  categoryName: string;
  totalCostDT: number;
  averageCostDT: number;
  interventionsCount: number;
}

export class PredictiveMaintenanceService {
  /**
   * Analyzes intervention records to identify high-frequency breakdowns (>= 3 interventions in last 6 months)
   * or aging equipment requiring preventive replacement.
   */
  async getPredictiveAlerts(propertyId?: string): Promise<PredictiveAlert[]> {
    await connectDB();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const matchQuery: Record<string, unknown> = {
      equipmentId: { $exists: true, $ne: null },
      createdAt: { $gte: sixMonthsAgo },
    };

    if (propertyId) {
      matchQuery.propertyId = new mongoose.Types.ObjectId(propertyId);
    }

    const aggregated = await MaintenanceRequestModel.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "interventions",
          localField: "_id",
          foreignField: "requestId",
          as: "intervention",
        },
      },
      {
        $unwind: {
          path: "$intervention",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$equipmentId",
          propertyId: { $first: "$propertyId" },
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ["$intervention.cost", 0] } },
          diagnostics: { $push: "$intervention.diagnostic" },
        },
      },
      {
        $match: {
          count: { $gte: 2 }, // Alert on 2+ or 3+ failures in last 6 months
        },
      },
      { $sort: { count: -1 } },
    ]);

    const alerts: PredictiveAlert[] = [];

    for (const item of aggregated) {
      const equipment = await EquipmentModel.findById(item._id);
      const property = await PropertyModel.findById(item.propertyId);

      const count = item.count;
      const totalCostDT = Math.round(item.totalCost || 0);
      const severity = count >= 3 ? "CRITICAL" : "HIGH";

      const validDiagnostics = (item.diagnostics || []).filter(
        (d: unknown) => typeof d === "string" && d.trim().length > 0
      );

      alerts.push({
        equipmentId: item._id.toString(),
        equipmentName: equipment ? `${equipment.name} (${equipment.brand || ""})` : "Équipement non spécifié",
        propertyId: item.propertyId.toString(),
        propertyTitle: property?.title || "Propriété",
        interventionsCount: count,
        totalCostDT,
        severity,
        recommendation:
          count >= 3
            ? `Remplacement préventif urgent recommandé : cet équipement cumule ${count} pannes récentes (${totalCostDT} DT de réparations). Le coût de réparation dépasse la valeur de remplacement.`
            : `Maintenance préventive recommandée : ${count} pannes enregistrées récemment. Contrôle complet requis.`,
        diagnosticHistory: validDiagnostics,
      });
    }

    return alerts;
  }

  /**
   * Aggregates average repair costs and intervention counts per category.
   */
  async getCategoryCostStats(): Promise<CategoryCostStats[]> {
    await connectDB();

    const stats = await MaintenanceRequestModel.aggregate([
      {
        $lookup: {
          from: "interventions",
          localField: "_id",
          foreignField: "requestId",
          as: "intervention",
        },
      },
      {
        $unwind: {
          path: "$intervention",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$categoryId",
          categoryName: { $first: "$category.name" },
          totalCost: { $sum: { $ifNull: ["$intervention.cost", 0] } },
          interventionsCount: { $sum: 1 },
        },
      },
      {
        $project: {
          categoryId: "$_id",
          categoryName: 1,
          totalCostDT: "$totalCost",
          interventionsCount: 1,
          averageCostDT: {
            $cond: [
              { $gt: ["$interventionsCount", 0] },
              { $divide: ["$totalCost", "$interventionsCount"] },
              0,
            ],
          },
        },
      },
      { $sort: { totalCostDT: -1 } },
    ]);

    return stats.map((s) => ({
      categoryId: s._id.toString(),
      categoryName: s.categoryName,
      totalCostDT: Math.round(s.totalCostDT),
      averageCostDT: Math.round(s.averageCostDT),
      interventionsCount: s.interventionsCount,
    }));
  }
}

export const predictiveService = new PredictiveMaintenanceService();
export default predictiveService;
