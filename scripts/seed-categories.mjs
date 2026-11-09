// Creates the missing maintenance categories without touching any other data.
// Safe to run several times. Usage: node --env-file=.env scripts/seed-categories.mjs
import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Slugs must match TECHNICIAN_SKILLS in lib/constants/technician.ts.
const CATEGORIES = [
  {
    name: "Plomberie & Sanitaire",
    slug: "plomberie",
    icon: "Wrench",
    description: "Fuites d'eau, canalisations bouchées, robinetterie, chauffe-eau",
  },
  {
    name: "Électricité & Éclairage",
    slug: "electricite",
    icon: "Zap",
    description: "Tableaux électriques, disjoncteurs, prises, luminaires, court-circuit",
  },
  {
    name: "Chauffage & Climatisation",
    slug: "climatisation",
    icon: "Thermometer",
    description: "Climatiseurs split, chaudières, radiateurs, pompes à chaleur",
  },
  {
    name: "Serrurerie & Sécurité",
    slug: "serrurerie",
    icon: "Key",
    description: "Serrures bloquées, cylindres, verrous de sécurité, portes blindées",
  },
  {
    name: "Électroménager",
    slug: "electromenager",
    icon: "Refrigerator",
    description: "Fours, plaques de cuisson, hottes, lave-vaisselle, machines à laver",
  },
  {
    name: "Maçonnerie, Peinture & Menuiserie",
    slug: "maconnerie",
    icon: "Paintbrush",
    description: "Infiltrations, retouches peinture, joints d'étanchéité, volets roulants",
  },
];

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not set. Run with: node --env-file=.env scripts/seed-categories.mjs");
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  const collection = mongoose.connection.db.collection("categories");
  const now = new Date();
  const result = await collection.bulkWrite(
    CATEGORIES.map((category) => ({
      updateOne: {
        filter: { slug: category.slug },
        // $setOnInsert: an existing category keeps its current values.
        update: { $setOnInsert: { ...category, isActive: true, createdAt: now, updatedAt: now } },
        upsert: true,
      },
    })),
  );
  const total = await collection.countDocuments({ isActive: true });
  console.log(`Created: ${result.upsertedCount}. Active categories: ${total}.`);
} finally {
  await mongoose.disconnect();
}
