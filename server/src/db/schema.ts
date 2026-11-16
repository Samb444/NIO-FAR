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

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey(), // UUID généré côté client (idempotence)
  code: varchar('code', { length: 16 }).notNull().unique(), // NF-XXXXX
  categorie: varchar('categorie', { length: 32 }).$type<CategorieDB>().notNull(),
  description: text('description').notNull().default(''),
  secteur: varchar('secteur', { length: 80 }).notNull(),
  latitude: doublePrecision('latitude'), // arrondie à 3 décimales
  longitude: doublePrecision('longitude'), // arrondie à 3 décimales
  gravite: integer('gravite').notNull().default(2), // 1 | 2 | 3
  photo: text('photo'), // data URL ou chemin
  audio: text('audio'), // data URL ou chemin interne (jamais exposé publiquement)
  audioMime: varchar('audio_mime', { length: 64 }),
  contact: jsonb('contact').$type<ContactDB | null>(), // jamais exposé publiquement
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

/**
 * Suggestions issues de la voix ou de l'extraction de mots-clés.
 * Stockées à part du signalement citoyen et validées/corrigées par l'administrateur.
 */
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

/**
 * File de tâches (table de jobs PostgreSQL) pour la transcription et l'extraction.
 */
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
