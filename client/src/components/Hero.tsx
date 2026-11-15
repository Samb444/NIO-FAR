import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, MapPin } from 'lucide-react';
import { ButtonLink } from './ButtonLink';
import { HeroFallback } from './HeroFallback';
import { ErrorBoundary } from './ErrorBoundary';
import { hasWebGL, prefersSaveData, usePrefersReducedMotion } from '../lib/device';
import { useTheme } from '../lib/theme';
import { categories } from '../lib/categories';
import { categoryColors } from '../lib/tokens';

// La 3D (three + R3F + drei) n'est téléchargée que si elle peut être affichée.
const HeroScene = lazy(() => import('../three/HeroScene'));

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const { theme } = useTheme();
  const reduced = usePrefersReducedMotion();
  const canRender3D = useMemo(() => hasWebGL() && !prefersSaveData(), []);
  const show3D = canRender3D && !reduced;

  const sceneRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  // Met la boucle de rendu en pause quand le hero sort de l'écran
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="accueil" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <Backdrop />

      <div className="mx-auto grid min-h-[100svh] max-w-6xl items-center gap-2 px-5 pb-16 pt-24 lg:grid-cols-[1.02fr_1fr] lg:gap-6 lg:pt-20">
        {/* Scène */}
        <div
          ref={sceneRef}
          className="relative order-1 h-[44svh] min-h-[280px] sm:h-[50svh] lg:order-2 lg:h-[76svh]"
        >
          <div
            className="absolute inset-0"
            role="img"
            aria-label="Illustration : un quartier stylisé flottant sur une île, avec des marqueurs de signalement lumineux pour chaque catégorie."
          >
          {show3D ? (
            <ErrorBoundary fallback={<HeroFallback />}>
              <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
                <Suspense fallback={null}>
                  <HeroScene active={visible} dark={theme === 'dark'} onReady={() => setReady(true)} />
                </Suspense>
              </div>
              {!ready && (
                <div className="absolute inset-0" aria-hidden>
                  <HeroFallback />
                </div>
              )}
            </ErrorBoundary>
          ) : (
            <HeroFallback />
          )}
          </div>

          {/* Légende des marqueurs */}
          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6, ease }}
            className="glass absolute bottom-1 right-0 hidden flex-col gap-1.5 rounded-2xl px-4 py-3 text-sm shadow-soft sm:flex"
            aria-label="Légende des catégories"
          >
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColors[c.id] }} aria-hidden />
                {c.label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Texte */}
        <div className="relative z-10 order-2 lg:order-1">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="glass mb-5 inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-soft"
          >
            <MapPin size={16} className="text-accent" aria-hidden />
            Banlieue de Dakar · Smart Territory
          </motion.p>

          <h1 id="hero-title" className="text-[2.65rem] font-extrabold leading-[0.98] sm:text-6xl lg:text-[4.6rem]">
            {['Les problèmes', 'de votre quartier,'].map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={{ opacity: 0, y: 34 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease }}
              >
                {line}
              </motion.span>
            ))}
            <motion.span
              className="relative block text-accent"
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease }}
            >
              enfin suivis.
              <svg
                className="absolute -bottom-2 left-0 h-3 w-[min(100%,15ch)] text-ochre"
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
                aria-hidden
              >
                <motion.path
                  d="M2 9 C 80 2, 180 2, 298 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.9, ease }}
                />
              </svg>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease }}
            className="mt-7 font-display text-2xl font-semibold sm:text-3xl"
          >
            Signalez, suivez, vérifiez.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease }}
            className="mt-3 max-w-xl text-lg text-fg-muted"
          >
            Déchets, eau stagnante, éclairage public, voirie : NIO FAR aide les habitants à rendre visibles les problèmes
            du quotidien, et à vérifier ensemble qu’ils sont vraiment réglés.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <ButtonLink to="/signaler" variant="primary">
              Signaler un problème
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </ButtonLink>
            <ButtonLink to="/signalements" variant="secondary">
              Voir les signalements
            </ButtonLink>
          </motion.div>
        </div>
      </div>

      <a
        href="#comment-ca-marche"
        className="absolute bottom-4 left-1/2 hidden min-h-11 -translate-x-1/2 items-center gap-2 rounded-full px-4 text-sm font-medium text-fg-muted hover:text-fg lg:inline-flex"
      >
        <ArrowDown size={16} className="nf-bob" aria-hidden />
        Découvrir
      </a>
    </section>
  );
}

/** Fond : halos de couleur + motif géométrique inspiré des tissus wax. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -right-32 -top-32 h-[38rem] w-[38rem] rounded-full bg-mint/30 blur-3xl dark:bg-mint/15" />
      <div className="absolute -bottom-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-ochre/25 blur-3xl dark:bg-ochre/10" />
      <div className="absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-forest/10 blur-3xl dark:bg-forest/30" />
      <svg className="absolute inset-0 h-full w-full text-fg opacity-[0.045] dark:opacity-[0.06]">
        <defs>
          <pattern id="wax" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M28 4 L52 28 L28 52 L4 28 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M28 18 L38 28 L28 38 L18 28 Z" fill="currentColor" />
            <circle cx="0" cy="0" r="3" fill="currentColor" />
            <circle cx="56" cy="56" r="3" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wax)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
