import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import {
  reports,
  type CategorieDB,
  type ContactDB,
  type EntreeHistoriqueDB,
  type RelanceNiveauDB,
  type StatutDB,
} from '../db/schema.js';
import { suggererActeurCompetent } from './actors.js';
import {
  calculerPrioriteTransparente,
  compterSimilairesDansListe,
  type DetailPriorite,
  type SignalementPourPriorite,
} from './priority.js';
import { config } from '../config.js';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function genererCodeNF(): string {
  const bytes = crypto.randomBytes(5);
  return `NF-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

export async function genererCodeUnique(db: Database, codePropose?: string): Promise<string> {
  if (codePropose && /^NF-[A-Z0-9]{5}$/i.test(codePropose)) {
    const norm = codePropose.toUpperCase();
    const exist = await db.select({ id: reports.id }).from(reports).where(eq(reports.code, norm));
    if (exist.length === 0) return norm;
  }
  for (let i = 0; i < 20; i++) {
    const candidat = genererCodeNF();
    const exist = await db.select({ id: reports.id }).from(reports).where(eq(reports.code, candidat));
    if (exist.length === 0) return candidat;
  }
  return `NF-${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

export function arrondirCoordonnee(n: number | null | undefined): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}

export function hacherAppareilAnonyme(identifiantBrut: string): string {
  return crypto
    .createHmac('sha256', config.deviceHashSalt)
    .update(identifiantBrut.trim())
    .digest('hex');
}

export type RowReport = typeof reports.$inferSelect;

export type SignalementPublicAPI = {
  id: string;
  code: string;
  categorie: CategorieDB;
  description: string;
  secteur: string;
  latitude: number | null;
  longitude: number | null;
  gravite: 1 | 2 | 3;
  photo: string | null;
  audio: null; // Jamais exposé publiquement
  hasAudio: boolean;
  statut: StatutDB;
  estDoublon: boolean;
  doublonDeId: string | null;
  confirmations: number;
  confirmationHabitant: boolean | null;
  photoApres: string | null;
  enAttenteEnvoi: boolean;
  verifieParRelais: boolean;
  acteurCompetent: string | null;
  acteurSuggere: string;
  relanceNiveau: RelanceNiveauDB;
  dateCreation: string;
  dateMiseAJour: string;
  historique: EntreeHistoriqueDB[];
  estExemple: boolean;
  priorite: number;
  prioriteDetail: DetailPriorite;
};

export type SuggestionAPI = {
  transcriptionSuggeree: string;
  langueDetectee: string;
  confianceTranscription: number;
  fournisseurTranscription: string;
  avertissementTranscription: string | null;
  categorieSuggeree: CategorieDB | null;
  motsClesTrouves: string[];
  sourceCategorie: string;
  statutValidation: 'en_attente' | 'validee' | 'corrigee';
};

export type SignalementAdminAPI = Omit<SignalementPublicAPI, 'audio'> & {
  audio: string | null;
  contact: ContactDB | null;
  relanceDate: string | null;
  relanceValideeAdmin: boolean;
  suggestion: SuggestionAPI | null;
};

export function versSignalementPublic(
  r: RowReport,
  tous: SignalementPourPriorite[] = [r],
  maintenant: Date = new Date(),
): SignalementPublicAPI {
  const simCount = compterSimilairesDansListe(r, tous);
  const prioriteDetail = calculerPrioriteTransparente(r, simCount, maintenant);
  const { acteur: acteurSuggere } = suggererActeurCompetent(r.categorie);

  return {
    id: r.id,
    code: r.code,
    categorie: r.categorie,
    description: r.description,
    secteur: r.secteur,
    latitude: arrondirCoordonnee(r.latitude),
    longitude: arrondirCoordonnee(r.longitude),
    gravite: (r.gravite === 1 || r.gravite === 3 ? r.gravite : 2) as 1 | 2 | 3,
    photo: r.photo ?? null,
    audio: null, // Sécurité : l'audio et le contact ne sont jamais exposés publiquement
    hasAudio: Boolean(r.audio),
    statut: r.statut,
    estDoublon: r.estDoublon,
    doublonDeId: r.doublonDeId ?? null,
    confirmations: r.confirmations,
    confirmationHabitant: r.confirmationHabitant ?? null,
    photoApres: r.photoApres ?? null,
    enAttenteEnvoi: r.enAttenteEnvoi,
    verifieParRelais: r.verifieParRelais,
    acteurCompetent: r.acteurCompetent ?? null,
    acteurSuggere,
    relanceNiveau: r.relanceNiveau,
    dateCreation: r.dateCreation.toISOString(),
    dateMiseAJour: r.dateMiseAJour.toISOString(),
    historique: r.historique ?? [],
    estExemple: r.estExemple,
    priorite: prioriteDetail.score,
    prioriteDetail,
  };
}

export function versSignalementAdmin(
  r: RowReport,
  tous: SignalementPourPriorite[] = [r],
  suggestion: SuggestionAPI | null = null,
  maintenant: Date = new Date(),
): SignalementAdminAPI {
  const pub = versSignalementPublic(r, tous, maintenant);
  const audioUrl = r.audio
    ? r.audio.startsWith('data:')
      ? r.audio
      : `/api/admin/reports/${r.id}/audio`
    : null;

  return {
    ...pub,
    audio: audioUrl,
    contact: r.contact ?? null,
    relanceDate: r.relanceDate ? r.relanceDate.toISOString() : null,
    relanceValideeAdmin: r.relanceValideeAdmin,
    suggestion,
  };
}
