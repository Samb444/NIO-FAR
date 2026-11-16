CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "email" varchar(160) NOT NULL UNIQUE,
  "nom" varchar(120) NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar(20) NOT NULL DEFAULT 'relais',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY NOT NULL,
  "code" varchar(16) NOT NULL UNIQUE,
  "categorie" varchar(32) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "secteur" varchar(80) NOT NULL,
  "latitude" double precision,
  "longitude" double precision,
  "gravite" integer NOT NULL DEFAULT 2,
  "photo" text,
  "audio" text,
  "audio_mime" varchar(64),
  "contact" jsonb,
  "statut" varchar(24) NOT NULL DEFAULT 'recu',
  "est_doublon" boolean NOT NULL DEFAULT false,
  "doublon_de_id" uuid,
  "confirmations" integer NOT NULL DEFAULT 0,
  "confirmation_habitant" boolean,
  "photo_apres" text,
  "en_attente_envoi" boolean NOT NULL DEFAULT false,
  "verifie_par_relais" boolean NOT NULL DEFAULT false,
  "acteur_competent" varchar(160),
  "relance_niveau" varchar(16) NOT NULL DEFAULT 'aucune',
  "relance_date" timestamptz,
  "relance_validee_admin" boolean NOT NULL DEFAULT false,
  "historique" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "est_exemple" boolean NOT NULL DEFAULT false,
  "date_creation" timestamptz NOT NULL DEFAULT now(),
  "date_mise_a_jour" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "report_confirmations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "report_id" uuid NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
  "device_hash" varchar(128) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "report_device_unique_idx" ON "report_confirmations" ("report_id", "device_hash");

CREATE TABLE IF NOT EXISTS "report_suggestions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "report_id" uuid NOT NULL UNIQUE REFERENCES "reports"("id") ON DELETE CASCADE,
  "transcription_suggeree" text NOT NULL DEFAULT '',
  "langue_detectee" varchar(16) NOT NULL DEFAULT 'fr',
  "confiance_transcription" double precision NOT NULL DEFAULT 0,
  "fournisseur_transcription" varchar(80) NOT NULL DEFAULT 'aucun',
  "avertissement_transcription" text,
  "categorie_suggeree" varchar(32),
  "mots_cles_trouves" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "source_categorie" varchar(32) NOT NULL DEFAULT 'mots_cles',
  "statut_validation" varchar(24) NOT NULL DEFAULT 'en_attente',
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "transcription_jobs" (
  "id" uuid PRIMARY KEY NOT NULL,
  "report_id" uuid NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
  "langue_indice" varchar(16) NOT NULL DEFAULT 'fr',
  "statut" varchar(24) NOT NULL DEFAULT 'en_attente',
  "tentatives" integer NOT NULL DEFAULT 0,
  "erreur" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
