This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## PWA — Mode hors ligne

Le service worker (`public/sw.js`) n'est enregistré **qu'en production** (`NODE_ENV=production`, voir `app/RegisterServiceWorker.tsx`). En dev, le HMR et les chunks non hashés rendent son cache contre-productif.

Stratégies de cache :

- Navigations (HTML) : network-first → cache → page `/offline` (avec bouton « Réessayer »).
- Assets statiques (`/_next/static`, icônes, images, polices) : cache-first (fichiers hashés/immuables).
- Appels API (`/api/*` GET) : network-first → cache → réponse JSON contrôlée `503 { error: "OFFLINE" }`.
- Le precache d'installation couvre l'app shell (`/`, `/login`, `/signup`, `/offline`, manifest, icônes) ainsi que les chunks CSS/JS de la page `/offline`.

### Tester en local

```bash
npm run build
npm start
```

Puis dans Chrome :

1. Ouvrir `http://localhost:3000` et naviguer une première fois (accueil, login, budget) pour remplir le cache.
2. DevTools > **Application** > **Service Workers** : vérifier que `sw.js` est *activated*.
3. Cocher **Offline** (ou DevTools > Network > Throttling > Offline).
4. Recharger l'app : la page visitée est servie depuis le cache ; une page jamais visitée affiche `/offline` (« Données indisponibles hors ligne » + « Réessayer »).
5. Décocher Offline : le rechargement retrouve les données fraîches (network-first).

Après un test, nettoyer : DevTools > Application > Storage > **Clear site data** (sinon l'ancien SW reste actif sur `localhost:3000`).

## IA — Saisie de dépense en langage naturel

Sur `/budget/depenses/nouvelle`, un champ « Décrivez votre dépense » (ex. *« j'ai payé 85 dinars d'électricité hier »*) pré-remplit le formulaire via une extraction IA (Vercel AI SDK). L'utilisateur vérifie, corrige puis valide : **rien n'est enregistré sans validation explicite**.

Configuration (`.env.local`, voir `.env.example`) :

```bash
AI_PROVIDER="google"                        # fournisseur (openai | google | anthropic)
AI_MODEL="gemini-3.6-flash"                 # modèle à utiliser
GOOGLE_GENERATIVE_AI_API_KEY="..."          # clé du fournisseur choisi
```

- La clé n'est lue que côté serveur (`lib/ai/model.ts`, module `server-only`).
- Changer de modèle = éditer `AI_MODEL`. Changer de fournisseur = installer son paquet (`@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/anthropic`) + adapter `lib/ai/model.ts` : le code métier ne dépend que du type `LanguageModel` du SDK.
- L'extraction est limitée à 10 requêtes/min/utilisateur (`lib/rate-limit.ts`) ; la phrase saisie n'est jamais journalisée.

Tests (Vitest, fonctions pures : prompt, post-traitement du brouillon, rate limit) :

```bash
npm test
```

Architecture détaillée : voir `docs/plan-saisie-depense-ia.md`.

## IA — Scan de justificatif

Sur `/budget/depenses/nouvelle`, l'utilisateur peut **prendre une photo** de son reçu ou **choisir un fichier** (JPG, PNG, WebP, PDF — 5 Mo maximum). L'IA en extrait un brouillon (montant, date, catégorie, note) qui pré-remplit le même formulaire, avec surlignage des champs incertains. Comme pour la saisie texte : **rien n'est enregistré sans validation explicite**, et **le fichier n'est jamais stocké** (extrait puis jeté, aucun log du contenu).

Parcours serveur (`app/actions/budget-ai-file.ts` → `parseExpenseFile`) :

1. Authentification puis rate limit dédié (**5 scans/min**/utilisateur, plus strict que le texte).
2. Validation du type **réel** par signature binaire (`lib/ai/file-sniff.ts` : magic bytes JPEG/PNG/WebP/PDF ; le nom et le MIME déclarés ne sont pas crus ; HEIC refusé avec un message clair).
3. Chaîne de stratégies (`lib/ai/receipt-route.ts`) :
   - PDF avec couche texte (≥ 80 caractères utiles, `lib/ai/pdf-text.ts`, max 10 pages) → le texte part dans le **pipeline texte** (comme la saisie manuelle) ;
   - sinon, si `AI_VISION=true` (défaut) → le fichier est **envoyé au modèle** en vision (`{ type: "file" }` du Vercel AI SDK, sans nom de fichier) ;
   - sinon → OCR local de repli (Phase 2, voir ci-dessous) ; un PDF scanné sans vision est refusé avec un message clair.
4. Même re-validation serveur que le texte (`toReceiptDraft` : schéma Zod étendu `merchant`/`amountBasis`, montant TTC prioritaire, date de la facture et non la date du jour).
5. Avertissement de **doublon possible** (même montant + même date déjà enregistrés) — simple lecture, aucune écriture.

Côté client (`ExpenseFileInput.tsx`) : les photos sont **compressées avant l'envoi** (redimensionnement à ~2000 px, réencodage JPEG qualité 0,8 via canvas), la taille est contrôlée avant l'appel, un **aperçu** permet de comparer le brouillon avec le justificatif, et le scan est désactivé hors ligne. Le service worker n'intercepte que les GET : aucun fichier ne passe par le cache.

Configuration (`.env.example`) :

```bash
AI_VISION="true"   # false = OCR local (tesseract.js) au lieu de la vision du modèle
```

Upload via Server Action : `serverActions.bodySizeLimit` relevé à 6 Mo dans `next.config.ts` (défaut Next : 1 Mo ; le multipart ajoute ~10–20 Ko autour des 5 Mo du fichier).

### Phase 2 — OCR de repli (`AI_VISION=false`)

Quand la vision est désactivée, les images passent par **tesseract.js** (`lib/ai/ocr.ts`, langues fra+eng+ara fournies localement) après un prétraitement **sharp** (niveaux de gris, redimensionnement). Le texte OCR suit exactement le même pipeline que la saisie texte. Les PDF scannés restent refusés (l'OCR ne lit pas les PDF) : prendre une photo ou activer `AI_VISION`.

## IA — Résumé mensuel et alertes prédictives

Sur `/budget` (mois courant), deux cartes pilotées par le modèle avec un **calcul 100 % déterministe** et l'IA cantonnée à la **rédaction** :

- **Résumé du mois** (`MonthlySummaryCard` + `refreshMonthlySummary`) : 4–6 lignes en français (vouvoiement) expliquant où part l'argent, ce qui a changé vs le mois précédent et l'état du budget. Les données envoyées au modèle sont un JSON **pré-calculé** (`lib/budget/insights.ts`) : l'IA ne fait aucun calcul, et **aucune note de dépense n'est envoyée**. Après génération, chaque montant du texte est vérifié contre les données d'entrée — un montant inconnu fait basculer sur un template déterministe (`source: "template"`).
- **Alertes de dépassement** (`PredictiveAlertsCard` + `refreshPredictiveAlerts`) : visibles si l'utilisateur a défini des **plafonds par catégorie** (formulaire `/budget/mois`). La projection (`lib/budget/projections.ts`) extrapole le rythme actuel (loyer exclu, marges et minimum de données pour éviter les faux positifs) et estime le **jour de dépassement** ; l'IA rédige une phrase par catégorie à risque à partir d'un seul appel.

Coûts et cache (`models/budgetInsight.ts`, index unique `{userId, month, kind}`) : le résumé/alertes sont stockés en base avec une empreinte des données d'entrée (`budget.updatedAt`, nombre de dépenses, total, dernière modification). L'IA n'est rappelée que si les données ont changé, **au plus 1 appel/jour/mois** (garde en base), avec rate-limit mémoire en complément et re-vérification du cache juste avant l'appel (anti double-appel). Hors ligne, la dernière version est servie par le cache de navigation du service worker et la régénération est désactivée (`useOnlineStatus`).
