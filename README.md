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
