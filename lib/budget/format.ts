import { millimesToTnd } from "@/lib/budget/calculations";

export function formatTnd(millimes: number): string {
  return `${millimesToTnd(millimes)} TND`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayLabel(dayIso: string, reference: Date = new Date()): string {
  const [year, monthNumber, day] = dayIso.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, day);

  const today = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(date);
  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  if (isSameLocalDay(date, today)) {
    return `Aujourd'hui · ${capitalized}`;
  }

  if (isSameLocalDay(date, yesterday)) {
    return `Hier · ${capitalized}`;
  }

  return capitalized;
}
