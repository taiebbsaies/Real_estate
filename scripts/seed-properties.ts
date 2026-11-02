import mongoose from "mongoose";
import { createPropertySchema } from "@/lib/validations/property";
import { connectDB } from "@/lib/mongodb";
import Property from "@/models/property";
import User from "@/models/user";

type SeedProperty = {
  title: string;
  description: string;
  price: string;
  city: string;
  zone?: string;
  address: string;
  latitude: string;
  longitude: string;
  surface: string;
  bedrooms?: string;
  bathrooms?: string;
  type: string;
  condition: string;
  availability: string;
  equipments: string[];
  rules?: string;
};

class SeedScriptError extends Error {}

const defaultOwnerEmail = "montassarbenhariz90+owner@gmail.com";

const seedProperties: SeedProperty[] = [
  {
    title: "Appartement lumineux près de la médina de Hammamet",
    description:
      "Appartement rénové et baigné de lumière, à quelques minutes à pied de la médina et de la plage. Le séjour s’ouvre sur un balcon agréable, idéal pour profiter des soirées du Cap Bon.",
    price: "1250",
    city: "Hammamet",
    zone: "Centre-ville",
    address: "12 rue des Orangers",
    latitude: "36.4000",
    longitude: "10.6167",
    surface: "92",
    bedrooms: "2",
    bathrooms: "1",
    type: "apartment",
    condition: "very_good",
    availability: "available",
    equipments: ["balcony", "air_conditioning", "furnished"],
    rules: "Logement non-fumeur. Animaux à discuter avec le propriétaire.",
  },
  {
    title: "Villa familiale avec jardin à Hammamet Nord",
    description:
      "Villa spacieuse dans un quartier calme, avec jardin arboré et terrasse ombragée. Les pièces de vie sont généreuses et la maison convient parfaitement à une famille recherchant un cadre paisible.",
    price: "3200",
    city: "Hammamet",
    zone: "Hammamet Nord",
    address: "8 avenue des Jasmins",
    latitude: "36.4168",
    longitude: "10.6341",
    surface: "210",
    bedrooms: "4",
    bathrooms: "2",
    type: "villa",
    condition: "good",
    availability: "available",
    equipments: ["garden", "terrace", "parking", "air_conditioning"],
    rules: "Entretien du jardin à la charge du locataire.",
  },
  {
    title: "Studio meublé au cœur de Tunis",
    description:
      "Studio fonctionnel et entièrement meublé dans un immeuble bien entretenu. Proche des transports, des commerces et des principaux services du centre de Tunis.",
    price: "780",
    city: "Tunis",
    zone: "Centre-ville",
    address: "24 rue de Marseille",
    latitude: "36.8008",
    longitude: "10.1825",
    surface: "38",
    bedrooms: "0",
    bathrooms: "1",
    type: "studio",
    condition: "good",
    availability: "available",
    equipments: ["furnished", "air_conditioning", "heating"],
  },
  {
    title: "Appartement familial avec ascenseur aux Berges du Lac",
    description:
      "Appartement moderne aux volumes confortables, situé dans une résidence sécurisée avec ascenseur. La cuisine équipée et le séjour lumineux donnent sur un balcon avec vue dégagée.",
    price: "2450",
    city: "Tunis",
    zone: "Les Berges du Lac",
    address: "5 rue du Lac Léman",
    latitude: "36.8342",
    longitude: "10.2397",
    surface: "145",
    bedrooms: "3",
    bathrooms: "2",
    type: "apartment",
    condition: "very_good",
    availability: "available",
    equipments: ["elevator", "parking", "balcony", "security", "heating"],
    rules: "Bail longue durée privilégié.",
  },
  {
    title: "Appartement avec terrasse à La Marsa",
    description:
      "Bel appartement au dernier étage, doté d’une terrasse ensoleillée et d’un séjour traversant. La plage, les cafés et les commerces de La Marsa sont accessibles à pied.",
    price: "2100",
    city: "La Marsa",
    zone: "Marsa Ville",
    address: "17 avenue Habib Bourguiba",
    latitude: "36.8782",
    longitude: "10.3247",
    surface: "118",
    bedrooms: "2",
    bathrooms: "2",
    type: "apartment",
    condition: "very_good",
    availability: "available",
    equipments: ["terrace", "air_conditioning", "furnished"],
  },
  {
    title: "Maison traditionnelle rénovée à Sousse",
    description:
      "Maison de charme rénovée avec soin, à proximité de la médina et du front de mer. Elle dispose d’un patio agréable, de chambres confortables et de rangements pratiques.",
    price: "1500",
    city: "Sousse",
    zone: "Médina",
    address: "6 impasse des Remparts",
    latitude: "35.8256",
    longitude: "10.6084",
    surface: "130",
    bedrooms: "3",
    bathrooms: "2",
    type: "house",
    condition: "good",
    availability: "available",
    equipments: ["terrace", "air_conditioning", "furnished"],
    rules: "Respect du voisinage demandé, particulièrement en soirée.",
  },
  {
    title: "Studio moderne proche de la plage à Sousse",
    description:
      "Studio bien agencé dans une résidence récente, à courte distance de la plage et des transports. Cuisine équipée, climatisation et espace de rangement optimisé.",
    price: "850",
    city: "Sousse",
    zone: "Sahloul",
    address: "31 rue des Oliviers",
    latitude: "35.8298",
    longitude: "10.5923",
    surface: "44",
    bedrooms: "0",
    bathrooms: "1",
    type: "studio",
    condition: "new",
    availability: "available",
    equipments: ["elevator", "air_conditioning", "heating", "parking"],
  },
  {
    title: "Appartement calme près du centre de Sfax",
    description:
      "Appartement bien entretenu dans un quartier résidentiel pratique, à proximité des commerces et des établissements scolaires. Le séjour spacieux donne sur un balcon.",
    price: "980",
    city: "Sfax",
    zone: "Sfax Ville",
    address: "14 avenue Majida Boulila",
    latitude: "34.7406",
    longitude: "10.7603",
    surface: "105",
    bedrooms: "3",
    bathrooms: "1",
    type: "apartment",
    condition: "good",
    availability: "available",
    equipments: ["balcony", "heating", "air_conditioning"],
  },
  {
    title: "Villa avec piscine à Nabeul",
    description:
      "Villa indépendante entourée d’un jardin, avec piscine privée et grande terrasse. Les espaces intérieurs sont lumineux et la maison se trouve à quelques minutes des plages de Nabeul.",
    price: "3600",
    city: "Nabeul",
    zone: "Cité El Wafa",
    address: "9 rue des Potiers",
    latitude: "36.4513",
    longitude: "10.7357",
    surface: "235",
    bedrooms: "4",
    bathrooms: "3",
    type: "villa",
    condition: "very_good",
    availability: "available",
    equipments: ["pool", "garden", "terrace", "parking", "security"],
    rules: "L’entretien de la piscine est inclus dans le loyer.",
  },
  {
    title: "Appartement lumineux au centre de Monastir",
    description:
      "Appartement confortable et bien exposé, situé dans un quartier central proche des commerces et des transports. Il comprend une cuisine indépendante et un balcon.",
    price: "1100",
    city: "Monastir",
    zone: "Centre-ville",
    address: "22 rue de l'Indépendance",
    latitude: "35.7770",
    longitude: "10.8262",
    surface: "96",
    bedrooms: "2",
    bathrooms: "1",
    type: "apartment",
    condition: "good",
    availability: "available",
    equipments: ["balcony", "elevator", "air_conditioning"],
  },
  {
    title: "Maison de ville avec patio à Bizerte",
    description:
      "Maison de ville agréable avec patio intérieur et pièces bien distribuées. Située dans un quartier vivant, elle permet de rejoindre facilement les marchés et le vieux port.",
    price: "1350",
    city: "Bizerte",
    zone: "Vieux-Port",
    address: "3 rue Sidi Salem",
    latitude: "37.2744",
    longitude: "9.8739",
    surface: "122",
    bedrooms: "3",
    bathrooms: "2",
    type: "house",
    condition: "fair",
    availability: "available",
    equipments: ["terrace", "heating", "furnished"],
  },
  {
    title: "Bureau rénové proche de l'avenue Hédi Chaker",
    description:
      "Espace professionnel rénové, lumineux et facile à aménager pour une petite équipe. L’adresse est accessible en transports et entourée de services et de commerces.",
    price: "1650",
    city: "Tunis",
    zone: "Mutuelleville",
    address: "40 avenue Hédi Chaker",
    latitude: "36.8228",
    longitude: "10.1758",
    surface: "88",
    type: "office",
    condition: "very_good",
    availability: "available",
    equipments: ["elevator", "heating", "air_conditioning", "security"],
    rules: "Usage professionnel uniquement.",
  },
];

function validateSeedProperties() {
  return seedProperties.map((property) => {
    const parsed = createPropertySchema.safeParse(property);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new SeedScriptError(
        `Données invalides pour « ${property.title} » : ${details}`,
      );
    }

    return parsed.data;
  });
}

async function seedPropertiesForOwner(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new SeedScriptError(
      "Exécution refusée : ce script ne peut pas tourner en production.",
    );
  }

  const parsedProperties = validateSeedProperties();
  const ownerEmail = (
    process.argv[2]?.trim() || defaultOwnerEmail
  ).toLowerCase();

  try {
    await connectDB();

    const owner = await User.findOne({ email: ownerEmail })
      .select("_id roles")
      .lean();

    if (!owner) {
      throw new SeedScriptError(
        `Compte propriétaire introuvable pour l’adresse « ${ownerEmail} ».`,
      );
    }
    if (!owner.roles.includes("OWNER")) {
      throw new SeedScriptError(
        `Le compte « ${ownerEmail} » ne possède pas le rôle OWNER.`,
      );
    }

    let created = 0;
    let skipped = 0;

    for (const property of parsedProperties) {
      const exists = await Property.exists({
        ownerId: owner._id,
        title: property.title,
      });

      if (exists) {
        skipped += 1;
        console.log(`Ignoré (déjà présent) : ${property.title}`);
        continue;
      }

      await Property.create({
        ownerId: owner._id,
        title: property.title,
        description: property.description,
        price: property.price,
        city: property.city,
        zone: property.zone,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        surface: property.surface,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        type: property.type,
        condition: property.condition,
        availability: property.availability,
        availableFrom: property.availableFrom,
        equipments: property.equipments,
        rules: property.rules,
        hasParking: property.equipments.includes("parking"),
        hasElevator: property.equipments.includes("elevator"),
        moderationStatus: "approved",
        images: [],
      });

      created += 1;
      console.log(`Créé : ${property.title}`);
    }

    console.log(
      `Seed terminé — créés : ${created}, ignorés : ${skipped}, total : ${parsedProperties.length}.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

seedPropertiesForOwner().catch((error: unknown) => {
  if (error instanceof SeedScriptError) {
    console.error(error.message);
  } else {
    console.error(
      "Échec du seed des logements. Détails masqués pour protéger la configuration.",
      error instanceof Error ? error.name : "Erreur inconnue",
    );
  }
  process.exitCode = 1;
});
