import type { CategoryId } from './tokens';

export type Categorie = CategoryId;
export type Statut = 'recu' | 'a_verifier' | 'transmis' | 'en_cours' | 'resolu';
export type Gravite = 1 | 2 | 3;
export type RoleUtilisateur = 'admin' | 'relais';
export type RelanceNiveau = 'aucune' | 'j3' | 'j7';

export type EntreeHistorique = {
  date: string; // ISO 8601
  statut: Statut;
  note: string;
  auteur?: string;
};

export type Contact = {
  type: 'whatsapp' | 'telephone';
  valeur: string;
};

export type DetailPriorite = {
  score: number;
  gravite: number;
  gravitePoints: number;
  similairesCount: number;
  similairesPoints: number;
  confirmations: number;
  confirmationsPoints: number;
  joursDepuisCreation: number;
  tranchesTroisJours: number;
  anciennetePoints: number;
  formule: string;
  explication: string;
};

export type SuggestionVocaleAdmin = {
  transcriptionSuggeree: string;
  langueDetectee: string;
  confianceTranscription: number;
  fournisseurTranscription: string;
  avertissementTranscription: string | null;
  categorieSuggeree: Categorie | null;
  motsClesTrouves: string[];
  sourceCategorie: string;
  statutValidation: 'en_attente' | 'validee' | 'corrigee';
};

/** Modèle complet d'un signalement. */
export type Signalement = {
  id: string; // UUID généré côté client
  code: string; // NF-XXXXX
  categorie: Categorie;
  description: string;
  secteur: string;
  latitude: number | null; // arrondie à 3 décimales
  longitude: number | null;
  gravite: Gravite;
  photo: string | null; // data URL (JPEG compressé 480 px)
  audio: string | null; // jamais exposé publiquement (protégé par /api/admin/...)
  hasAudio?: boolean;
  contact: Contact | null; // jamais affiché publiquement
  statut: Statut;
  estDoublon: boolean;
  doublonDeId?: string | null;
  confirmations: number;
  confirmationHabitant: boolean | null;
  photoApres: string | null;
  enAttenteEnvoi: boolean;
  verifieParRelais?: boolean;
  acteurCompetent?: string | null;
  acteurSuggere?: string;
  relanceNiveau?: RelanceNiveau;
  dateCreation: string;
  dateMiseAJour?: string;
  historique: EntreeHistorique[];
  estExemple?: boolean;
  priorite?: number;
  prioriteDetail?: DetailPriorite;
};

/** Version publique : le contact et l'audio brut ne sont jamais renvoyés. */
export type SignalementPublic = Omit<Signalement, 'contact'>;

/** Version complète réservée à l'administration. */
export type SignalementAdmin = Signalement & {
  relanceDate: string | null;
  relanceValideeAdmin: boolean;
  suggestion: SuggestionVocaleAdmin | null;
};

/** Données saisies par l'habitant au moment de l'envoi. */
export type NouveauSignalement = Pick<
  Signalement,
  | 'id'
  | 'code'
  | 'categorie'
  | 'description'
  | 'secteur'
  | 'latitude'
  | 'longitude'
  | 'gravite'
  | 'photo'
  | 'audio'
  | 'contact'
  | 'dateCreation'
>;

export type FiltresSignalements = {
  code?: string;
  secteur?: string;
  categories?: Categorie[];
  statuts?: Statut[];
};

export type IndicateursPublics = {
  total: number;
  tauxResolutionVerifiee: number;
  resolusVerifies: number;
  resolusConfirmes: number;
  resolusContestes: number;
  delaiMedianPremiereVerificationHeures: number | null;
  delaiMedianPremiereVerificationJours: number | null;
  delaiMoyenResolutionJours: number | null;
  parStatut: Record<Statut, number>;
  parCategorie: Record<Categorie, number>;
  parSecteur: Record<string, { total: number; resolus: number; aTraiter: number }>;
  totalConfirmations: number;
  contientExemples: boolean;
};

export type UtilisateurSession = {
  id: string;
  email: string;
  nom: string;
  role: RoleUtilisateur;
};
