/**
 * Client HTTP de l'API NIO FAR (étape 3).
 * Remplace l'ancien service simulé et dialogue directement avec le backend Express + PostgreSQL (/api).
 */
import type {
  Categorie,
  FiltresSignalements,
  IndicateursPublics,
  NouveauSignalement,
  SignalementAdmin,
  SignalementPublic,
  Statut,
  UtilisateurSession,
} from './types';
import { genererUUID } from './utils';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export class ErreurReseau extends Error {
  constructor() {
    super('Pas de connexion au serveur. Votre signalement peut être gardé hors-ligne.');
    this.name = 'ErreurReseau';
  }
}

export class ErreurIntrouvable extends Error {
  constructor() {
    super('Signalement introuvable.');
    this.name = 'ErreurIntrouvable';
  }
}

/** Identifiant d'appareil anonyme persistant (haché par le serveur avec sel). */
export function obtenirDeviceIdAnonyme(): string {
  const CLE = 'niofar-device-anon-id';
  try {
    const existant = localStorage.getItem(CLE);
    if (existant) return existant;
    const nouveau = genererUUID();
    localStorage.setItem(CLE, nouveau);
    return nouveau;
  } catch {
    return 'appareil-navigateur';
  }
}

/** Priorité transparente (utilise le score calculé par l'API ou la formule de repli). */
export function priorite(
  s: Pick<SignalementPublic, 'gravite' | 'confirmations' | 'priorite' | 'dateCreation'>,
): number {
  if (typeof s.priorite === 'number') return s.priorite;
  const jours = s.dateCreation
    ? Math.max(0, Math.floor((Date.now() - new Date(s.dateCreation).getTime()) / 86_400_000))
    : 0;
  return s.gravite * 2 + s.confirmations + Math.floor(jours / 3);
}

let csrfMemoire = '';

function lireCookieCsrf(): string {
  if (csrfMemoire) return csrfMemoire;
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)niofar_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

async function requete<T>(chemin: string, init?: RequestInit): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ErreurReseau();
  }

  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Device-Id', obtenirDeviceIdAnonyme());
  const csrf = lireCookieCsrf();
  if (csrf) headers.set('X-CSRF-Token', csrf);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${chemin}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ErreurReseau();
  }

  if (res.status === 404) {
    throw new ErreurIntrouvable();
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Erreur serveur (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export interface NioFarApi {
  listerSignalements(filtres?: FiltresSignalements): Promise<SignalementPublic[]>;
  obtenirSignalement(id: string): Promise<SignalementPublic | null>;
  obtenirParCode(code: string): Promise<SignalementPublic | null>;
  chercherSimilaires(categorie: Categorie, secteur: string): Promise<SignalementPublic[]>;
  creerSignalement(donnees: NouveauSignalement): Promise<SignalementPublic>;
  televerserAudio(id: string, audio: Blob, duree?: number): Promise<SignalementPublic>;
  confirmerProbleme(id: string): Promise<SignalementPublic>;
  repondreVerification(id: string, regle: boolean): Promise<SignalementPublic>;
  indicateursPublics(): Promise<IndicateursPublics>;
  chargerExemples(): Promise<number>;
  retirerExemples(): Promise<void>;
  urlOpenDataCsv(): string;
  urlOpenDataJson(): string;

  // Administration & Authentification
  connexionAdmin(email: string, password: string): Promise<{ user: UtilisateurSession; csrfToken: string }>;
  deconnexionAdmin(): Promise<void>;
  sessionAdmin(): Promise<{ user: UtilisateurSession; csrfToken: string } | null>;
  listerSignalementsAdmin(): Promise<SignalementAdmin[]>;
  modifierStatutAdmin(
    id: string,
    payload: {
      statut?: Statut;
      note?: string;
      acteurCompetent?: string | null;
      verifieParRelais?: boolean;
      photoApres?: string | null;
      confirmationHabitant?: boolean | null;
      transcriptionSuggeree?: string;
      categorie?: Categorie;
      validerSuggestion?: boolean;
    },
  ): Promise<SignalementAdmin>;
  marquerDoublonAdmin(id: string, estDoublon: boolean, note?: string): Promise<SignalementAdmin>;
  listerRelancesAdmin(): Promise<{
    politique: string;
    totalRelances: number;
    j3Count: number;
    j7Count: number;
    items: SignalementAdmin[];
  }>;
  validerRelanceAdmin(id: string): Promise<SignalementAdmin>;
}

class ClientHttpNioFar implements NioFarApi {
  async listerSignalements(filtres: FiltresSignalements = {}): Promise<SignalementPublic[]> {
    const params = new URLSearchParams();
    if (filtres.code) params.set('code', filtres.code);
    if (filtres.secteur) params.set('secteur', filtres.secteur);
    if (filtres.categories?.length) params.set('categories', filtres.categories.join(','));
    if (filtres.statuts?.length) params.set('statuts', filtres.statuts.join(','));
    const q = params.toString();
    return requete<SignalementPublic[]>(`/reports${q ? `?${q}` : ''}`);
  }

  async obtenirSignalement(id: string): Promise<SignalementPublic | null> {
    try {
      return await requete<SignalementPublic>(`/reports/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof ErreurIntrouvable) return null;
      throw e;
    }
  }

  async obtenirParCode(code: string): Promise<SignalementPublic | null> {
    try {
      return await requete<SignalementPublic>(`/reports/track/${encodeURIComponent(code)}`);
    } catch (e) {
      if (e instanceof ErreurIntrouvable) return null;
      throw e;
    }
  }

  async chercherSimilaires(categorie: Categorie, secteur: string): Promise<SignalementPublic[]> {
    const params = new URLSearchParams({
      categorie,
      secteur,
      similaires: '1',
    });
    return requete<SignalementPublic[]>(`/reports?${params.toString()}`);
  }

  async creerSignalement(d: NouveauSignalement): Promise<SignalementPublic> {
    return requete<SignalementPublic>('/reports', {
      method: 'POST',
      body: JSON.stringify(d),
    });
  }

  async televerserAudio(id: string, audio: Blob, duree?: number): Promise<SignalementPublic> {
    const form = new FormData();
    form.append('audio', audio, 'note-vocale.webm');
    if (duree !== undefined) form.append('duration', String(duree));
    const res = await requete<{ report: SignalementPublic }>(`/reports/${encodeURIComponent(id)}/audio`, {
      method: 'POST',
      body: form,
    });
    return res.report;
  }

  async confirmerProbleme(id: string): Promise<SignalementPublic> {
    return requete<SignalementPublic>(`/reports/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ deviceId: obtenirDeviceIdAnonyme() }),
    });
  }

  async repondreVerification(id: string, regle: boolean): Promise<SignalementPublic> {
    return requete<SignalementPublic>(`/reports/${encodeURIComponent(id)}/resolution-feedback`, {
      method: 'POST',
      body: JSON.stringify({ regle, verdict: regle ? 'regle' : 'toujours_la' }),
    });
  }

  async indicateursPublics(): Promise<IndicateursPublics> {
    return requete<IndicateursPublics>('/public/stats');
  }

  async chargerExemples(): Promise<number> {
    const r = await requete<{ ajoutes: number }>('/reports/examples', { method: 'POST' });
    return r.ajoutes;
  }

  async retirerExemples(): Promise<void> {
    await requete('/reports/examples', { method: 'DELETE' });
  }

  urlOpenDataCsv(): string {
    return `${API_BASE}/public/open-data.csv`;
  }

  urlOpenDataJson(): string {
    return `${API_BASE}/public/open-data.json`;
  }

  async connexionAdmin(email: string, password: string): Promise<{ user: UtilisateurSession; csrfToken: string }> {
    const r = await requete<{ user: UtilisateurSession; csrfToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    csrfMemoire = r.csrfToken;
    return r;
  }

  async deconnexionAdmin(): Promise<void> {
    await requete('/auth/logout', { method: 'POST' });
    csrfMemoire = '';
  }

  async sessionAdmin(): Promise<{ user: UtilisateurSession; csrfToken: string } | null> {
    try {
      const r = await requete<{ user: UtilisateurSession; csrfToken: string }>('/auth/me');
      csrfMemoire = r.csrfToken;
      return r;
    } catch {
      return null;
    }
  }

  async listerSignalementsAdmin(): Promise<SignalementAdmin[]> {
    return requete<SignalementAdmin[]>('/admin/reports');
  }

  async modifierStatutAdmin(
    id: string,
    payload: {
      statut?: Statut;
      note?: string;
      acteurCompetent?: string | null;
      verifieParRelais?: boolean;
      photoApres?: string | null;
      confirmationHabitant?: boolean | null;
      transcriptionSuggeree?: string;
      categorie?: Categorie;
      validerSuggestion?: boolean;
    },
  ): Promise<SignalementAdmin> {
    return requete<SignalementAdmin>(`/admin/reports/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async marquerDoublonAdmin(id: string, estDoublon: boolean, note?: string): Promise<SignalementAdmin> {
    return requete<SignalementAdmin>(`/admin/reports/${encodeURIComponent(id)}/duplicate`, {
      method: 'PATCH',
      body: JSON.stringify({ estDoublon, note }),
    });
  }

  async listerRelancesAdmin() {
    return requete<{
      politique: string;
      totalRelances: number;
      j3Count: number;
      j7Count: number;
      items: SignalementAdmin[];
    }>('/admin/reminders');
  }

  async validerRelanceAdmin(id: string): Promise<SignalementAdmin> {
    return requete<SignalementAdmin>(`/admin/reminders/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
    });
  }
}

export const api: NioFarApi = new ClientHttpNioFar();
