/**
 * Lecture vocale du statut.
 * - Français : synthèse vocale du navigateur (speechSynthesis, voix fr-*).
 * - Wolof : AUCUNE voix de synthèse. Uniquement des messages pré-enregistrés par un locuteur
 *   natif, déposés dans /public/audio/wo/ (voir le README et manifest.json de ce dossier).
 */
import type { Statut } from './types';

export function syntheseDisponible(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function lireEnFrancais(texte: string, onFin?: () => void): () => void {
  if (!syntheseDisponible()) throw new Error('La lecture à voix haute n’est pas disponible sur ce navigateur.');
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = 'fr-FR';
  u.rate = 0.95;
  const voix = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('fr'));
  if (voix) u.voice = voix;
  u.onend = () => onFin?.();
  u.onerror = () => onFin?.();
  synth.speak(u);
  return () => synth.cancel();
}

type ManifesteWolof = { fichiers: Partial<Record<Statut, string>> };

let manifeste: Promise<ManifesteWolof | null> | null = null;

/** Renvoie l'URL du message wolof pré-enregistré pour ce statut, ou null s'il n'existe pas encore. */
export async function audioWolofPour(statut: Statut): Promise<string | null> {
  if (!manifeste) {
    manifeste = fetch('/audio/wo/manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<ManifesteWolof>) : null))
      .catch(() => null);
  }
  const m = await manifeste;
  const fichier = m?.fichiers[statut];
  return fichier ? `/audio/wo/${fichier}` : null;
}
