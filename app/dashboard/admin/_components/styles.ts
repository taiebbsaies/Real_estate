export const cardClass =
  "rounded-2xl border border-[#DCFCE7] bg-white shadow-xs dark:border-emerald-500/15 dark:bg-[#0c1410]";
export const headingClass = "text-xl font-bold tracking-tight text-[#1F2937] dark:text-zinc-50";
export const mutedClass = "text-xs text-[#6B7280] dark:text-zinc-400";
export const inputClass =
  "rounded-lg border border-[#DCFCE7] bg-white px-3 py-1.5 text-xs text-[#1F2937] focus:border-[#166534] focus:outline-none dark:border-emerald-500/15 dark:bg-[#060907] dark:text-zinc-100";
export const buttonClass =
  "rounded-lg bg-[#166534] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#14532d] dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400";
export const secondaryButtonClass =
  "rounded-lg border border-[#DCFCE7] px-3 py-1.5 text-xs font-semibold text-[#1F2937] hover:bg-[#F0FDF4] dark:border-emerald-500/15 dark:text-zinc-200 dark:hover:bg-emerald-950/40";
export const dangerButtonClass =
  "rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/40";
export const tableClass = "w-full min-w-[720px] text-left text-sm";
export const thClass =
  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:text-zinc-400";
export const tdClass =
  "border-t border-[#DCFCE7] px-4 py-3 align-top text-[#1F2937] dark:border-emerald-500/15 dark:text-zinc-200";

const badgeBase = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";
export const badgeClass = {
  success: `${badgeBase} bg-[#DCFCE7] text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-300`,
  warning: `${badgeBase} bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300`,
  danger: `${badgeBase} bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300`,
  neutral: `${badgeBase} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`,
};
