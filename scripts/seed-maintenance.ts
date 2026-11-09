import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import CategoryModel from "../src/models/category";
import MaintenanceRequestModel from "../src/models/maintenance-request";
import AssignmentModel from "../src/models/assignment";
import InterventionModel from "../src/models/intervention";
import MaintenanceHistoryModel from "../src/models/maintenance-history";
import {
  UserModel,
  TechnicianProfileModel,
  PropertyModel,
  EquipmentModel,
  NotificationModel,
  ReviewModel,
} from "../src/models/shared";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/homecheck_maintenance";

export async function seedDatabase() {
  console.log("Connecting to MongoDB at:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  console.log("Purging existing maintenance collections...");
  await Promise.all([
    CategoryModel.deleteMany({}),
    MaintenanceRequestModel.deleteMany({}),
    AssignmentModel.deleteMany({}),
    InterventionModel.deleteMany({}),
    MaintenanceHistoryModel.deleteMany({}),
    UserModel.deleteMany({}),
    TechnicianProfileModel.deleteMany({}),
    PropertyModel.deleteMany({}),
    EquipmentModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    ReviewModel.deleteMany({}),
  ]);

  const defaultPassword = await bcrypt.hash("homecheck2026", 10);

  // 1. Categories
  console.log("Seeding categories...");
  const categories = await CategoryModel.insertMany([
    {
      name: "Plomberie & Sanitaire",
      slug: "plomberie",
      icon: "Wrench",
      description: "Fuites d'eau, canalisations bouchées, robinetterie, chauffe-eau",
      isActive: true,
    },
    {
      name: "Électricité & Éclairage",
      slug: "electricite",
      icon: "Zap",
      description: "Tableaux électriques, disjoncteurs, prises, luminaires, court-circuit",
      isActive: true,
    },
    {
      name: "Chauffage & Climatisation",
      slug: "climatisation",
      icon: "Thermometer",
      description: "Climatiseurs split, chaudières, radiateurs, pompes à chaleur",
      isActive: true,
    },
    {
      name: "Serrurerie & Sécurité",
      slug: "serrurerie",
      icon: "Key",
      description: "Serrures bloquées, cylindres, verrous de sécurité, portes blindées",
      isActive: true,
    },
    {
      name: "Électroménager",
      slug: "electromenager",
      icon: "Refrigerator",
      description: "Fours, plaques de cuisson, hottes, lave-vaisselle, machines à laver",
      isActive: true,
    },
    {
      name: "Maçonnerie, Peinture & Menuiserie",
      slug: "maconnerie",
      icon: "Paintbrush",
      description: "Infiltrations, retouches peinture, joints d'étanchéité, volets roulants",
      isActive: true,
    },
  ]);

  const catMap = new Map(categories.map((c) => [c.slug, c._id]));

  // 2. Users
  console.log("Seeding users...");
  const adminUser = await UserModel.create({
    firstName: "Admin",
    lastName: "HomeCheck",
    email: "admin@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 71 000 001",
    roles: ["ADMIN"],
    activeRole: "ADMIN",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop",
  });

  const owner1 = await UserModel.create({
    firstName: "Sarah",
    lastName: "Ben Ali",
    email: "sarah.proprietaire@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 98 123 456",
    roles: ["OWNER"],
    activeRole: "OWNER",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop",
  });

  const owner2 = await UserModel.create({
    firstName: "Karim",
    lastName: "Mansour",
    email: "karim.owner@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 98 654 321",
    roles: ["OWNER"],
    activeRole: "OWNER",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
  });

  const tenant1 = await UserModel.create({
    firstName: "Youssef",
    lastName: "Trabelsi",
    email: "youssef.locataire@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 22 111 222",
    roles: ["TENANT"],
    activeRole: "TENANT",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
  });

  const tenant2 = await UserModel.create({
    firstName: "Myriam",
    lastName: "Khelil",
    email: "myriam.locataire@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 23 444 555",
    roles: ["TENANT"],
    activeRole: "TENANT",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
  });

  const tenant3 = await UserModel.create({
    firstName: "Hedi",
    lastName: "Dridi",
    email: "hedi.tenant@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 25 777 888",
    roles: ["TENANT"],
    activeRole: "TENANT",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop",
  });

  // Technicians
  const techUser1 = await UserModel.create({
    firstName: "Ahmed",
    lastName: "Gharbi",
    email: "ahmed.plombier@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 29 111 333",
    roles: ["TECHNICIAN"],
    activeRole: "TECHNICIAN",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
  });

  const techUser2 = await UserModel.create({
    firstName: "Bilel",
    lastName: "Jaziri",
    email: "bilel.electricien@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 29 222 444",
    roles: ["TECHNICIAN"],
    activeRole: "TECHNICIAN",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
  });

  const techUser3 = await UserModel.create({
    firstName: "Mehdi",
    lastName: "Ben Salah",
    email: "mehdi.climatisation@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 29 333 555",
    roles: ["TECHNICIAN"],
    activeRole: "TECHNICIAN",
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop",
  });

  const techUser4 = await UserModel.create({
    firstName: "Samy",
    lastName: "Chaouch",
    email: "samy.polyvalent@homecheck.tn",
    passwordHash: defaultPassword,
    phone: "+216 29 444 666",
    roles: ["TECHNICIAN"],
    activeRole: "TECHNICIAN",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop",
  });

  // 3. Technician Profiles (with skills & geo coordinates)
  console.log("Seeding technician profiles with geo coordinates...");
  await TechnicianProfileModel.insertMany([
    {
      userId: techUser1._id,
      skills: ["plomberie"],
      isAvailable: true,
      location: { type: "Point", coordinates: [10.1815, 36.8065] }, // Tunis Centre
      address: "Avenue Habib Bourguiba, Tunis",
      phone: "+216 29 111 333",
      averageRating: 4.9,
      completedInterventionsCount: 42,
      hourlyRateDT: 45,
    },
    {
      userId: techUser2._id,
      skills: ["electricite", "climatisation"],
      isAvailable: true,
      location: { type: "Point", coordinates: [10.165, 36.83] }, // Menzah / Ariana
      address: "El Menzah 6, Tunis",
      phone: "+216 29 222 444",
      averageRating: 4.8,
      completedInterventionsCount: 35,
      hourlyRateDT: 50,
    },
    {
      userId: techUser3._id,
      skills: ["climatisation"],
      isAvailable: true,
      location: { type: "Point", coordinates: [10.32, 36.85] }, // La Marsa
      address: "La Marsa Plage, Tunis",
      phone: "+216 29 333 555",
      averageRating: 4.7,
      completedInterventionsCount: 28,
      hourlyRateDT: 55,
    },
    {
      userId: techUser4._id,
      skills: ["serrurerie", "electromenager"],
      isAvailable: true,
      location: { type: "Point", coordinates: [10.22, 36.81] }, // Les Berges du Lac
      address: "Les Berges du Lac 1, Tunis",
      phone: "+216 29 444 666",
      averageRating: 4.6,
      completedInterventionsCount: 19,
      hourlyRateDT: 40,
    },
  ]);

  // 4. Properties
  console.log("Seeding properties...");
  const prop1 = await PropertyModel.create({
    title: "Résidence Les Oliviers - Apt 302",
    address: "Rue de la Feuille d'Érable, Les Berges du Lac 2",
    city: "Tunis",
    postalCode: "1053",
    ownerId: owner1._id,
    tenantId: tenant1._id,
    location: { type: "Point", coordinates: [10.24, 36.835] },
  });

  const prop2 = await PropertyModel.create({
    title: "Villa Jasmine avec Jardin",
    address: "Avenue Habib Bourguiba, Carthage",
    city: "Tunis",
    postalCode: "2016",
    ownerId: owner1._id,
    tenantId: tenant2._id,
    location: { type: "Point", coordinates: [10.33, 36.855] },
  });

  const prop3 = await PropertyModel.create({
    title: "Appartement S+2 Standing",
    address: "Boulevard Hédi Nouira, Ennasr 2",
    city: "Ariana",
    postalCode: "2037",
    ownerId: owner2._id,
    tenantId: tenant3._id,
    location: { type: "Point", coordinates: [10.155, 36.87] },
  });

  // 5. Equipments
  console.log("Seeding equipments...");
  const eqChauffeEau = await EquipmentModel.create({
    propertyId: prop1._id,
    name: "Chauffe-eau Électrique 100L",
    category: "plomberie",
    brand: "Ariston",
    serialNumber: "ARIS-9921-TN",
    condition: "MOYEN",
    notes: "Détartrage recommandé sous 3 mois",
  });

  const eqClim = await EquipmentModel.create({
    propertyId: prop1._id,
    name: "Climatiseur Split Inverter 12000 BTU",
    category: "climatisation",
    brand: "Samsung",
    serialNumber: "SAM-INV-4412",
    condition: "BON",
  });

  const eqTableau = await EquipmentModel.create({
    propertyId: prop1._id,
    name: "Tableau Électrique 8 Modules",
    category: "electricite",
    brand: "Schneider",
    condition: "EXCELLENT",
  });

  await EquipmentModel.create({
    propertyId: prop2._id,
    name: "Pompe à Chaleur Réversible",
    category: "climatisation",
    brand: "Daikin",
    serialNumber: "DAIK-8830-PRO",
    condition: "BON",
  });

  await EquipmentModel.create({
    propertyId: prop3._id,
    name: "Chaudière Murale Gaz",
    category: "climatisation",
    brand: "Chappée",
    condition: "MOYEN",
  });

  // 6. Initial Seed Maintenance Requests across states for comprehensive demo
  console.log("Seeding sample maintenance requests and interventions...");

  // Request 1: EN_ATTENTE (Pending Owner Approval)
  const req1 = await MaintenanceRequestModel.create({
    title: "Fuite importante sous l'évier de la cuisine",
    description: "Écoulement continu au niveau du siphon sous l'évier inox. Le meuble bas commence à gonfler avec l'humidité.",
    categoryId: catMap.get("plomberie"),
    propertyId: prop1._id,
    tenantId: tenant1._id,
    equipmentId: eqChauffeEau._id,
    priority: "HAUTE",
    status: "EN_ATTENTE",
    sourceInspectionItemId: "INSP-ITEM-2026-081",
    photos: [
      {
        storageKey: "seed_photo_sink_leak.jpg",
        originalName: "fuite_evier_cuisine.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 845200,
        uploadedAt: new Date(),
      },
    ],
  });

  await MaintenanceHistoryModel.create({
    requestId: req1._id,
    propertyId: prop1._id,
    action: "STATUS_CHANGE",
    fromStatus: "CREEE",
    toStatus: "EN_ATTENTE",
    actorId: tenant1._id,
    actorRole: "SYSTEM",
    comment: "Signalement initial soumis par le locataire et dispatché automatiquement",
    timestamp: new Date(Date.now() - 3600000 * 4),
  });

  await NotificationModel.create({
    userId: owner1._id,
    title: "Nouvelle demande d'intervention",
    message: `Une nouvelle demande "${req1.title}" nécessite votre validation pour "${prop1.title}".`,
    type: "MAINTENANCE",
    link: `/maintenance/requests/${req1._id}`,
  });

  // Request 2: ACCEPTEE (Approved by Owner, ready for technician assignment)
  const req2 = await MaintenanceRequestModel.create({
    title: "Climatiseur salon souffle de l'air tiède",
    description: "Le split 12000 BTU tourne sans refroidir la pièce principale. Bruit de compresseur inhabituel à l'unité extérieure.",
    categoryId: catMap.get("climatisation"),
    propertyId: prop1._id,
    tenantId: tenant1._id,
    equipmentId: eqClim._id,
    priority: "MOYENNE",
    status: "ACCEPTEE",
  });

  await MaintenanceHistoryModel.create({
    requestId: req2._id,
    propertyId: prop1._id,
    action: "STATUS_CHANGE",
    fromStatus: "EN_ATTENTE",
    toStatus: "ACCEPTEE",
    actorId: owner1._id,
    actorRole: "OWNER",
    comment: "Demande validée par la propriétaire. Recherche d'un frigoriste qualifié.",
    timestamp: new Date(Date.now() - 3600000 * 2),
  });

  // Request 3: RESOLUE (Completed intervention with full diagnostic & cost)
  const req3 = await MaintenanceRequestModel.create({
    title: "Disjoncteur général qui saute dès l'allumage du chauffe-eau",
    description: "Dès que le ballon d'eau chaude se met en chauffe, le différentiel 30mA coupe tout l'appartement.",
    categoryId: catMap.get("electricite"),
    propertyId: prop1._id,
    tenantId: tenant1._id,
    equipmentId: eqTableau._id,
    assignedTechnicianId: techUser2._id,
    priority: "URGENTE",
    status: "RESOLUE",
    resolvedAt: new Date(),
  });

  await InterventionModel.create({
    requestId: req3._id,
    technicianId: techUser2._id,
    diagnostic: "Résistance thermoplongeuse percée provoquant un défaut d'isolement à la masse franc sur le neutre.",
    workDone: "Vidange partielle, remplacement de la résistance blindée 2000W et de l'anode magnésium, réarmement et test d'isolement à 500V validé.",
    partsReplaced: ["Résistance thermoplongeuse 2000W", "Joint d'embase", "Anode magnésium"],
    cost: 140, // 140 DT
    durationMinutes: 75,
    comment: "Installation remise en conformité et sécurisée. Bon fonctionnement vérifié.",
    startedAt: new Date(Date.now() - 3600000 * 3),
    completedAt: new Date(Date.now() - 3600000 * 1),
    photos: [
      {
        storageKey: "seed_photo_electric_before.jpg",
        photoType: "BEFORE",
        originalName: "resistance_corrodee_avant.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 920400,
        uploadedAt: new Date(Date.now() - 3600000 * 3),
      },
      {
        storageKey: "seed_photo_electric_after.jpg",
        photoType: "AFTER",
        originalName: "resistance_neuve_apres.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1045200,
        uploadedAt: new Date(Date.now() - 3600000 * 1),
      },
    ],
  });

  await MaintenanceHistoryModel.create({
    requestId: req3._id,
    propertyId: prop1._id,
    action: "STATUS_CHANGE",
    fromStatus: "EN_COURS",
    toStatus: "RESOLUE",
    actorId: techUser2._id,
    actorRole: "TECHNICIAN",
    comment: "Intervention finalisée avec succès, diagnostic et pièces renseignés.",
    timestamp: new Date(Date.now() - 3600000 * 1),
  });

  console.log("=== Seed completed successfully! ===");
  console.log("Summary:");
  console.log("- Categories:", categories.length);
  console.log("- Users: 1 Admin, 2 Owners, 3 Tenants, 4 Technicians");
  console.log("- Properties: 3 with associated equipments");
  console.log("- Initial Requests: 3 (EN_ATTENTE, ACCEPTEE, RESOLUE)");
  console.log("Default password for all users: homecheck2026");

  await mongoose.disconnect();
}

if (require.main === module || process.argv[1]?.includes("seed-maintenance")) {
  seedDatabase().catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}
