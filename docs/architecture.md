# HomeCheck Maintenance Module — Architecture Système

> **Platform**: HomeCheck (Rental Lifecycle PWA)  
> **Module**: Maintenance Module  
> **Tech Stack**: Next.js (App Router) + TypeScript (Strict) + Tailwind CSS + MongoDB (Mongoose) + Zod + Vitest  

---

## 1. Diagramme d'Architecture Globale

Le module de maintenance est strictement découplé des autres composants de l'application via des interfaces et modèles stubs bien définis :
- **Authentification** : `auth()` dans `src/lib/auth.ts` retournant `{ user: { id, role } }` avec bascule immédiate de rôle par cookie ou en-tête.
- **Propriétés & Équipements** : Modèles partagés dans `src/models/shared.ts`.
- **Inspections & IA** : Pré-remplissage automatique des signalements via query params (`sourceInspectionItemId`).
- **Notifications** : Écriture de documents `Notification` distribués aux parties prenantes.
- **Jumeau Numérique** : Journal immuable `MaintenanceHistory` traçant chaque transition d'état.
- **Stockage Privé** : `StorageService` gérant les identifiants opaques `storageKey` avec streaming authentifié.

```mermaid
graph TB
    subgraph Client ["Client (PWA / Mobile-First)"]
        TenantUI["Locataire UI<br/>(Signaler, Mes demandes, Détail)"]
        OwnerUI["Propriétaire UI<br/>(Validation, Assignation, Alertes)"]
        TechUI["Technicien UI<br/>(Tabs interventions, Diagnostic, Photos)"]
        AdminUI["Admin UI<br/>(Catégories, Métriques KPIs)"]
    end

    subgraph NextServer ["Next.js App Router (Backend)"]
        AuthHelper["Auth Helper / Dev Stub<br/>src/lib/auth.ts"]
        RouteHandlers["Route Handlers<br/>/api/maintenance-requests<br/>/api/interventions<br/>/api/photos/[key]"]
        
        subgraph Services ["Domain Services Layer"]
            StatusSvc["MaintenanceStatusService<br/>(ACID Transactions, Optimistic Lock)"]
            AssignSvc["AssignmentService<br/>(Technician Propose/Accept/Refuse)"]
            InterventionSvc["InterventionService<br/>(Diagnostic, Cost DT, Parts)"]
            MatchingSvc["MatchingService<br/>(Rule-based Score 0-100%)"]
            PredictiveSvc["PredictiveMaintenanceService<br/>(Aggregation Pipelines)"]
            StorageSvc["StorageService<br/>(Disk Dev / S3 Ready, MIME verify)"]
        end
    end

    subgraph DataStore ["MongoDB (Replica Set)"]
        MR_Coll[("MaintenanceRequests<br/>+ Embedded Photos")]
        Interv_Coll[("Interventions<br/>+ Embedded Before/After")]
        Assign_Coll[("Assignments")]
        Hist_Coll[("MaintenanceHistories")]
        Cat_Coll[("Categories")]
        Shared_Coll[("Shared: Users, Properties,<br/>Equipments, Notifications, Reviews")]
    end

    TenantUI --> RouteHandlers
    OwnerUI --> RouteHandlers
    TechUI --> RouteHandlers
    AdminUI --> RouteHandlers

    RouteHandlers --> AuthHelper
    RouteHandlers --> Services
    Services --> DataStore
```

---

## 2. Découpage Modulaire & Responsabilités

| Couche | Composants | Description |
|---|---|---|
| **Route Handlers** | `app/api/...` | Validation Zod, injection du contexte utilisateur, codes HTTP REST stricts. |
| **State Machine** | `src/modules/maintenance/state-machine.ts` | Règles pures de transition, vérification des acteurs autorisés et des gardes. |
| **Status Service** | `src/services/maintenance-status.service.ts` | Concurrence optimiste (`__v`), transactions ACID, création automatique d'historique et dispatch de notifications. |
| **Matching IA** | `src/services/matching.service.ts` | Algorithme pondéré de recommandation de techniciens avec calcul de distance Haversine. |
| **Prédictif** | `src/services/predictive.service.ts` | Pipelines d'agrégation MongoDB détectant les pannes récurrentes (≥ 2 ou 3 sur 6 mois). |
| **Stockage** | `src/services/storage.service.ts` | Téléversement sécurisé, vérification MIME et streaming privé RBAC. |
