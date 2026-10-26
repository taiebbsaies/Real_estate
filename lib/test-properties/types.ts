/**
 * Serializable shape of a development-only test apartment.
 * Safe to import from client components (types only).
 */
export type SerializedTestProperty = {
  _id: string;
  code: string;
  label: string;
  address: string;
  city: string;
};
