# HomeCheck — Plateforme de Gestion Locative (PWA)

> **Application** : HomeCheck — Plateforme de gestion du cycle de vie locatif  
> **Modules** : Maintenance & Interventions Techniques + Budget, Dépenses & Scan IA + Tableaux de Bord par Rôle  
> **Tech Stack** : Next.js 16 (App Router) + React 19 + TypeScript (Strict) + Tailwind CSS + MongoDB (Mongoose) + Zod + Vitest + Vercel AI SDK  
> **Audience** : Équipe de développement, jury d'évaluation et soutenance  

---

## 1. Présentation du Module de Maintenance

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

## 4. PWA — Mode hors ligne

Le service worker (`public/sw.js`) n'est enregistré **qu'en production** (`NODE_ENV=production`, voir `app/RegisterServiceWorker.tsx`). En dev, le HMR et les chunks non hashés rendent son cache contre-productif.

Stratégies de cache :
- Navigations (HTML) : network-first → cache → page `/offline` (avec bouton « Réessayer »).
- Assets statiques (`/_next/static`, icônes, images, polices) : cache-first (fichiers hashés/immuables).
- Appels API (`/api/*` GET) : network-first → cache → réponse JSON contrôlée `503 { error: "OFFLINE" }`.
- Le precache d'installation couvre l'app shell (`/`, `/login`, `/signup`, `/offline`, manifest, icônes) ainsi que les chunks CSS/JS de la page `/offline`.

---

## 5. IA — Saisie de dépense & Scan de justificatif

Sur `/budget/depenses/nouvelle`, l'utilisateur peut décrire sa dépense en langage naturel ou scanner un reçu (JPG, PNG, WebP, PDF). L'IA extrait automatiquement les informations (montant, date, catégorie).

Configuration (`.env.local`) :
```bash
AI_PROVIDER="google"
AI_MODEL="gemini-2.5-flash"
GOOGLE_GENERATIVE_AI_API_KEY="..."
```

---

## 6. IA — Résumé mensuel et alertes prédictives

Sur `/budget` (mois courant), deux cartes pilotées par le modèle avec un **calcul 100 % déterministe** et l'IA cantonnée à la **rédaction** :

- **Résumé du mois** (`MonthlySummaryCard` + `refreshMonthlySummary`) : 4–6 lignes en français (vouvoiement) expliquant où part l'argent, ce qui a changé vs le mois précédent et l'état du budget. Les données envoyées au modèle sont un JSON **pré-calculé** (`lib/budget/insights.ts`) : l'IA ne fait aucun calcul, et **aucune note de dépense n'est envoyée**. Après génération, chaque montant du texte est vérifié contre les données d'entrée — un montant inconnu fait basculer sur un template déterministe (`source: "template"`).
- **Alertes de dépassement** (`PredictiveAlertsCard` + `refreshPredictiveAlerts`) : visibles si l'utilisateur a défini des **plafonds par catégorie** (formulaire `/budget/mois`). La projection (`lib/budget/projections.ts`) extrapole le rythme actuel (loyer exclu, marges et minimum de données pour éviter les faux positifs) et estime le **jour de dépassement** ; l'IA rédige une phrase par catégorie à risque à partir d'un seul appel.

Coûts et cache (`models/budgetInsight.ts`, index unique `{userId, month, kind}`) : le résumé/alertes sont stockés en base avec une empreinte des données d'entrée (`budget.updatedAt`, nombre de dépenses, total, dernière modification). L'IA n'est rappelée que si les données ont changé, **au plus 1 appel/jour/mois** (garde en base), avec rate-limit mémoire en complément et re-vérification du cache juste avant l'appel (anti double-appel). Hors ligne, la dernière version est servie par le cache de navigation du service worker et la régénération est désactivée (`useOnlineStatus`).

## 7. Parcours de Démonstration Clé en Main (Scénario Défense)

1. **Signalement par le Locataire** :
   - Basculez sur la vue **Locataire**.
   - Cliquez sur **"Signaler un problème"** (`/maintenance/requests/new`).
   - Sélectionnez la catégorie, renseignez le titre, l'urgence et joignez une photo.
   - Soumettez le formulaire : demande créée en `CREEE` et auto-dispatchée en `EN_ATTENTE`.

2. **Revue & Assignation par le Propriétaire** :
   - Basculez sur la vue **Propriétaire**.
   - Ouvrez la demande dans le tableau de bord et cliquez sur **"Accepter la demande"** (`ACCEPTEE`).
   - Cliquez sur **"Assigner un technicien (Matching IA)"** :
     - Observez le score de compatibilité (ex : **94% compatible**), la distance en km et la note.
   - Validez l'assignation : passage en `TECHNICIEN_ASSIGNE`.

3. **Intervention par le Technicien** :
   - Basculez sur la vue **Technicien** dans l'onglet **"Missions Assignées"**.
   - Cliquez sur **"Démarrer l'intervention"** (`EN_COURS`).
   - Renseignez le diagnostic, les pièces, le coût (ex : 120 DT) et les photos **AVANT / APRÈS**.
   - Cliquez sur **"Marquer comme résolue"** (`RESOLUE`).

4. **Clôture & Avis par le Locataire** :
   - Basculez sur la vue **Locataire**.
   - Constatez le rapport et cliquez sur **"Confirmer et Clôturer"** (`CLOTUREE`).
   - Attribuez une note et un avis.
