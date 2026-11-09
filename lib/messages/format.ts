export function formatRelativeTime(iso: string, now = Date.now()): string {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 60) return "À l’instant";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `Il y a ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Il y a ${elapsedHours} h`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return "Hier";
  if (elapsedDays < 7) return `Il y a ${elapsedDays} j`;

  const elapsedWeeks = Math.floor(elapsedDays / 7);
  if (elapsedWeeks < 5) return `Il y a ${elapsedWeeks} sem.`;

  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function areSameLocalDay(firstIso: string, secondIso: string): boolean {
  const first = new Date(firstIso);
  const second = new Date(secondIso);
  return (
    Number.isFinite(first.getTime()) &&
    Number.isFinite(second.getTime()) &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatMessageDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";

  if (areSameLocalDay(iso, now.toISOString())) return "Aujourd’hui";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (areSameLocalDay(iso, yesterday.toISOString())) return "Hier";

  const formatted = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatted.charAt(0).toLocaleUpperCase("fr-FR") + formatted.slice(1);
}
