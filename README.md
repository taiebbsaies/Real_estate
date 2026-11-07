# HomeCheck — Module de Maintenance (Rental Lifecycle PWA)

> **Application** : HomeCheck — Plateforme de gestion du cycle de vie locatif  
> **Module** : Module Maintenance & Interventions Techniques  
> **Tech Stack** : Next.js 16 (App Router) + React 19 + TypeScript (Strict) + Tailwind CSS + MongoDB (Mongoose) + Zod + Vitest  
> **Audience** : Équipe de développement, jury d'évaluation et soutenance  

---

## 1. Présentation du Module

Le module de maintenance de HomeCheck digitalise l'intégralité du traitement des incidents et réparations locatives. Il relie de manière fluide et sécurisée les **quatre acteurs clés** :
1. **Le Locataire (`TENANT`)** : signale une panne (support caméra mobile), suit l'avancement en temps réel, valide la résolution ou réouvre avec motif.
2. **Le Propriétaire (`OWNER`)** : valide ou rejette les demandes, consulte les alertes prédictives de pannes récurrentes, et assigne les techniciens via notre algorithme de matching intelligent.
3. **Le Technicien (`TECHNICIAN`)** : reçoit les propositions, démarre l'intervention sur site, documente son diagnostic, enregistre les pièces, la durée, le coût en Dinars Tunisiens (DT), et téléverse les photos comparatives **Avant / Après**.
4. **L'Administrateur (`ADMIN`)** : pilote le parc immobilier, supervise les indicateurs de performance (KPIs) et gère les catégories de maintenance.

---

## 2. Démarrage Rapide

### Prérequis
- **Node.js** v20 ou v22+
- **MongoDB** en local ou cluster MongoDB Atlas

### Installation des dépendances
```bash
npm install
```

### Configuration des variables d'environnement
Créez un fichier `.env.local` (ou utilisez les valeurs par défaut) :
```env
MONGODB_URI=mongodb://127.0.0.1:27017/homecheck_maintenance
PORT=3000
STORAGE_DIR=uploads/maintenance
```

### Initialisation & Seeding de la base de données
Exécutez le script complet de seed pour créer les catégories, les utilisateurs de test, les propriétés avec équipements, et des incidents échantillons dans différents états :
```bash
npx tsx scripts/seed-maintenance.ts
```

### Lancement des tests automatisés (Vitest)
```bash
npm test
```
*Toutes les suites (Machine à états, Concurrence optimiste 409, Matching IA, Gardes métiers) sont couvertes.*

### Lancement du serveur de développement
```bash
npm run dev
```
Accédez ensuite à [http://localhost:3000/maintenance](http://localhost:3000/maintenance).

---

## 3. Comptes Démo & Bascule Instantanée de Rôle

Pour faciliter les tests lors de l'évaluation ou de la soutenance, un sélecteur interactif de perspective (**Role Switcher**) est intégré en haut à droite de l'en-tête. Vous pouvez basculer d'un profil à l'autre en un seul clic sans avoir besoin de vous déconnecter :

| Rôle | Nom & Persona | Identifiant / Email | Rôle Système |
|---|---|---|---|
| **Locataire** | Youssef Trabelsi | `youssef.locataire@homecheck.tn` | `TENANT` |
| **Propriétaire** | Sarah Ben Ali | `sarah.proprietaire@homecheck.tn` | `OWNER` |
| **Technicien** | Ahmed Gharbi (Plombier) | `ahmed.plombier@homecheck.tn` | `TECHNICIAN` |
| **Administrateur** | Super Admin | `admin@homecheck.tn` | `ADMIN` |

*Mot de passe universel pour tous les comptes : `homecheck2026`.*

---

## 4. Parcours de Démonstration Clé en Main (Scénario Défense)

Le flux de démonstration complet respecte scrupuleusement la checklist de soutenance :

1. **Signalement par le Locataire** :
   - Basculez sur la vue **Locataire**.
   - Cliquez sur **"Signaler un problème"** (`/maintenance/requests/new`).
   - Sélectionnez la catégorie **Plomberie & Sanitaire**, le logement, renseignez le titre (ex : *"Fuite d'eau continue sous l'évier"*), sélectionnez l'urgence et ajoutez une photo.
   - Soumettez le formulaire : le système crée la demande en `CREEE` et auto-dispatche instantanément en `EN_ATTENTE`.

2. **Revue & Assignation par le Propriétaire** :
   - Basculez sur la vue **Propriétaire**.
   - Ouvrez la demande dans le tableau de bord.
   - Cliquez sur **"Accepter la demande"** (le statut devient `ACCEPTEE`).
   - Cliquez sur **"Assigner un technicien (Matching IA)"** :
     - Observez le classement automatique avec le pourcentage de compatibilité (ex : **94% compatible** pour Ahmed Gharbi), la distance géographique en km, la note d'avis et l'explication textuelle IA.
   - Validez l'assignation : le statut passe à `TECHNICIEN_ASSIGNE`.

3. **Intervention par le Technicien** :
   - Basculez sur la vue **Technicien**.
   - L'intervention apparaît dans l'onglet **"Missions Assignées"**.
   - Cliquez sur **"Démarrer l'intervention (Sur place)"** : le statut passe à `EN_COURS`.
   - Dans l'espace atelier :
     - Téléversez une photo **AVANT travaux**.
     - Renseignez le diagnostic technique : *"Joint torique d'étanchéité détérioré sur tuyau d'arrivée"*.
     - Renseignez les travaux réalisés : *"Remplacement du joint et serrage au couple recommandé"*.
     - Ajoutez la pièce remplacée : *"Joint torique 20/27"*.
     - Saisissez le coût : **120 DT** et la durée : **45 min**.
     - Téléversez une photo **APRÈS travaux**.
   - Cliquez sur **"Marquer l'intervention comme résolue (RESOLUE)"** : la machine à états vérifie la présence obligatoire du diagnostic et des travaux avant d'autoriser la transition.

4. **Clôture & Avis par le Locataire** :
   - Basculez sur la vue **Locataire**.
   - Ouvrez le dossier résolu : le locataire constate le rapport détaillé, le coût et la comparaison photographique Avant / Après.
   - Cliquez sur **"Confirmer et Clôturer"** : le statut devient `CLOTUREE`.
   - Le bouton **"Laisser un avis"** s'active : attribuez 5 étoiles et un commentaire. La note moyenne du technicien est recalculée en temps réel.

5. **Gestion de Réouverture (Cas d'exception)** :
   - Si le problème persiste, le locataire peut cliquer sur **"Réouvrir (Problème non résolu)"**. Un motif explicatif non vide est obligatoirement requis par la garde métier.

---

## 5. Fonctionnalités Avancées Implémentées

### Machine à États Strictement Sécurisée
Toutes les transitions sont validées par `validateTransition()` (`src/modules/maintenance/state-machine.ts`). Aucune transition illégale n'est autorisée.

### Gestion des Conflits de Concurrence Optimiste (`__v` / 409 Conflict)
Grâce au versionnement Mongoose optimiste (`__v`), toute modification concurrente par deux acteurs sur une même version obsolète déclenche une erreur HTTP `409 Conflict` empêchant tout écrasement silencieux de données.

### Jumeau Numérique de la Propriété (Digital Twin)
Chaque événement (création, changement de statut, assignation, intervention) génère une trace immuable dans `MaintenanceHistory`. L'historique complet et chronologique de tout le cycle de vie du bien est consultable sur `/maintenance/properties/[id]/history`.

### Algorithme de Matching IA (Scoring 0–100%)
L'algorithme pondère 5 critères essentiels :
- **Compétence métier exacte** (35 %)
- **Disponibilité immédiate** (25 %)
- **Proximité kilométrique** via formule géodésique Haversine (20 %)
- **Note moyenne d'évaluation** (10 %)
- **Historique et expérience** sur interventions similaires (10 %)

### Détection Prédictive de Vétusté (Pipelines d'Agrégation)
Le service prédictif agrège les historiques et déclenche des bannières d'alerte dès qu'un équipement enregistre **≥ 2 ou 3 pannes sur une période glissante de 6 mois**, avertissant le propriétaire qu'un remplacement préventif est plus économique que des réparations récurrentes.

### Stockage Privé Authentifié des Photos
Toutes les photographies (signalement, avant/après) sont stockées sous identifiants opaques UUID (`storageKey`) hors de la racine publique. Elles sont distribuées exclusivement via la route de streaming authentifiée `/api/photos/[storageKey]` vérifiant les droits RBAC de l'utilisateur.

---

## 6. Structure du Code Source

```
Real_estate/
├── app/
│   ├── api/
│   │   ├── maintenance-requests/       # CRUD, filtrage par rôle, auto-dispatch
│   │   │   └── [id]/
│   │   │       ├── status/             # PATCH transition statut (ACID & Optimistic lock)
│   │   │       ├── assign/             # Assignation manuelle & acceptation technicien
│   │   │       └── photos/             # Téléversement photos locataire
│   │   ├── interventions/
│   │   │   └── [id]/
│   │   │       ├── route.ts            # Diagnostic, coût DT, travaux, pièces
│   │   │       └── photos/             # Photos AVANT / APRÈS
│   │   ├── photos/[key]/               # Streaming authentifié & sécurisé
│   │   ├── technicians/recommended/    # Matching IA recommandé
│   │   ├── properties/[id]/history/    # Jumeau numérique immuable
│   │   ├── admin/maintenance-stats/    # Métriques KPIs & agrégations prédictives
│   │   └── auth/switch-role/           # Bascule de rôle instantanée pour démo
│   └── maintenance/
│       ├── page.tsx                    # Tableau de bord réactif par rôle
│       ├── requests/
│       │   ├── new/page.tsx            # Formulaire de signalement (caméra mobile)
│       │   └── [id]/page.tsx           # Vue détaillée, timeline et barre d'actions
│       ├── admin/page.tsx              # Tableau de bord KPIs et gestion catégories
│       └── properties/[id]/history/    # Journal chronologique de propriété
├── docs/                               # Diagrammes Mermaid d'architecture
│   ├── architecture.md
│   ├── use-cases.md
│   ├── state-machine.md
│   ├── sequence.md
│   └── data-model.md
├── scripts/
│   └── seed-maintenance.ts             # Script d'ensemencement complet
├── src/
│   ├── components/maintenance/         # Composants UI (Badges, Timeline, Modals, Uploader...)
│   ├── lib/
│   │   ├── auth.ts                     # Auth helper avec support cookie/header demo
│   │   ├── mongoose.ts                 # Connecteur singleton Mongoose
│   │   └── model.ts                    # Wrapper anti-recompilation Next.js HMR
│   ├── models/                         # Schémas Mongoose
│   │   ├── category.ts
│   │   ├── maintenance-request.ts
│   │   ├── assignment.ts
│   │   ├── intervention.ts
│   │   ├── maintenance-history.ts
│   │   └── shared.ts                   # Stubs User, Property, Equipment, Notification, Review
│   ├── modules/maintenance/
│   │   ├── constants.ts                # Enums, priorités, libellés FR, codes d'erreur
│   │   ├── state-machine.ts            # Règles pures de transition & gardes
│   │   └── validations.ts              # Schémas Zod stricts
│   └── services/
│       ├── maintenance-status.service.ts # Service transactionnel & verrous optimistes
│       ├── matching.service.ts         # Algorithme de recommandation de techniciens
│       ├── assignment.service.ts       # Service d'assignation et réponses
│       ├── predictive.service.ts       # Détection prédictive de pannes
│       └── storage.service.ts          # Service de stockage privé de photos
└── vitest.config.mts                   # Configuration des tests Vitest
```

---

## 7. Tests & Validation de Qualité

Toutes les exigences de test et de validation de type sont vérifiées avec succès :
```bash
# Exécution de tous les tests unitaires
npm test

# Vérification stricte du typage TypeScript
npx tsc --noEmit
```

*Résultat : 23 tests passés avec succès, zéro erreur de typage.*
