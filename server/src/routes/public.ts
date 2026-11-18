import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { desc, eq } from 'drizzle-orm';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import {
  citizens,
  pointsLedger,
  reportConfirmations,
  reports,
  reportSuggestions,
  rewardsCatalog,
  type CategorieDB,
  type StatutDB,
} from '../db/schema.js';
import {
  chargerExemplesFictifsEnBase,
  genererAudioWavDemo,
  illustrationSvg,
  retirerExemplesFictifsDeBase,
  seedCatalogueRecompensesParDefaut,
} from '../db/seedData.js';
import { SUGGESTIONS_ACTEURS } from '../services/actors.js';
import { listerPayoutProviders } from '../services/payout.js';
import {
  appliquerReglesPointsSignalement,
  demanderOtpCitoyen,
  echangerPointsRecompense,
  obtenirClassementParQuartier,
  PLAFOND_QUOTIDIEN_POINTS,
  POINTS_PAR_SIGNALEMENT_VERIFIE,
  pointsGagnesAujourdHui,
  verifierOtpCitoyen,
} from '../services/points.js';
import { calculerPointsNoirsPredictifs } from '../services/prediction.js';
import {
  arrondirCoordonnee,
  genererCodeUnique,
  hacherAppareilAnonyme,
  versSignalementPublic,
} from '../services/serializer.js';
import { planifierJobTranscription } from '../services/transcription.js';
import {
  citizenOtpRequestSchema,
  citizenOtpVerifySchema,
  citizenRedeemSchema,
  confirmReportSchema,
  createReportSchema,
  resolutionFeedbackSchema,
} from '../validation/schemas.js';

export const publicRouter = Router();

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/x-m4a',
]);

const MAX_AUDIO_BYTES = 2 * 1024 * 1024; // 2 Mo max

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_BYTES,
    files: 1,
  },
});

const createReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 500 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de signalements envoyés depuis cette adresse. Réessayez dans quelques minutes.' },
});

function normaliserMimeAudio(mimeBrut: string): string {
  return mimeBrut.split(';')[0].trim().toLowerCase();
}

function extensionPourMime(mime: string): string {
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return '.m4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('wav')) return '.wav';
  return '.bin';
}

/* -------------------------------------------------------------------------- */
/* POST /api/reports — Création idempotente par UUID client                   */
/* -------------------------------------------------------------------------- */
publicRouter.post('/reports', createReportLimiter, async (req: Request, res: Response) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Données du signalement invalides.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const d = parsed.data;
  const db = await getDb();
  const clientUuid = d.id || crypto.randomUUID();

  // Idempotence : si l'UUID client existe déjà, renvoyer le signalement existant sans doublon
  const existants = await db.select().from(reports).where(eq(reports.id, clientUuid));
  if (existants.length > 0) {
    const tous = await db.select().from(reports);
    res.status(200).json(versSignalementPublic(existants[0], tous));
    return;
  }

  // Validation de l'audio en data URL s'il est fourni directement
  let audioStocke: string | null = null;
  let audioMime: string | null = null;
  if (d.audio) {
    const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i.exec(d.audio);
    if (!match) {
      res.status(400).json({ error: 'Format audio invalide.' });
      return;
    }
    const mime = normaliserMimeAudio(match[1]);
    if (!ALLOWED_AUDIO_MIMES.has(mime)) {
      res.status(400).json({ error: `Type MIME audio non autorisé (${mime}).` });
      return;
    }
    const buf = Buffer.from(match[2], 'base64');
    if (buf.byteLength > MAX_AUDIO_BYTES) {
      res.status(400).json({ error: 'La note vocale dépasse la taille maximale de 2 Mo (30 s max).' });
      return;
    }
    fs.mkdirSync(config.uploadDir, { recursive: true });
    const randomName = `${crypto.randomUUID()}${extensionPourMime(mime)}`;
    const fullPath = path.join(config.uploadDir, randomName);
    fs.writeFileSync(fullPath, buf);
    audioStocke = fullPath;
    audioMime = mime;
  }

  // Vérifier si le citizenId facultatif existe en base
  let citizenIdValide: string | null = null;
  if (d.citizenId) {
    const [cit] = await db.select({ id: citizens.id }).from(citizens).where(eq(citizens.id, d.citizenId));
    if (cit) citizenIdValide = cit.id;
  }

  const code = await genererCodeUnique(db, d.code);
  const dateCreation = d.dateCreation ? new Date(d.dateCreation) : new Date();
  const lat = arrondirCoordonnee(d.latitude);
  const lng = arrondirCoordonnee(d.longitude);

  const [cree] = await db
    .insert(reports)
    .values({
      id: clientUuid,
      code,
      categorie: d.categorie,
      description: d.description.trim(),
      secteur: d.secteur.trim(),
      latitude: lat,
      longitude: lng,
      gravite: d.gravite,
      photo: d.photo ?? null,
      audio: audioStocke,
      audioMime,
      contact: d.contact ?? null,
      statut: 'recu',
      estDoublon: false,
      confirmations: 0,
      confirmationHabitant: null,
      photoApres: null,
      enAttenteEnvoi: false,
      verifieParRelais: false,
      acteurCompetent: null,
      relanceNiveau: 'aucune',
      citizenId: citizenIdValide,
      pointsAttribues: 0, // Aucun point attribué avant vérification par l'admin ou un relais
      estMalveillant: false,
      historique: [
        {
          date: dateCreation.toISOString(),
          statut: 'recu',
          note: 'Signalement reçu par NIO FAR.',
        },
      ],
      estExemple: Boolean(d.estExemple),
      dateCreation,
      dateMiseAJour: dateCreation,
    })
    .returning();

  // Planifie la suggestion de transcription et d'extraction de catégorie sans jamais bloquer le signalement
  void planifierJobTranscription(cree.id, d.langueIndice).catch(() => {
    /* Le signalement reste valide même si la file de transcription échoue */
  });

  const tous = await db.select().from(reports);
  res.status(201).json(versSignalementPublic(cree, tous));
});

/* -------------------------------------------------------------------------- */
/* GET /api/reports — Lecture publique SANS contact ni audio                  */
/* -------------------------------------------------------------------------- */
publicRouter.get('/reports', async (req: Request, res: Response) => {
  const db = await getDb();
  const tous = await db.select().from(reports).orderBy(desc(reports.dateCreation));

  const codeFiltre = typeof req.query.code === 'string' ? req.query.code.trim().toUpperCase() : '';
  const secteurFiltre = typeof req.query.secteur === 'string' ? req.query.secteur.trim().toLowerCase() : '';
  const catsFiltre =
    typeof req.query.categories === 'string' && req.query.categories.trim()
      ? (req.query.categories.split(',').map((x) => x.trim()) as CategorieDB[])
      : typeof req.query.categorie === 'string' && req.query.categorie.trim()
        ? ([req.query.categorie.trim()] as CategorieDB[])
        : [];
  const statutsFiltre =
    typeof req.query.statuts === 'string' && req.query.statuts.trim()
      ? (req.query.statuts.split(',').map((x) => x.trim()) as StatutDB[])
      : typeof req.query.statut === 'string' && req.query.statut.trim()
        ? ([req.query.statut.trim()] as StatutDB[])
        : [];
  const similairesSeulement = req.query.similaires === '1' || req.query.similaires === 'true';

  const filtres = tous
    .filter((s) => !codeFiltre || s.code.toUpperCase() === codeFiltre)
    .filter((s) => !secteurFiltre || s.secteur.toLowerCase().includes(secteurFiltre))
    .filter((s) => catsFiltre.length === 0 || catsFiltre.includes(s.categorie))
    .filter((s) => statutsFiltre.length === 0 || statutsFiltre.includes(s.statut))
    .filter((s) => !similairesSeulement || (!s.estDoublon && !(s.statut === 'resolu' && s.confirmationHabitant !== false)))
    .map((s) => versSignalementPublic(s, tous));

  if (similairesSeulement) {
    filtres.sort((a, b) => b.priorite - a.priorite);
  }

  res.json(filtres);
});

/* -------------------------------------------------------------------------- */
/* GET /api/reports/track/:code — Suivi par code NF-XXXXX                     */
/* -------------------------------------------------------------------------- */
publicRouter.get('/reports/track/:code', async (req: Request, res: Response) => {
  const brut = String(req.params.code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const corps = brut.startsWith('NF') ? brut.slice(2) : brut;
  if (corps.length !== 5) {
    res.status(400).json({ error: 'Format de code invalide. Exemple attendu : NF-23456.' });
    return;
  }
  const codeNorm = `NF-${corps}`;

  const db = await getDb();
  const [trouve] = await db.select().from(reports).where(eq(reports.code, codeNorm));
  if (!trouve) {
    res.status(404).json({ error: `Aucun signalement trouvé pour le code ${codeNorm}.` });
    return;
  }
  const tous = await db.select().from(reports);
  res.json(versSignalementPublic(trouve, tous));
});

/* -------------------------------------------------------------------------- */
/* POST /api/reports/examples & DELETE /api/reports/examples (Démo)           */
/* -------------------------------------------------------------------------- */
publicRouter.post('/reports/examples', async (_req: Request, res: Response) => {
  const nb = await chargerExemplesFictifsEnBase();
  res.json({ ajoutes: nb });
});

publicRouter.delete('/reports/examples', async (_req: Request, res: Response) => {
  const nb = await retirerExemplesFictifsDeBase();
  res.json({ supprimes: nb });
});

/* -------------------------------------------------------------------------- */
/* GET /api/reports/:id — Lecture publique d'un signalement                   */
/* -------------------------------------------------------------------------- */
publicRouter.get('/reports/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Identifiant de signalement invalide.' });
    return;
  }

  const db = await getDb();
  const [trouve] = await db.select().from(reports).where(eq(reports.id, id));
  if (!trouve) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }
  const tous = await db.select().from(reports);
  res.json(versSignalementPublic(trouve, tous));
});

/* -------------------------------------------------------------------------- */
/* POST /api/reports/:id/confirm — « Je confirme ce problème » (1x/appareil)  */
/* -------------------------------------------------------------------------- */
publicRouter.post('/reports/:id/confirm', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }

  const parsed = confirmReportSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Requête de confirmation invalide.' });
    return;
  }

  const headerDevice = req.headers['x-device-id'] as string | undefined;
  const rawDeviceId =
    parsed.data.deviceId ||
    headerDevice ||
    `${req.ip || 'anon'}-${req.headers['user-agent'] || 'ua'}`;
  const deviceHash = hacherAppareilAnonyme(rawDeviceId);

  const db = await getDb();
  const [cible] = await db.select().from(reports).where(eq(reports.id, id));
  if (!cible) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }

  const existantes = await db
    .select()
    .from(reportConfirmations)
    .where(eq(reportConfirmations.reportId, id));

  if (existantes.some((c) => c.deviceHash === deviceHash)) {
    res.status(409).json({
      error: 'Vous avez déjà confirmé ce problème depuis cet appareil.',
    });
    return;
  }

  await db.insert(reportConfirmations).values({
    id: crypto.randomUUID(),
    reportId: id,
    deviceHash,
  });

  const nouveauTotal = cible.confirmations + 1;
  const [maj] = await db
    .update(reports)
    .set({
      confirmations: nouveauTotal,
      dateMiseAJour: new Date(),
    })
    .where(eq(reports.id, id))
    .returning();

  const tous = await db.select().from(reports);
  res.json(versSignalementPublic(maj, tous));
});

/* -------------------------------------------------------------------------- */
/* POST /api/reports/:id/resolution-feedback — « réglé » ou « toujours là »   */
/* -------------------------------------------------------------------------- */
publicRouter.post('/reports/:id/resolution-feedback', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }

  const parsed = resolutionFeedbackSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Réponse de vérification invalide.' });
    return;
  }

  const estRegle =
    typeof parsed.data.regle === 'boolean'
      ? parsed.data.regle
      : parsed.data.verdict === 'regle';

  const db = await getDb();
  const [cible] = await db.select().from(reports).where(eq(reports.id, id));
  if (!cible) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }

  const maintenant = new Date();
  const iso = maintenant.toISOString();

  const nouveauStatut: StatutDB = estRegle ? 'resolu' : 'a_verifier';
  const note = estRegle
    ? 'Résolution confirmée par un habitant.'
    : 'Un habitant signale que le problème est toujours là.';

  const [maj] = await db
    .update(reports)
    .set({
      statut: nouveauStatut,
      confirmationHabitant: estRegle,
      dateMiseAJour: maintenant,
      historique: [...cible.historique, { date: iso, statut: nouveauStatut, note }],
    })
    .where(eq(reports.id, id))
    .returning();

  const tous = await db.select().from(reports);
  res.json(versSignalementPublic(maj, tous));
});

/* -------------------------------------------------------------------------- */
/* POST /api/reports/:id/audio — Upload audio (30 s, 2 Mo max, MIME validés)  */
/* -------------------------------------------------------------------------- */
publicRouter.post(
  '/reports/:id/audio',
  (req, res, next) => {
    uploadAudio.single('audio')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Le fichier audio dépasse la limite de 2 Mo (30 secondes max).' });
        return;
      }
      if (err) {
        res.status(400).json({ error: 'Erreur lors du téléversement audio.' });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      res.status(400).json({ error: 'Identifiant invalide.' });
      return;
    }

    const db = await getDb();
    const [cible] = await db.select().from(reports).where(eq(reports.id, id));
    if (!cible) {
      res.status(404).json({ error: 'Signalement introuvable.' });
      return;
    }

    let buffer: Buffer | null = null;
    let mime = '';
    const dureeSec = Number(req.body?.duration || req.body?.duree || 0);
    if (dureeSec > 30.5) {
      res.status(400).json({ error: 'La note vocale ne doit pas dépasser 30 secondes.' });
      return;
    }

    if (req.file) {
      mime = normaliserMimeAudio(req.file.mimetype);
      buffer = req.file.buffer;
    } else if (typeof req.body?.audio === 'string') {
      const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i.exec(req.body.audio);
      if (match) {
        mime = normaliserMimeAudio(match[1]);
        buffer = Buffer.from(match[2], 'base64');
      }
    }

    if (!buffer || buffer.byteLength === 0) {
      res.status(400).json({ error: 'Aucun fichier audio valide fourni.' });
      return;
    }
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      res.status(400).json({ error: 'Le fichier audio dépasse la limite de 2 Mo.' });
      return;
    }
    if (!ALLOWED_AUDIO_MIMES.has(mime)) {
      res.status(400).json({
        error: `Type MIME audio non autorisé (${mime || 'inconnu'}). Formats acceptés : WebM, Ogg, MP4/M4A, MP3, WAV.`,
      });
      return;
    }

    fs.mkdirSync(config.uploadDir, { recursive: true });
    const randomFilename = `${crypto.randomUUID()}${extensionPourMime(mime)}`;
    const filePath = path.join(config.uploadDir, randomFilename);
    fs.writeFileSync(filePath, buffer);

    const [maj] = await db
      .update(reports)
      .set({
        audio: filePath,
        audioMime: mime,
        dateMiseAJour: new Date(),
      })
      .where(eq(reports.id, id))
      .returning();

    const langueIndice = req.body?.langue === 'wo' ? 'wo' : 'fr';
    const jobId = await planifierJobTranscription(id, langueIndice);

    const tous = await db.select().from(reports);
    res.status(201).json({
      report: versSignalementPublic(maj, tous),
      jobId,
      message: 'Note vocale enregistrée avec succès. Une suggestion de transcription a été planifiée.',
    });
  },
);

/* -------------------------------------------------------------------------- */
/* GET /api/public/hotspots — Urbanisme prédictif (« Points noirs »)          */
/* -------------------------------------------------------------------------- */
publicRouter.get('/public/hotspots', async (_req: Request, res: Response) => {
  const rapport = await calculerPointsNoirsPredictifs();
  res.json(rapport);
});

/* -------------------------------------------------------------------------- */
/* GET /api/public/leaderboard — Classement citoyen PAR QUARTIER              */
/* -------------------------------------------------------------------------- */
publicRouter.get('/public/leaderboard', async (_req: Request, res: Response) => {
  const classement = await obtenirClassementParQuartier();
  res.json(classement);
});

/* -------------------------------------------------------------------------- */
/* GET /api/public/rewards — Catalogue de récompenses (mode simulation)       */
/* -------------------------------------------------------------------------- */
publicRouter.get('/public/rewards', async (_req: Request, res: Response) => {
  const db = await getDb();
  await seedCatalogueRecompensesParDefaut(db);
  const items = await db.select().from(rewardsCatalog).orderBy(rewardsCatalog.pointsRequis);
  res.json({
    mention: 'Récompenses en cours de lancement',
    modePaiement: 'SIMULATION',
    avertissement:
      'Aucun partenariat financier ni sponsor RSE n’est actif. Le branchement Wave et Orange Money fonctionne exclusivement en MODE SIMULATION.',
    providers: listerPayoutProviders(),
    items: items.filter((r) => r.actif),
  });
});

/* -------------------------------------------------------------------------- */
/* Compte citoyen FACULTATIF (OTP téléphone) uniquement pour gagner des points*/
/* -------------------------------------------------------------------------- */
publicRouter.post('/citizen/otp/request', async (req: Request, res: Response) => {
  const parsed = citizenOtpRequestSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Numéro de téléphone invalide.' });
    return;
  }
  const resultat = await demanderOtpCitoyen({
    telephone: parsed.data.telephone,
    secteur: parsed.data.secteur,
  });
  res.json({
    ...resultat,
    mention: 'Compte citoyen facultatif — le signalement anonyme reste toujours possible et prioritaire.',
  });
});

publicRouter.post('/citizen/otp/verify', async (req: Request, res: Response) => {
  const parsed = citizenOtpVerifySchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Code OTP à 6 chiffres requis.' });
    return;
  }
  try {
    const citoyen = await verifierOtpCitoyen({
      telephone: parsed.data.telephone,
      code: parsed.data.code,
      secteur: parsed.data.secteur,
    });
    const db = await getDb();
    const journal = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.citizenId, citoyen.id))
      .orderBy(desc(pointsLedger.createdAt));
    const gagneJour = await pointsGagnesAujourdHui(citoyen.id, new Date(), db);

    res.json({
      citizen: {
        id: citoyen.id,
        telephoneMasque: citoyen.telephoneMasque,
        secteur: citoyen.secteur,
        pointsBalance: citoyen.pointsBalance,
        pointsGagnesAujourdHui: gagneJour,
        plafondQuotidien: PLAFOND_QUOTIDIEN_POINTS,
        pointsParSignalementVerifie: POINTS_PAR_SIGNALEMENT_VERIFIE,
      },
      ledger: journal.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Vérification OTP échouée.' });
  }
});

publicRouter.get('/citizen/:id/profile', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Identifiant citoyen invalide.' });
    return;
  }
  const db = await getDb();
  const [citoyen] = await db.select().from(citizens).where(eq(citizens.id, id));
  if (!citoyen) {
    res.status(404).json({ error: 'Compte citoyen introuvable.' });
    return;
  }
  const journal = await db
    .select()
    .from(pointsLedger)
    .where(eq(pointsLedger.citizenId, citoyen.id))
    .orderBy(desc(pointsLedger.createdAt));
  const gagneJour = await pointsGagnesAujourdHui(citoyen.id, new Date(), db);

  res.json({
    citizen: {
      id: citoyen.id,
      telephoneMasque: citoyen.telephoneMasque,
      secteur: citoyen.secteur,
      pointsBalance: citoyen.pointsBalance,
      pointsGagnesAujourdHui: gagneJour,
      plafondQuotidien: PLAFOND_QUOTIDIEN_POINTS,
      pointsParSignalementVerifie: POINTS_PAR_SIGNALEMENT_VERIFIE,
    },
    ledger: journal.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

publicRouter.post('/citizen/redeem', async (req: Request, res: Response) => {
  const parsed = citizenRedeemSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Paramètres d’échange invalides.' });
    return;
  }
  try {
    const resultat = await echangerPointsRecompense(parsed.data);
    res.json(resultat);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Échange impossible.' });
  }
});

/* -------------------------------------------------------------------------- */
/* MODE DÉMO GUIDÉ EN 5 TEMPS (/api/demo/scenario)                            */
/* -------------------------------------------------------------------------- */
const DEMO_SCENARIO_ID = '00000000-0000-4000-8000-000000000099';
const DEMO_SCENARIO_CODE = 'NF-DEMO5';

publicRouter.post('/demo/scenario/step', async (req: Request, res: Response) => {
  const step = Number(req.body?.step || 1);
  const citizenId = typeof req.body?.citizenId === 'string' ? req.body.citizenId : null;
  const db = await getDb();

  // S'assurer que les exemples fictifs de base sont chargés
  await chargerExemplesFictifsEnBase(db);

  const maintenant = new Date();
  const iso = maintenant.toISOString();

  if (step === 1) {
    // Temps 1 : Un habitant signale par la voix (étiqueté « Exemple fictif »)
    await db.delete(reports).where(eq(reports.id, DEMO_SCENARIO_ID));

    const [cree] = await db
      .insert(reports)
      .values({
        id: DEMO_SCENARIO_ID,
        code: DEMO_SCENARIO_CODE,
        categorie: 'eau_stagnante',
        description:
          'Exemple fictif (Mode démo — signalement vocal) : grand caniveau bouché par des déchets et eau stagnante devant le marché de Pikine.',
        secteur: 'Pikine',
        latitude: 14.755,
        longitude: -17.39,
        gravite: 3,
        photo: illustrationSvg('eau_stagnante', false),
        audio: genererAudioWavDemo(),
        audioMime: 'audio/wav',
        contact: null,
        statut: 'recu',
        estDoublon: false,
        confirmations: 3,
        confirmationHabitant: null,
        photoApres: null,
        enAttenteEnvoi: false,
        verifieParRelais: false,
        acteurCompetent: null,
        relanceNiveau: 'aucune',
        citizenId,
        pointsAttribues: 0,
        estMalveillant: false,
        historique: [
          {
            date: iso,
            statut: 'recu',
            note: 'Temps 1 (Mode démo — Exemple fictif) : signalement vocal envoyé par un habitant.',
          },
        ],
        estExemple: true,
        dateCreation: maintenant,
        dateMiseAJour: maintenant,
      })
      .returning();

    await db.insert(reportSuggestions).values({
      id: crypto.randomUUID(),
      reportId: cree.id,
      transcriptionSuggeree:
        'Grand caniveau bouché par des déchets et eau stagnante devant le marché de Pikine (suggestion vocale — exemple fictif).',
      langueDetectee: 'fr',
      confianceTranscription: 0.86,
      fournisseurTranscription: 'Whisper (Français — suggestion démo)',
      avertissementTranscription: 'Suggestion vocale à vérifier par un administrateur humain.',
      categorieSuggeree: 'eau_stagnante',
      motsClesTrouves: ['caniveau', 'eau', 'stagnante', 'déchets'],
      sourceCategorie: 'mots_cles',
      statutValidation: 'en_attente',
    });

    const tous = await db.select().from(reports);
    res.json({
      step: 1,
      titre: '1/5 — Un habitant signale par la voix',
      explication:
        'Note vocale de 30 s enregistrée à Pikine (code NF-DEMO5, étiqueté « Exemple fictif »). Aucune transcription automatique n’est prise pour vérité sans écoute humaine.',
      report: versSignalementPublic(cree, tous),
    });
    return;
  }

  // Si le signalement démo n'existe pas encore, le créer avant d'enchaîner
  let [cible] = await db.select().from(reports).where(eq(reports.id, DEMO_SCENARIO_ID));
  if (!cible) {
    await db.insert(reports).values({
      id: DEMO_SCENARIO_ID,
      code: DEMO_SCENARIO_CODE,
      categorie: 'eau_stagnante',
      description:
        'Exemple fictif (Mode démo — signalement vocal) : grand caniveau bouché par des déchets et eau stagnante devant le marché de Pikine.',
      secteur: 'Pikine',
      latitude: 14.755,
      longitude: -17.39,
      gravite: 3,
      photo: illustrationSvg('eau_stagnante', false),
      audio: genererAudioWavDemo(),
      audioMime: 'audio/wav',
      statut: 'recu',
      confirmations: 3,
      citizenId,
      historique: [{ date: iso, statut: 'recu', note: 'Signalement reçu (Exemple fictif).' }],
      estExemple: true,
    });
    [cible] = await db.select().from(reports).where(eq(reports.id, DEMO_SCENARIO_ID));
  }

  if (step === 2) {
    // Temps 2 : L'admin ou le relais vérifie (+ attribution des points citoyens si compte lié)
    const [maj] = await db
      .update(reports)
      .set({
        statut: 'a_verifier',
        verifieParRelais: true,
        dateMiseAJour: maintenant,
        historique: [
          ...cible.historique,
          {
            date: iso,
            statut: 'a_verifier',
            note: 'Temps 2 (Mode démo) : écoute humaine de la note vocale et vérification terrain confirmée par un relais.',
            auteur: 'Administrateur NIO FAR (Démo)',
          },
        ],
      })
      .where(eq(reports.id, DEMO_SCENARIO_ID))
      .returning();

    const pointsResult = await appliquerReglesPointsSignalement({
      reportId: DEMO_SCENARIO_ID,
      acteurNom: 'Administrateur NIO FAR (Démo)',
      maintenant,
      db,
    });

    const [relue] = await db.select().from(reports).where(eq(reports.id, DEMO_SCENARIO_ID));
    const tous = await db.select().from(reports);
    res.json({
      step: 2,
      titre: '2/5 — L’admin écoute et vérifie le signalement',
      explication: `L’administrateur écoute l’audio, valide la transcription suggérée et confirme la vérification terrain.${pointsResult.delta > 0 ? ` +${pointsResult.delta} points citoyens attribués après vérification.` : ''}`,
      report: versSignalementPublic(relue ?? maj, tous),
    });
    return;
  }

  if (step === 3) {
    // Temps 3 : Le statut passe à « transmis » (acteur compétent suggéré affiché : ONAS)
    const acteurSuggere = SUGGESTIONS_ACTEURS[cible.categorie];
    const [maj] = await db
      .update(reports)
      .set({
        statut: 'transmis',
        verifieParRelais: true,
        acteurCompetent: acteurSuggere,
        dateMiseAJour: maintenant,
        historique: [
          ...cible.historique,
          {
            date: iso,
            statut: 'transmis',
            note: `Temps 3 (Mode démo) : transmis à l’acteur compétent suggéré (${acteurSuggere}) avec photo « après » en préparation.`,
            auteur: 'Administrateur NIO FAR (Démo)',
          },
        ],
      })
      .where(eq(reports.id, DEMO_SCENARIO_ID))
      .returning();

    const tous = await db.select().from(reports);
    res.json({
      step: 3,
      titre: `3/5 — Statut « Transmis » (acteur suggéré : ${acteurSuggere})`,
      explication: `Le signalement passe à « Transmis » avec l’acteur compétent suggéré (${acteurSuggere}). Si aucune mise à jour n’intervient sous 3 ou 7 jours, une alerte de relance J+3 / J+7 est proposée à l’admin.`,
      report: versSignalementPublic(maj, tous),
    });
    return;
  }

  if (step === 4) {
    // Temps 4 : Photo « après » + l'habitant confirme la résolution
    const [maj] = await db
      .update(reports)
      .set({
        statut: 'resolu',
        verifieParRelais: true,
        acteurCompetent: SUGGESTIONS_ACTEURS[cible.categorie],
        photoApres: illustrationSvg('eau_stagnante', true),
        confirmationHabitant: true,
        dateMiseAJour: maintenant,
        historique: [
          ...cible.historique,
          {
            date: iso,
            statut: 'en_cours',
            note: 'Intervention de curage effectuée et photo « après » téléversée (Exemple fictif).',
            auteur: 'Administrateur NIO FAR (Démo)',
          },
          {
            date: iso,
            statut: 'resolu',
            note: 'Temps 4 (Mode démo) : l’habitant confirme « Oui, le problème est vraiment réglé » après la photo « après ».',
          },
        ],
      })
      .where(eq(reports.id, DEMO_SCENARIO_ID))
      .returning();

    const tous = await db.select().from(reports);
    res.json({
      step: 4,
      titre: '4/5 — L’habitant confirme la résolution après la photo « après »',
      explication:
        'Conformément à la règle métier, le passage en « Résolu » est appuyé par la photo « après » ET la confirmation citoyenne « Oui, réglé ».',
      report: versSignalementPublic(maj, tous),
    });
    return;
  }

  // Temps 5 : Les indicateurs de transparence et la carte « Points noirs » se mettent à jour en direct
  const tous = await db.select().from(reports);
  const [actuel] = await db.select().from(reports).where(eq(reports.id, DEMO_SCENARIO_ID));
  const hotspots = await calculerPointsNoirsPredictifs({ db });
  const classement = await obtenirClassementParQuartier(db);

  res.json({
    step: 5,
    titre: '5/5 — Indicateurs de transparence & carte « Points noirs » mis à jour en direct',
    explication:
      'Le taux de résolution vérifiée, le classement collectif par quartier et la carte prédictive « Points noirs » (croisée avec Open-Meteo Dakar) sont actualisés en temps réel.',
    report: actuel ? versSignalementPublic(actuel, tous) : null,
    hotspotsResume: {
      secteursActifs: hotspots.secteurs.filter((s) => s.donneesSuffisantes).length,
      secteursInsuffisants: hotspots.secteurs.filter((s) => !s.donneesSuffisantes).length,
      aAnticiperCount: hotspots.aAnticiper.length,
    },
    topQuartier: classement.quartiers[0] ?? null,
  });
});

publicRouter.post('/demo/scenario/reset', async (_req: Request, res: Response) => {
  const db = await getDb();
  await db.delete(reports).where(eq(reports.id, DEMO_SCENARIO_ID));
  await retirerExemplesFictifsDeBase(db);
  const ajoutes = await chargerExemplesFictifsEnBase(db);
  res.json({
    ok: true,
    ajoutes,
    message: 'Mode démo réinitialisé : tous les exemples étiquetés « Exemple fictif » ont été restaurés à leur état initial.',
  });
});

/* -------------------------------------------------------------------------- */
/* GET /api/public/stats — Indicateurs publics de transparence                */
/* -------------------------------------------------------------------------- */
function calculerMediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  const mid = Math.floor(tri.length / 2);
  const med = tri.length % 2 === 0 ? (tri[mid - 1] + tri[mid]) / 2 : tri[mid];
  return Math.round(med * 10) / 10;
}

publicRouter.get('/public/stats', async (_req: Request, res: Response) => {
  const db = await getDb();
  const liste = await db.select().from(reports);

  const parStatut: Record<StatutDB, number> = {
    recu: 0,
    a_verifier: 0,
    transmis: 0,
    en_cours: 0,
    resolu: 0,
  };
  const parCategorie: Record<CategorieDB, number> = {
    dechets: 0,
    eau_stagnante: 0,
    eclairage: 0,
    voirie: 0,
  };
  const parSecteur: Record<string, { total: number; resolus: number; aTraiter: number }> = {};

  const delaisVerificationHeures: number[] = [];
  const delaisResolutionJours: number[] = [];
  let totalConfirmations = 0;
  let resolusConfirmes = 0;
  let resolusContestes = 0;
  let resolusVerifies = 0;

  for (const s of liste) {
    parStatut[s.statut] = (parStatut[s.statut] ?? 0) + 1;
    parCategorie[s.categorie] = (parCategorie[s.categorie] ?? 0) + 1;

    if (!parSecteur[s.secteur]) {
      parSecteur[s.secteur] = { total: 0, resolus: 0, aTraiter: 0 };
    }
    parSecteur[s.secteur].total += 1;
    if (s.statut === 'resolu') parSecteur[s.secteur].resolus += 1;
    else parSecteur[s.secteur].aTraiter += 1;

    totalConfirmations += s.confirmations;
    if (s.confirmationHabitant === true) resolusConfirmes += 1;
    if (s.confirmationHabitant === false) resolusContestes += 1;
    if (s.statut === 'resolu' && (Boolean(s.photoApres) || s.confirmationHabitant === true)) {
      resolusVerifies += 1;
    }

    const premiereVerif = s.historique.find((h) => h.statut !== 'recu');
    if (premiereVerif) {
      const h = (new Date(premiereVerif.date).getTime() - new Date(s.dateCreation).getTime()) / 3_600_000;
      if (h >= 0) delaisVerificationHeures.push(h);
    }

    const entreeResolu = s.historique.find((h) => h.statut === 'resolu');
    if (entreeResolu) {
      const j = (new Date(entreeResolu.date).getTime() - new Date(s.dateCreation).getTime()) / 86_400_000;
      if (j >= 0) delaisResolutionJours.push(j);
    }
  }

  const total = liste.length;
  const tauxResolutionVerifiee = total > 0 ? Math.round((resolusVerifies / total) * 1000) / 10 : 0;
  const delaiMedianPremiereVerificationHeures = calculerMediane(delaisVerificationHeures);
  const delaiMedianPremiereVerificationJours =
    delaiMedianPremiereVerificationHeures !== null
      ? Math.round((delaiMedianPremiereVerificationHeures / 24) * 10) / 10
      : null;
  const delaiMoyenResolutionJours =
    delaisResolutionJours.length > 0
      ? Math.round((delaisResolutionJours.reduce((a, b) => a + b, 0) / delaisResolutionJours.length) * 10) / 10
      : null;

  res.json({
    total,
    tauxResolutionVerifiee,
    resolusVerifies,
    resolusConfirmes,
    resolusContestes,
    delaiMedianPremiereVerificationHeures,
    delaiMedianPremiereVerificationJours,
    delaiMoyenResolutionJours,
    parStatut,
    parCategorie,
    parSecteur,
    totalConfirmations,
    contientExemples: liste.some((s) => s.estExemple),
  });
});

/* -------------------------------------------------------------------------- */
/* GET /api/public/open-data.json & .csv — SANS description, photo, audio, contact */
/* -------------------------------------------------------------------------- */
type OpenDataRow = {
  id: string;
  code: string;
  categorie: CategorieDB;
  secteur: string;
  latitude: number | null;
  longitude: number | null;
  gravite: number;
  statut: StatutDB;
  confirmations: number;
  confirmationHabitant: boolean | null;
  verifieParRelais: boolean;
  estDoublon: boolean;
  dateCreation: string;
  estExemple: boolean;
};

async function extraireOpenData(): Promise<OpenDataRow[]> {
  const db = await getDb();
  const liste = await db.select().from(reports).orderBy(desc(reports.dateCreation));
  return liste.map((r) => ({
    id: r.id,
    code: r.code,
    categorie: r.categorie,
    secteur: r.secteur,
    latitude: arrondirCoordonnee(r.latitude),
    longitude: arrondirCoordonnee(r.longitude),
    gravite: r.gravite,
    statut: r.statut,
    confirmations: r.confirmations,
    confirmationHabitant: r.confirmationHabitant ?? null,
    verifieParRelais: r.verifieParRelais,
    estDoublon: r.estDoublon,
    dateCreation: r.dateCreation.toISOString(),
    estExemple: r.estExemple,
  }));
}

publicRouter.get('/public/open-data.json', async (_req: Request, res: Response) => {
  const donnees = await extraireOpenData();
  res.setHeader('Content-Disposition', 'attachment; filename="nio-far-open-data.json"');
  res.json({
    licence: 'Open Data Citoyen NIO FAR — Sans données personnelles ni descriptions libres',
    exportDate: new Date().toISOString(),
    count: donnees.length,
    signalements: donnees,
  });
});

function echapperCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

publicRouter.get('/public/open-data.csv', async (_req: Request, res: Response) => {
  const donnees = await extraireOpenData();
  const entetes: (keyof OpenDataRow)[] = [
    'id',
    'code',
    'categorie',
    'secteur',
    'latitude',
    'longitude',
    'gravite',
    'statut',
    'confirmations',
    'confirmationHabitant',
    'verifieParRelais',
    'estDoublon',
    'dateCreation',
    'estExemple',
  ];
  const lignes = [
    entetes.join(','),
    ...donnees.map((row) => entetes.map((col) => echapperCsv(row[col])).join(',')),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="nio-far-open-data.csv"');
  res.send(lignes.join('\n'));
});
