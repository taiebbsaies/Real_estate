export type AlertLevel = "normal" | "warning" | "exceeded";

export function tndToMillimes(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return Number.NaN;
    }

    return Math.round(value * 1000);
  }

  let normalized = value.trim().replace(/[\s\u00A0\u202F]/g, "");

  if (!normalized) {
    return Number.NaN;
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";

    normalized = normalized.split(thousandsSeparator).join("");
    normalized = normalized.replace(decimalSeparator, ".");
  } else if (lastComma !== -1) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return Number.NaN;
  }

  return Math.round(Number.parseFloat(normalized) * 1000);
}

export function millimesToTnd(millimes: number): string {
  const safe = Number.isFinite(millimes) ? Math.trunc(millimes) : 0;
  const sign = safe < 0 ? "-" : "";
  const absolute = Math.abs(safe);
  const wholeTnd = Math.floor(absolute / 1000);
  const restMillimes = String(absolute % 1000).padStart(3, "0");

  return `${sign}${wholeTnd.toLocaleString("fr-FR")},${restMillimes}`;
}

export function monthBounds(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split("-").map(Number);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

export function daysLeftInMonth(date: Date): number {
  const totalDays = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return totalDays - date.getUTCDate();
}

export function currentMonth(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function previousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return currentMonth(new Date(Date.UTC(year, monthNumber - 2, 1)));
}

export function nextMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return currentMonth(new Date(Date.UTC(year, monthNumber, 1)));
}

export function remaining(limit: number, spent: number): number {
  return limit - spent;
}

export function percentUsed(limit: number, spent: number): number {
  if (limit <= 0) {
    return 0;
  }

  return Math.round((spent / limit) * 1000) / 10;
}

export function alertLevel(percent: number): AlertLevel {
  if (percent >= 100) {
    return "exceeded";
  }

  if (percent >= 80) {
    return "warning";
  }

  return "normal";
}

export function forecastEndOfMonth(
  spent: number,
  dayOfMonth: number,
  daysOfTheMonth: number,
): number {
  if (dayOfMonth < 1) {
    return spent;
  }

  return Math.round((spent / dayOfMonth) * daysOfTheMonth);
}

export function shareByCategory(
  totalsByCategory: Record<string, number>,
): Record<string, number> {
  const total = Object.values(totalsByCategory).reduce(
    (sum, value) => sum + value,
    0,
  );

  if (total <= 0) {
    return Object.fromEntries(
      Object.keys(totalsByCategory).map((category) => [category, 0]),
    );
  }

  return Object.fromEntries(
    Object.entries(totalsByCategory).map(([category, value]) => [
      category,
      Math.round((value / total) * 1000) / 10,
    ]),
  );
}
