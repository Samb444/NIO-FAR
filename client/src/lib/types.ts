import type { CategoryId } from './tokens';

export type Categorie = CategoryId;
export type Statut = 'recu' | 'a_verifier' | 'transmis' | 'en_cours' | 'resolu';
export type Gravite = 1 | 2 | 3;
export type RoleUtilisateur = 'admin' | 'relais';
export type RelanceNiveau = 'aucune' | 'j3' | 'j7';
export type PayoutProviderType = 'wave' | 'orange_money';

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
  pointsAttribues?: number;
  estMalveillant?: boolean;
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
  citizenId?: string | null;
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
> & {
  citizenId?: string | null;
};

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

export type FacteurExplicable = {
  code: 'densite' | 'recurrence' | 'saisonnalite' | 'meteo';
  label: string;
  poidsPourcent: number;
  scoreBrutSur100: number;
  contributionPoints: number;
  explication: string;
};

export type ScoreRisqueCategorie = {
  categorie: Categorie;
  labelCategorie: string;
  nbSignalementsCategorie: number;
  nbRecurrentsOuActifs: number;
  donneesSuffisantes: boolean;
  statutDonnees: string;
  messageGardeFou: string;
  scoreRisque: number | null;
  niveauRisque: 'donnees_insuffisantes' | 'faible' | 'modere' | 'eleve';
  formuleExplicable: string;
  facteurs: FacteurExplicable[];
  actionSuggereeCommune: string;
};

export type PointNoirSecteur = {
  secteur: string;
  latitude: number;
  longitude: number;
  totalSignalementsSecteur: number;
  seuilMinimalRequis: number;
  donneesSuffisantes: boolean;
  statutAffichage: string;
  scoreGlobalSecteur: number | null;
  niveauGlobal: 'donnees_insuffisantes' | 'faible' | 'modere' | 'eleve';
  saisonnaliteMensuelle: { mois: number; labelMois: string; count: number; estHivernage: boolean }[];
  parCategorie: ScoreRisqueCategorie[];
};

export type ElementAAnticiper = {
  secteur: string;
  categorie: Categorie;
  labelCategorie: string;
  scoreRisque: number;
  niveauRisque: 'modere' | 'eleve';
  prochainePluieDate: string | null;
  prochainePluieMm: number | null;
  justificationCourte: string;
  actionRecommandee: string;
  facteurs: FacteurExplicable[];
};

export type RapportPointsNoirs = {
  mentionLegale: string;
  methode: string;
  seuilMinimalSecteur: number;
  genereLe: string;
  contientExemplesFictifs: boolean;
  meteo: {
    source: string;
    zone: string;
    latitude: number;
    longitude: number;
    horodatage: string;
    cumul7JoursMm: number;
    maxJourMm: number;
    prochainePluieImportante: {
      date: string;
      precipitationMm: number;
      probabiliteMax: number;
      seuilMm: number;
    } | null;
    jours: { date: string; precipitationMm: number; probabiliteMax: number }[];
    estRepliHorsLigne: boolean;
  };
  secteurs: PointNoirSecteur[];
  aAnticiper: ElementAAnticiper[];
};

export type CompteCitoyen = {
  id: string;
  telephoneMasque: string;
  secteur: string;
  pointsBalance: number;
  pointsGagnesAujourdHui: number;
  plafondQuotidien: number;
  pointsParSignalementVerifie: number;
};

export type EntreeLedgerPoints = {
  id: string;
  citizenId: string;
  reportId: string | null;
  secteur: string;
  delta: number;
  motif: 'verification_signalement' | 'retrait_doublon' | 'retrait_malveillant' | 'echange_recompense';
  description: string;
  createdBy: string;
  createdAt: string;
  telephoneMasque?: string;
};

export type ElementCatalogueRecompense = {
  id: string;
  titre: string;
  description: string;
  pointsRequis: number;
  fournisseurPaiement: PayoutProviderType;
  sponsorNom: string;
  sponsorContact: string;
  montantIndicatif: string;
  actif: boolean;
};

export type ClassementQuartiers = {
  politiqueConfidentialite: string;
  regles: {
    pointsParSignalementVerifie: number;
    plafondQuotidienPoints: number;
    penaliteMalveillant: number;
    pointsDoublon: number;
  };
  quartiers: {
    secteur: string;
    pointsTotaux: number;
    signalementsVerifies: number;
    resolusVerifies: number;
    confirmationsCitoyennes: number;
    scoreCollectif: number;
  }[];
};

export type ReponseScenarioDemo = {
  step: number;
  titre: string;
  explication: string;
  report: SignalementPublic | null;
  hotspotsResume?: {
    secteursActifs: number;
    secteursInsuffisants: number;
    aAnticiperCount: number;
  };
  topQuartier?: {
    secteur: string;
    scoreCollectif: number;
  } | null;
};
