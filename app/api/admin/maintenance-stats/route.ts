import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import connectDB from "@/src/lib/mongoose";
import { MaintenanceRequestModel } from "@/src/models/maintenance-request";
import InterventionModel from "@/src/models/intervention";
import CategoryModel from "@/src/models/category";
import { predictiveService } from "@/src/services/predictive.service";

export async function GET() {
  try {
    const session = await auth();
    const { user } = session;

    if (!["ADMIN", "OWNER"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Accès non autorisé" },
        { status: 403 }
      );
    }

    await connectDB();

    // 1. Status Counts
    const statusAgg = await MaintenanceRequestModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusCounts: Record<string, number> = {};
    for (const item of statusAgg) {
      statusCounts[item._id] = item.count;
    }

    // 2. Total requests & Resolved count
    const totalRequests = await MaintenanceRequestModel.countDocuments();
    const resolvedRequests = (statusCounts["RESOLUE"] || 0) + (statusCounts["CLOTUREE"] || 0);

    // 3. Category Breakdown
    const categoryAgg = await MaintenanceRequestModel.aggregate([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    const categories = await CategoryModel.find({}).lean();
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    const categoryBreakdown = categoryAgg.map((item) => ({
      categoryId: item._id ? item._id.toString() : "autre",
      name: (item._id && categoryMap.get(item._id.toString())) || "Non catégorisé",
      count: item.count,
    }));

    // 4. Average Resolution Time in hours
    const resolvedDocs = await MaintenanceRequestModel.find({
      resolvedAt: { $exists: true, $ne: null },
    }).select("createdAt resolvedAt");

    let totalDurationHours = 0;
    for (const doc of resolvedDocs) {
      if (doc.resolvedAt && doc.createdAt) {
        const diffMs = doc.resolvedAt.getTime() - doc.createdAt.getTime();
        totalDurationHours += diffMs / (1000 * 60 * 60);
      }
    }
    const avgResolutionHours =
      resolvedDocs.length > 0
        ? Number((totalDurationHours / resolvedDocs.length).toFixed(1))
        : 2.5;

    // 5. Total and Average Intervention Cost in DT
    const costAgg = await InterventionModel.aggregate([
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" },
          avgCost: { $avg: "$cost" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalCostDT = costAgg[0]?.totalCost ? Math.round(costAgg[0].totalCost) : 0;
    const avgCostDT = costAgg[0]?.avgCost ? Math.round(costAgg[0].avgCost) : 0;

    // 6. Predictive Alerts & Category Cost Breakdown
    const predictiveAlerts = await predictiveService.getPredictiveAlerts();
    const categoryCostStats = await predictiveService.getCategoryCostStats();

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        resolvedRequests,
        inProgressRequests: statusCounts["EN_COURS"] || 0,
        pendingApprovalRequests: statusCounts["EN_ATTENTE"] || 0,
        avgResolutionHours,
        totalCostDT,
        avgCostDT,
        statusCounts,
        categoryBreakdown,
        categoryCostStats,
        predictiveAlerts,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/maintenance-stats error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
