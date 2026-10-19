import {
  millimesToTnd,
  tunisDayIso,
} from "@/lib/budget/calculations";

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

export function formatDayLabel(dayIso: string, reference: Date = new Date()): string {
  const [year, monthNumber, day] = dayIso.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, day);

  const todayIso = tunisDayIso(reference);
  const yesterdayIso = tunisDayIso(
    new Date(reference.getTime() - 24 * 60 * 60 * 1000),
  );

  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(date);
  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  if (dayIso === todayIso) {
    return `Aujourd'hui · ${capitalized}`;
  }

  if (dayIso === yesterdayIso) {
    return `Hier · ${capitalized}`;
  }

  return capitalized;
}

export function formatShortDayLabel(dayIso: string): string {
  const [year, monthNumber, day] = dayIso.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, day);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}
