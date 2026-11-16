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
  reportConfirmations,
  reports,
  type CategorieDB,
  type StatutDB,
} from '../db/schema.js';
import { chargerExemplesFictifsEnBase, retirerExemplesFictifsDeBase } from '../db/seedData.js';
import {
  arrondirCoordonnee,
  genererCodeUnique,
  hacherAppareilAnonyme,
  versSignalementPublic,
} from '../services/serializer.js';
import { planifierJobTranscription } from '../services/transcription.js';
import {
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
  max: process.env.NODE_ENV === 'test' ? 500 : 30,
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
      historique: [
        {
          date: dateCreation.toISOString(),
          statut: 'recu',
          note: 'Signalement reçu par NIO FAR.',
        },
      ],
      estExemple: false,
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

    // Délai avant la première vérification (passage à a_verifier, transmis, en_cours ou resolu)
    const premiereVerif = s.historique.find((h) => h.statut !== 'recu');
    if (premiereVerif) {
      const h = (new Date(premiereVerif.date).getTime() - new Date(s.dateCreation).getTime()) / 3_600_000;
      if (h >= 0) delaisVerificationHeures.push(h);
    }

    // Délai avant résolution
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
