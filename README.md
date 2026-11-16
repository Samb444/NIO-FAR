# NIO FAR

Plateforme citoyenne de suivi des problèmes de proximité en banlieue de Dakar (Sénégal) :
**déchets, eau stagnante, éclairage public, voirie**. *« Nio far » : nous sommes ensemble, en wolof.*

> Prototype présenté au concours **Banlieue Smart Genius 2026**, catégorie *Smart Territory*.

## Démarrer

```bash
cp .env.example .env
# Optionnel : lancer PostgreSQL 16 via Docker (sinon repli automatique sur PostgreSQL embarqué PGlite)
docker compose up -d

npm install      # à la racine (workspaces client + server)
npm run seed     # crée les comptes démo (admin + relais) et les exemples étiquetés « Exemple fictif »
npm run dev      # démarre l'API + le serveur sur http://localhost:4000
npm run dev:client # démarre Vite sur http://localhost:5173 (avec proxy /api)
npm run test     # exécute la suite de tests Vitest + Supertest
npm run build    # compile le front (client/dist) et le backend (server/dist)
```

## Comptes de démonstration (`/admin`)

- **Administrateur** : `admin@niofar.sn` / `NioFar2026!`
- **Relais de quartier** : `relais@niofar.sn` / `Relais2026!` (peut uniquement marquer « vérifié sur place » et ajouter une note)

## Stack

- **client/** — Vite, React 19, TypeScript, Tailwind CSS v4, Framer Motion, React Router, Recharts, Leaflet
- **3D** — Three.js, `@react-three/fiber`, `@react-three/drei` (scène d'accueil + barres 3D par secteur avec repli 2D)
- **server/** — Node.js, Express, TypeScript, PostgreSQL (`pg` + `@electric-sql/pglite`), Drizzle ORM, Zod, Argon2, JWT en cookie `httpOnly` + protection CSRF, `node-cron`, Helmet, Rate Limiting
- **tests/** — Vitest + Supertest (`server/src/__tests__/api.test.ts`)
