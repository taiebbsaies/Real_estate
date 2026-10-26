/**
 * Presentation-only helper for development test apartments.
 *
 * Records keep their `TEST-` prefix in the database so they can never be
 * confused with real data, while the UI shows the shorter code (TEST-101 -> 101).
 */
export function formatTestPropertyCode(code: string): string {
  return code.replace(/^TEST-/, "");
}
