import type {
  QualityLevel,
  QualityTip,
} from "@/lib/properties/quality-score";

interface QualityScoreBadgeProps {
  score: number;
  level: QualityLevel;
  tips?: QualityTip[];
  showTips?: boolean;
  className?: string;
}

const levelConfig: Record<
  QualityLevel,
  { label: string; ring: string; text: string; background: string }
> = {
  weak: {
    label: "À améliorer",
    ring: "text-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    background: "bg-rose-50 dark:bg-rose-950/30",
  },
  good: {
    label: "Correct",
    ring: "text-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    background: "bg-amber-50 dark:bg-amber-950/30",
  },
  excellent: {
    label: "Excellent",
    ring: "text-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    background: "bg-emerald-50 dark:bg-emerald-950/30",
  },
};

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function QualityScoreBadge({
  score,
  level,
  tips,
  showTips = false,
  className = "",
}: QualityScoreBadgeProps) {
  const config = levelConfig[level];
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));
  const offset = CIRCUMFERENCE * (1 - safeScore / 100);

  return (
    <div
      role="group"
      aria-label={`Score de qualité : ${safeScore} sur 100, ${config.label}`}
      className={`rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 40 40"
          className="h-10 w-10 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-zinc-200 dark:text-zinc-700"
          />
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={config.ring}
          />
        </svg>
        <div>
          <p className="text-sm font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
            {safeScore}
            <span className="text-[10px] font-semibold text-zinc-400">
              /100
            </span>
          </p>
          <p className={`text-[10px] font-semibold ${config.text}`}>
            {config.label}
          </p>
        </div>
      </div>

      {showTips && tips && tips.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            Comment améliorer cette annonce
          </summary>
          <ul className={`mt-1.5 space-y-1 rounded-lg px-2 py-1.5 ${config.background}`}>
            {tips.map((tip) => (
              <li
                key={tip.id}
                className="text-[11px] text-zinc-700 dark:text-zinc-300"
              >
                · {tip.label}{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  (+{tip.points} pts)
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {showTips && (!tips || tips.length === 0) && (
        <p className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          Annonce complète, aucun conseil.
        </p>
      )}
    </div>
  );
}
