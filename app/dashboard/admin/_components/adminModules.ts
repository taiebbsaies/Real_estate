export type AdminModuleIcon =
  | "house"
  | "shield"
  | "wallet"
  | "chat"
  | "users";

export type AdminModule = {
  key: string;
  title: string;
  description: string;
  href?: string;
  icon: AdminModuleIcon;
};

export const ADMIN_MODULES: AdminModule[] = [
  {
    key: "logements",
    title: "Logements",
    description: "Valider ou rejeter les annonces et traiter les signalements.",
    href: "/dashboard/admin/properties",
    icon: "house",
  },
  {
    key: "reclamations",
    title: "Réclamations",
    description: "Examiner les dossiers de maintenance et les signalements.",
    icon: "shield",
  },
  {
    key: "budget",
    title: "Budget",
    description: "Suivre les dépenses et le patrimoine locatif.",
    icon: "wallet",
  },
];
