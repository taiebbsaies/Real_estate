import "server-only";

/**
 * Accept only URLs this application manages for the given listing:
 * - legacy/local URLs under /uploads/properties/<propertyId>/
 * - Cloudinary URLs inside properties/<propertyId>/
 * The database filter still checks the exact URL, this only narrows input.
 */
export function isManagedImageUrl(url: string, propertyId: string): boolean {
  if (!url || !propertyId) {
    return false;
  }

  if (url.startsWith(`/uploads/properties/${propertyId}/`)) {
    return true;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
    return false;
  }

  const marker = `/${cloudName}/image/upload/`;
  const index = parsed.pathname.indexOf(marker);
  if (index === -1) {
    return false;
  }

  const rest = parsed.pathname
    .slice(index + marker.length)
    .replace(/^v\d+\//, "");

  return rest.startsWith(`properties/${propertyId}/`);
}
