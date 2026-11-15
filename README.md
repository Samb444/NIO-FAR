# NIO FAR

Plateforme citoyenne de suivi des problèmes de proximité en banlieue de Dakar (Sénégal) :
**déchets, eau stagnante, éclairage public, voirie**. *« Nio far » : nous sommes ensemble, en wolof.*

> Prototype présenté au concours **Banlieue Smart Genius 2026**, catégorie *Smart Territory*.

## Démarrer

```bash
npm install      # à la racine (workspaces npm)
npm run dev      # http://localhost:5173
npm run build    # build de production dans client/dist
```

Tester sur téléphone (même Wi-Fi) : `npm run dev -- --host`.

## Stack

- **client/** — Vite, React, TypeScript, Tailwind CSS v4, Framer Motion, React Router
- **3D** — three, @react-three/fiber, @react-three/drei
- **server/** — Node.js + Express (prévu à l'étape 3)

## Structure

```
client/src/
  components/   UI (Header, Hero, sections, icônes animées…)
  pages/        Routes (/, /signaler, /signalements)
  three/        Scène 3D du hero (lazy-loaded)
  lib/          Tokens JS, thème clair/sombre, détection WebGL, données
  styles/       tokens.css (design tokens centralisés) + global.css
```

## Performance & accessibilité

- 3D chargée en lazy-loading, ~2 500 triangles, pas d'ombres temps réel, pixel ratio plafonné à 1.5,
  rendu suspendu hors écran.
- Fallback SVG statique si WebGL est indisponible, si l'économiseur de données est actif
  ou si `prefers-reduced-motion` est activé.
- Contrastes AA, zones tactiles ≥ 44 px, lien d'évitement, navigation clavier, balises sémantiques.
