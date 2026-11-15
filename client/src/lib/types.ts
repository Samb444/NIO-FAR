import type { CategoryId } from './tokens';

export type Categorie = CategoryId;
export type Statut = 'recu' | 'a_verifier' | 'transmis' | 'en_cours' | 'resolu';
export type Gravite = 1 | 2 | 3;

export type EntreeHistorique = {
  date: string; // ISO 8601
  statut: Statut;
  note: string;
};

export type Contact = {
  type: 'whatsapp' | 'telephone';
  valeur: string;
};

/** Modèle complet d'un signalement (identique à la future API). */
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
  audio: string | null; // data URL (note vocale ≤ 30 s)
  contact: Contact | null; // jamais affiché publiquement
  statut: Statut;
  estDoublon: boolean;
  confirmations: number;
  confirmationHabitant: boolean | null;
  photoApres: string | null;
  enAttenteEnvoi: boolean;
  dateCreation: string;
  historique: EntreeHistorique[];
  /** Marqueur des données d'exemple (« Exemple fictif »). */
  estExemple?: boolean;
};

/** Version publique : le contact n'est jamais renvoyé. */
export type SignalementPublic = Omit<Signalement, 'contact'>;

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
  parStatut: Record<Statut, number>;
  parCategorie: Record<Categorie, number>;
  resolusConfirmes: number;
  resolusContestes: number;
  delaiMoyenResolutionJours: number | null;
  totalConfirmations: number;
  contientExemples: boolean;
};
