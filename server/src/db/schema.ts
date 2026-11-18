import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export type CategorieDB = 'dechets' | 'eau_stagnante' | 'eclairage' | 'voirie';
export type StatutDB = 'recu' | 'a_verifier' | 'transmis' | 'en_cours' | 'resolu';
export type RoleDB = 'admin' | 'relais';
export type RelanceNiveauDB = 'aucune' | 'j3' | 'j7';
export type MotifPointDB =
  | 'verification_signalement'
  | 'retrait_doublon'
  | 'retrait_malveillant'
  | 'echange_recompense';
export type PayoutProviderTypeDB = 'wave' | 'orange_money';

export type EntreeHistoriqueDB = {
  date: string;
  statut: StatutDB;
  note: string;
  auteur?: string;
};

export type ContactDB = {
  type: 'whatsapp' | 'telephone';
  valeur: string;
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 160 }).notNull().unique(),
  nom: varchar('nom', { length: 120 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).$type<RoleDB>().notNull().default('relais'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const citizens = pgTable('citizens', {
  id: uuid('id').primaryKey(),
  telephoneHash: varchar('telephone_hash', { length: 128 }).notNull().unique(),
  telephoneMasque: varchar('telephone_masque', { length: 32 }).notNull(),
  secteur: varchar('secteur', { length: 80 }).notNull().default('Pikine'),
  pointsBalance: integer('points_balance').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const citizenOtps = pgTable('citizen_otps', {
  id: uuid('id').primaryKey(),
  telephoneHash: varchar('telephone_hash', { length: 128 }).notNull(),
  telephoneMasque: varchar('telephone_masque', { length: 32 }).notNull(),
  secteur: varchar('secteur', { length: 80 }).notNull().default('Pikine'),
  code: varchar('code', { length: 10 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey(),
  code: varchar('code', { length: 16 }).notNull().unique(),
  categorie: varchar('categorie', { length: 32 }).$type<CategorieDB>().notNull(),
  description: text('description').notNull().default(''),
  secteur: varchar('secteur', { length: 80 }).notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  gravite: integer('gravite').notNull().default(2),
  photo: text('photo'),
  audio: text('audio'),
  audioMime: varchar('audio_mime', { length: 64 }),
  contact: jsonb('contact').$type<ContactDB | null>(),
  statut: varchar('statut', { length: 24 }).$type<StatutDB>().notNull().default('recu'),
  estDoublon: boolean('est_doublon').notNull().default(false),
  doublonDeId: uuid('doublon_de_id'),
  confirmations: integer('confirmations').notNull().default(0),
  confirmationHabitant: boolean('confirmation_habitant'),
  photoApres: text('photo_apres'),
  enAttenteEnvoi: boolean('en_attente_envoi').notNull().default(false),
  verifieParRelais: boolean('verifie_par_relais').notNull().default(false),
  acteurCompetent: varchar('acteur_competent', { length: 160 }),
  relanceNiveau: varchar('relance_niveau', { length: 16 }).$type<RelanceNiveauDB>().notNull().default('aucune'),
  relanceDate: timestamp('relance_date', { withTimezone: true }),
  relanceValideeAdmin: boolean('relance_validee_admin').notNull().default(false),
  citizenId: uuid('citizen_id').references(() => citizens.id, { onDelete: 'set null' }),
  pointsAttribues: integer('points_attribues').notNull().default(0),
  estMalveillant: boolean('est_malveillant').notNull().default(false),
  historique: jsonb('historique').$type<EntreeHistoriqueDB[]>().notNull().default([]),
  estExemple: boolean('est_exemple').notNull().default(false),
  dateCreation: timestamp('date_creation', { withTimezone: true }).notNull().defaultNow(),
  dateMiseAJour: timestamp('date_mise_a_jour', { withTimezone: true }).notNull().defaultNow(),
});

export const reportConfirmations = pgTable(
  'report_confirmations',
  {
    id: uuid('id').primaryKey(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    deviceHash: varchar('device_hash', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('report_device_unique_idx').on(t.reportId, t.deviceHash)],
);

export const reportSuggestions = pgTable('report_suggestions', {
  id: uuid('id').primaryKey(),
  reportId: uuid('report_id')
    .notNull()
    .unique()
    .references(() => reports.id, { onDelete: 'cascade' }),
  transcriptionSuggeree: text('transcription_suggeree').notNull().default(''),
  langueDetectee: varchar('langue_detectee', { length: 16 }).notNull().default('fr'),
  confianceTranscription: doublePrecision('confiance_transcription').notNull().default(0),
  fournisseurTranscription: varchar('fournisseur_transcription', { length: 80 }).notNull().default('aucun'),
  avertissementTranscription: text('avertissement_transcription'),
  categorieSuggeree: varchar('categorie_suggeree', { length: 32 }).$type<CategorieDB | null>(),
  motsClesTrouves: jsonb('mots_cles_trouves').$type<string[]>().notNull().default([]),
  sourceCategorie: varchar('source_categorie', { length: 32 }).notNull().default('mots_cles'),
  statutValidation: varchar('statut_validation', { length: 24 })
    .$type<'en_attente' | 'validee' | 'corrigee'>()
    .notNull()
    .default('en_attente'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transcriptionJobs = pgTable('transcription_jobs', {
  id: uuid('id').primaryKey(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => reports.id, { onDelete: 'cascade' }),
  langueIndice: varchar('langue_indice', { length: 16 }).notNull().default('fr'),
  statut: varchar('statut', { length: 24 })
    .$type<'en_attente' | 'en_cours' | 'termine' | 'echoue'>()
    .notNull()
    .default('en_attente'),
  tentatives: integer('tentatives').notNull().default(0),
  erreur: text('erreur'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pointsLedger = pgTable('points_ledger', {
  id: uuid('id').primaryKey(),
  citizenId: uuid('citizen_id')
    .notNull()
    .references(() => citizens.id, { onDelete: 'cascade' }),
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'set null' }),
  secteur: varchar('secteur', { length: 80 }).notNull(),
  delta: integer('delta').notNull(),
  motif: varchar('motif', { length: 40 }).$type<MotifPointDB>().notNull(),
  description: text('description').notNull(),
  createdBy: varchar('created_by', { length: 120 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rewardsCatalog = pgTable('rewards_catalog', {
  id: uuid('id').primaryKey(),
  titre: varchar('titre', { length: 160 }).notNull(),
  description: text('description').notNull().default(''),
  pointsRequis: integer('points_requis').notNull().default(100),
  fournisseurPaiement: varchar('fournisseur_paiement', { length: 32 })
    .$type<PayoutProviderTypeDB>()
    .notNull()
    .default('wave'),
  sponsorNom: varchar('sponsor_nom', { length: 160 }).notNull().default(''),
  sponsorContact: varchar('sponsor_contact', { length: 160 }).notNull().default(''),
  montantIndicatif: varchar('montant_indicatif', { length: 80 }).notNull().default(''),
  actif: boolean('actif').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payoutRequests = pgTable('payout_requests', {
  id: uuid('id').primaryKey(),
  citizenId: uuid('citizen_id')
    .notNull()
    .references(() => citizens.id, { onDelete: 'cascade' }),
  rewardId: uuid('reward_id')
    .notNull()
    .references(() => rewardsCatalog.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 32 }).$type<PayoutProviderTypeDB>().notNull(),
  pointsUtilises: integer('points_utilises').notNull(),
  statut: varchar('statut', { length: 32 }).$type<'simule'>().notNull().default('simule'),
  referenceSimulation: varchar('reference_simulation', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
