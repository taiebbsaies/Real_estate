import type { PriceInsight } from "@/lib/properties/price-insight";

interface PriceInsightBadgeProps {
  insight: PriceInsight | null;
  city: string;
  /** Admin mode: flag both "above market" and suspiciously low prices. */
  suspect?: boolean;
  className?: string;
}

const levelClasses: Record<PriceInsight["level"], string> = {
  below:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  average: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  above:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
};

const levelDots: Record<PriceInsight["level"], string> = {
  below: "bg-emerald-500",
  average: "bg-zinc-400",
  above: "bg-amber-500",
};

export default function PriceInsightBadge({
  insight,
  city,
  suspect = false,
  className = "",
}: PriceInsightBadgeProps) {
  if (!insight) {
    return null;
  }

  const isSuspect =
    suspect && (insight.level === "above" || insight.ratio < 0.5);
  const label = isSuspect ? "Prix suspect" : insight.label;
  const delta = Math.round((insight.ratio - 1) * 100);
  const deltaLabel =
    delta === 0 ? "0 %" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} %`;
  const tooltip = `Estimation basée sur ${insight.sampleSize} annonces similaires à ${city}`;

  return (
    <span
      title={tooltip}
      aria-label={`${label} — ${tooltip}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isSuspect
          ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
          : levelClasses[insight.level]
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          isSuspect ? "bg-red-500" : levelDots[insight.level]
        }`}
      />
      {label}
      {!isSuspect && (
        <span className="font-bold tabular-nums">{deltaLabel}</span>
      )}
    </span>
  );
}
