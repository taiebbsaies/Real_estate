import "server-only";

/**
 * Test apartments are a local-development aid only.
 *
 * They are enabled only when:
 * - the app is not running in production, and
 * - the developer explicitly opts in with ENABLE_TEST_PROPERTIES=true.
 *
 * In every other environment the feature is invisible and rejected server-side.
 */
export function isTestPropertiesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_PROPERTIES === "true"
  );
}
