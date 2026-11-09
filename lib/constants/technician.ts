// `value` must match the maintenance Category slugs: technician matching compares them directly.
export const TECHNICIAN_SKILLS = [
  { value: "plomberie", label: "Plomberie & Sanitaire" },
  { value: "electricite", label: "Électricité & Éclairage" },
  { value: "climatisation", label: "Chauffage & Climatisation" },
  { value: "serrurerie", label: "Serrurerie & Sécurité" },
  { value: "electromenager", label: "Électroménager" },
  { value: "maconnerie", label: "Maçonnerie, Peinture & Menuiserie" },
] as const;

// Coordinates are [lng, lat], the GeoJSON order used by TechnicianProfile.location.
export const TUNISIA_GOVERNORATES = [
  { name: "Ariana", coordinates: [10.1647, 36.8625] },
  { name: "Béja", coordinates: [9.1817, 36.7256] },
  { name: "Ben Arous", coordinates: [10.2189, 36.7531] },
  { name: "Bizerte", coordinates: [9.8739, 37.2744] },
  { name: "Gabès", coordinates: [10.0982, 33.8815] },
  { name: "Gafsa", coordinates: [8.7757, 34.425] },
  { name: "Jendouba", coordinates: [8.7802, 36.5011] },
  { name: "Kairouan", coordinates: [10.0963, 35.6781] },
  { name: "Kasserine", coordinates: [8.8365, 35.1676] },
  { name: "Kébili", coordinates: [8.969, 33.7044] },
  { name: "Le Kef", coordinates: [8.7049, 36.1742] },
  { name: "Mahdia", coordinates: [11.0622, 35.5047] },
  { name: "Manouba", coordinates: [10.0972, 36.8081] },
  { name: "Médenine", coordinates: [10.5055, 33.3549] },
  { name: "Monastir", coordinates: [10.8262, 35.7643] },
  { name: "Nabeul", coordinates: [10.7376, 36.4561] },
  { name: "Sfax", coordinates: [10.7603, 34.7406] },
  { name: "Sidi Bouzid", coordinates: [9.4839, 35.0382] },
  { name: "Siliana", coordinates: [9.3708, 36.0849] },
  { name: "Sousse", coordinates: [10.6369, 35.8256] },
  { name: "Tataouine", coordinates: [10.4518, 32.9297] },
  { name: "Tozeur", coordinates: [8.1335, 33.9197] },
  { name: "Tunis", coordinates: [10.1815, 36.8065] },
  { name: "Zaghouan", coordinates: [10.1425, 36.4029] },
] as const satisfies readonly { name: string; coordinates: readonly [number, number] }[];

function normalizeLocation(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Finds a governorate named in free text, trying each text in order. Whole words only: "Tunisie" is not "Tunis". */
export function findGovernorateCoordinates(...texts: (string | undefined)[]): [number, number] | null {
  for (const text of texts) {
    if (!text) continue;
    const normalized = normalizeLocation(text);
    for (const { name, coordinates } of TUNISIA_GOVERNORATES) {
      if (new RegExp(`\\b${normalizeLocation(name)}\\b`).test(normalized)) {
        return [coordinates[0], coordinates[1]];
      }
    }
  }
  return null;
}

export function getGovernorateCoordinates(name: string): [number, number] | null {
  const match = TUNISIA_GOVERNORATES.find((governorate) => governorate.name === name);
  return match ? [match.coordinates[0], match.coordinates[1]] : null;
}
