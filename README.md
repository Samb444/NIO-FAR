# NIO FAR

Plateforme citoyenne de suivi des problèmes de proximité en banlieue de Dakar (Sénégal) :
**déchets, eau stagnante, éclairage public, voirie**. *« Nio far » : nous sommes ensemble, en wolof.*

> Prototype présenté au concours **Banlieue Smart Genius 2026**, catégorie *Smart Territory*.
> Voir aussi [**PRESENTATION.md**](./PRESENTATION.md) pour le parcours de démonstration en 3 minutes, les 5 points forts pour le jury et les limites honnêtes.

---

## 1. Démarrage rapide en local

```bash
cp .env.example .env
# Optionnel : lancer PostgreSQL 16 via Docker (sinon repli automatique sur PostgreSQL embarqué PGlite)
docker compose up -d

npm install        # installe les dépendances des workspaces client + server
npm run seed       # crée les comptes démo (admin + relais), le catalogue et les exemples étiquetés « Exemple fictif »
npm run dev        # démarre l'API + le serveur sur http://localhost:4000
npm run dev:client # démarre Vite sur http://localhost:5173 (avec proxy /api)
npm run test       # exécute la suite de tests unitaires & API (Vitest + Supertest)
npm run test:e2e   # exécute le test de bout en bout Playwright + audit accessibilité
npm run build      # compile le front PWA (client/dist) et le backend (server/dist)
```

### Comptes de démonstration (`/admin`)

- **Administrateur** : `admin@niofar.sn` / `NioFar2026!`
- **Relais de quartier** : `relais@niofar.sn` / `Relais2026!` (peut uniquement marquer « vérifié sur place » et ajouter une note)

---

## 2. Fonctionnalités principales (Étapes 1 à 4)

1. **Parcours citoyen inclusif & PWA hors-ligne** (`/signaler`, `/suivre`, `/signalements`) :
   - Signalement en moins d’une minute avec **assistant vocal prioritaire** (30 s max, 2 Mo), compression photo côté client (480 px) et géolocalisation arrondie à 3 décimales (≈ 100 m).
   - Détection des doublons avant envoi (« Confirmer le signalement existant ») et suivi sans compte par code `NF-XXXXX` avec synthèse vocale.
   - **PWA installable** (`manifest.webmanifest`, `sw.js`, `offline.html`) et file d’attente **IndexedDB** synchronisée automatiquement au retour du réseau avec idempotence par UUID client.
2. **Administration, Preuve de résolution & Relances J+3 / J+7** (`/admin`) :
   - Priorisation transparente : `gravité × 2 + signalements similaires + confirmations + 1 pt / 3 jours` avec explication « Pourquoi ce score ? ».
   - Règle métier stricte : passage au statut **« Résolu »** impossible sans **photo « après »** ou **confirmation de l’habitant**. Si l’habitant répond « toujours là », réouverture automatique en « À vérifier ».
3. **Urbanisme prédictif — Module « Points noirs »** (`/admin` et `/transparence`) :
   - Croise la densité sectorielle (35 %), la récurrence (30 %), la saisonnalité mensuelle d’hivernage (20 %) et les **prévisions de pluie à 7 jours de l’API Open-Meteo Dakar** sans clé (15 %).
   - Garde-fous : seuil minimal de **30 signalements par secteur** (affiche **« Données insuffisantes »** en dessous) et mention obligatoire **« Indicatif, basé sur les données de NIO FAR »**.
   - Carte de chaleur avant l’hivernage, liste **« À anticiper »** avec date de la prochaine pluie importante et **export du rapport en PDF pour les communes**.
4. **Points citoyens & Classement par quartier** (`/points` et `/admin`) :
   - Compte citoyen **100 % facultatif** (téléphone vérifié par code OTP), le signalement anonyme restant prioritaire.
   - Attribution **seulement après vérification** par un relais ou l’admin (+10 pts), plafond quotidien (30 pts/jour), 0 point pour les doublons, retrait (-20 pts) en cas de malveillance, journal auditable (**ledger**).
   - Catalogue configurable avec mention **« Récompenses en cours de lancement »**, interface `PayoutProvider` (Wave, Orange Money) en **MODE SIMULATION**, entrées sponsors vides, et **classement uniquement par quartier**.
5. **Mode démo guidé en 5 temps** :
   - Bouton discret **« Mode démo »** exécutant en direct les 5 étapes devant le jury avec étiquetage **« Exemple fictif »** et bouton de réinitialisation.

---

## 3. Guide de déploiement pas à pas

Le dépôt inclut tous les fichiers de configuration prêts à l’emploi :
- **Frontend (Vercel ou Netlify)** : [`client/vercel.json`](./client/vercel.json), [`netlify.toml`](./netlify.toml), [`client/public/_redirects`](./client/public/_redirects)
- **API & PostgreSQL (Render, Railway ou Fly.io)** : [`render.yaml`](./render.yaml), [`railway.json`](./railway.json), [`fly.toml`](./fly.toml), [`Dockerfile`](./Dockerfile)

### Étape A — Déployer l’API et PostgreSQL (Render, Railway ou Fly.io)

1. **Render.com** : cliquer sur **New + → Blueprint** sur le dépôt GitHub `nio-far` (détecte [`render.yaml`](./render.yaml), crée PostgreSQL + Web Service).
2. **Railway.app** : importer le dépôt `nio-far` + ajouter un service PostgreSQL (utilise [`railway.json`](./railway.json)).
3. **Fly.io** : `fly launch` puis `fly deploy` (utilise [`fly.toml`](./fly.toml) et [`Dockerfile`](./Dockerfile)).

### Étape B — Déployer le Frontend PWA (Vercel ou Netlify)

1. **Vercel** : Root Directory = `client`, variable `VITE_API_URL=https://<votre-api>/api` ([`client/vercel.json`](./client/vercel.json)).
2. **Netlify** : détection automatique de [`netlify.toml`](./netlify.toml), variable `VITE_API_URL=https://<votre-api>/api`.
