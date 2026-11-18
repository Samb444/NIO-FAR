import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { AlertTriangle, CloudOff, FlaskConical, Inbox, RefreshCw } from 'lucide-react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { statutInfos } from '../lib/referentiel';
import type { Statut } from '../lib/types';
import { usePrefersReducedMotion } from '../lib/device';
import { LogoMark } from './Logo';

export const btn = {
  base: 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition-[transform,background-color,box-shadow,opacity,filter] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 select-none',
  primary: 'bg-ochre text-ink shadow-cta hover:bg-ochre-400',
  accent: 'bg-accent text-accent-fg shadow-glow hover:brightness-110',
  secondary: 'glass text-fg shadow-soft hover:bg-bg-elev',
  ghost: 'text-fg hover:bg-fg/10',
};

export function EcranChargementLogo({ label = 'Chargement de NIO FAR…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[52svh] max-w-md flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="relative grid h-24 w-24 place-items-center">
        <span aria-hidden className="nf-pulse absolute inset-2 rounded-full bg-accent/25" />
        <motion.div
          animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative grid h-18 w-18 place-items-center rounded-3xl bg-bg-elev p-3 shadow-glow"
        >
          <LogoMark className="h-12 w-12" />
        </motion.div>
      </div>
      <p className="mt-4 font-display text-lg font-extrabold tracking-tight">
        NIO <span className="text-accent">FAR</span>
      </p>
      <p className="mt-1 text-sm text-fg-muted">{label}</p>
    </div>
  );
}

export function TiltCard({
  children,
  className = '',
  style,
  intensite = 6,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  intensite?: number;
}) {
  const reduit = usePrefersReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [intensite, -intensite]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(x, [0, 1], [-intensite, intensite]), { stiffness: 220, damping: 18 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (reduit) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width);
    y.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <div style={{ perspective: 900 }} className="h-full">
      <motion.div
        onPointerMove={move}
        onPointerLeave={reset}
        onPointerCancel={reset}
        onPointerUp={reset}
        style={{ rotateX: reduit ? 0 : rx, rotateY: reduit ? 0 : ry, transformStyle: 'preserve-3d', ...style }}
        className={`h-full ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function Squelette({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-fg/10 ${className}`} />;
}

export function SqueletteCartes({ n = 3 }: { n?: number }) {
  return (
    <div role="status" aria-label="Chargement en cours" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="glass rounded-3xl p-4">
          <Squelette className="h-36 w-full" />
          <Squelette className="mt-4 h-5 w-2/3" />
          <Squelette className="mt-2 h-4 w-1/2" />
        </div>
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

export function EtatVide({ titre, texte, action }: { titre: string; texte: ReactNode; action?: ReactNode }) {
  return (
    <div className="glass mx-auto flex max-w-lg flex-col items-center rounded-4xl px-6 py-10 text-center shadow-soft">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent"
      >
        <Inbox size={30} aria-hidden />
      </motion.div>
      <h2 className="mt-4 text-2xl font-bold">{titre}</h2>
      <div className="mt-2 text-fg-muted">{texte}</div>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function EtatErreur({ message, onReessayer }: { message: string; onReessayer?: () => void }) {
  const horsLigne = typeof navigator !== 'undefined' && !navigator.onLine;
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center rounded-4xl border border-[#C8553D]/40 bg-[#C8553D]/10 px-6 py-8 text-center">
      {horsLigne ? <CloudOff size={30} aria-hidden /> : <AlertTriangle size={30} aria-hidden />}
      <p className="mt-3 font-semibold">{horsLigne ? 'Vous êtes hors-ligne.' : 'Oups, quelque chose n’a pas marché.'}</p>
      <p className="mt-1 text-fg-muted">{message}</p>
      {onReessayer && (
        <button type="button" onClick={onReessayer} className={`${btn.base} ${btn.secondary} mt-5`}>
          <RefreshCw size={18} aria-hidden /> Réessayer
        </button>
      )}
    </div>
  );
}

export function BadgeStatut({ statut, taille = 'md' }: { statut: Statut; taille?: 'sm' | 'md' }) {
  const info = statutInfos[statut];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-elev font-semibold text-fg ${
        taille === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: info.couleur }} />
      {info.label}
    </span>
  );
}

export function BadgeExemple() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-sand dark:bg-sand dark:text-ink">
      <FlaskConical size={12} aria-hidden /> Exemple fictif
    </span>
  );
}

export function BadgeEnAttente() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ochre px-2.5 py-0.5 text-xs font-bold text-ink">
      <span aria-hidden className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
      </span>
      En attente d’envoi
    </span>
  );
}

export function EnTetePage({ titre, intro, children }: { titre: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-extrabold leading-tight sm:text-5xl"
      >
        {titre}
      </motion.h1>
      {intro && <p className="mt-2 max-w-2xl text-fg-muted sm:text-lg">{intro}</p>}
      {children}
    </header>
  );
}
