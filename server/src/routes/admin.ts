import crypto from 'node:crypto';
import fs from 'node:fs';
import { Router, type Request, type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import {
  citizens,
  payoutRequests,
  pointsLedger,
  reports,
  reportSuggestions,
  rewardsCatalog,
  transcriptionJobs,
  type StatutDB,
} from '../db/schema.js';
import { seedCatalogueRecompensesParDefaut } from '../db/seedData.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { SUGGESTIONS_ACTEURS, suggererActeurCompetent } from '../services/actors.js';
import { listerPayoutProviders } from '../services/payout.js';
import { appliquerReglesPointsSignalement } from '../services/points.js';
import { calculerPointsNoirsPredictifs } from '../services/prediction.js';
import { executerVerificationRelances } from '../services/reminders.js';
import {
  versSignalementAdmin,
  type SuggestionAPI,
} from '../services/serializer.js';
import { extraireSuggestionCategorie } from '../services/transcription.js';
import {
  adminDuplicatePatchSchema,
  adminStatusPatchSchema,
  rewardItemSchema,
} from '../validation/schemas.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);

function mapSuggestionRow(row: typeof reportSuggestions.$inferSelect | undefined): SuggestionAPI | null {
  if (!row) return null;
  return {
    transcriptionSuggeree: row.transcriptionSuggeree,
    langueDetectee: row.langueDetectee,
    confianceTranscription: row.confianceTranscription,
    fournisseurTranscription: row.fournisseurTranscription,
    avertissementTranscription: row.avertissementTranscription ?? null,
    categorieSuggeree: row.categorieSuggeree ?? null,
    motsClesTrouves: row.motsClesTrouves ?? [],
    sourceCategorie: row.sourceCategorie,
    statutValidation: row.statutValidation,
  };
}

/* -------------------------------------------------------------------------- */
/* GET /api/admin/actors — Table de suggestion par catégorie                  */
/* -------------------------------------------------------------------------- */
adminRouter.get('/actors', (_req: Request, res: Response) => {
  res.json({
    suggestionsParCategorie: SUGGESTIONS_ACTEURS,
    mention: 'Suggestion à confirmer ou modifier par l’administrateur.',
  });
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/hotspots — Urbanisme prédictif (« Points noirs »)           */
/* -------------------------------------------------------------------------- */
adminRouter.get('/hotspots', async (_req: Request, res: Response) => {
  const rapport = await calculerPointsNoirsPredictifs();
  res.json(rapport);
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/reports — Liste complète triée par priorité décroissante    */
/* -------------------------------------------------------------------------- */
adminRouter.get('/reports', async (_req: Request, res: Response) => {
  await executerVerificationRelances();
  const db = await getDb();
  const tous = await db.select().from(reports).orderBy(desc(reports.dateCreation));
  const suggestions = await db.select().from(reportSuggestions);
  const mapSug = new Map(suggestions.map((s) => [s.reportId, s]));

  const enrichis = tous.map((r) => versSignalementAdmin(r, tous, mapSuggestionRow(mapSug.get(r.id))));
  enrichis.sort((a, b) => b.priorite - a.priorite || b.dateCreation.localeCompare(a.dateCreation));

  res.json(enrichis);
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/reports/:id — Détail complet pour la fiche de gestion       */
/* -------------------------------------------------------------------------- */
adminRouter.get('/reports/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const db = await getDb();
  const [cible] = await db.select().from(reports).where(eq(reports.id, id));
  if (!cible) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }
  const tous = await db.select().from(reports);
  const [sug] = await db.select().from(reportSuggestions).where(eq(reportSuggestions.reportId, id));
  res.json(versSignalementAdmin(cible, tous, mapSuggestionRow(sug)));
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/reports/:id/audio — Écoute humaine protégée de l'audio      */
/* -------------------------------------------------------------------------- */
adminRouter.get('/reports/:id/audio', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const db = await getDb();
  const [cible] = await db.select().from(reports).where(eq(reports.id, id));
  if (!cible || !cible.audio) {
    res.status(404).json({ error: 'Aucune note vocale pour ce signalement.' });
    return;
  }

  if (cible.audio.startsWith('data:')) {
    const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i.exec(cible.audio);
    if (!match) {
      res.status(404).json({ error: 'Format audio invalide.' });
      return;
    }
    const buf = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', match[1]);
    res.send(buf);
    return;
  }

  if (!fs.existsSync(cible.audio)) {
    res.status(404).json({ error: 'Fichier audio introuvable sur le serveur.' });
    return;
  }

  res.setHeader('Content-Type', cible.audioMime || 'audio/webm');
  fs.createReadStream(cible.audio).pipe(res);
});

/* -------------------------------------------------------------------------- */
/* PATCH /api/admin/reports/:id/status — Statut + note + acteur + points      */
/* -------------------------------------------------------------------------- */
adminRouter.patch('/reports/:id/status', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }

  const parsed = adminStatusPatchSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Données de mise à jour invalides.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const d = parsed.data;
  const user = req.user!;
  const db = await getDb();
  const [cible] = await db.select().from(reports).where(eq(reports.id, id));
  if (!cible) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }

  // Règle des rôles : le rôle « relais » peut SEULEMENT marquer « vérifié sur place » et ajouter une note
  if (user.role === 'relais') {
    const statutDemande = d.statut;
    const changementStatutInterdit =
      statutDemande !== undefined && statutDemande !== cible.statut && statutDemande !== 'a_verifier';
    const autreChampAdmin =
      d.acteurCompetent !== undefined ||
      d.photoApres !== undefined ||
      d.confirmationHabitant !== undefined ||
      d.categorie !== undefined ||
      d.estMalveillant !== undefined;

    if (changementStatutInterdit || autreChampAdmin) {
      res.status(403).json({
        error:
          'Action refusée : le rôle « relais » peut uniquement marquer un signalement comme « vérifié sur place » et ajouter une note d’observation.',
      });
      return;
    }
  }

  const nouveauStatut: StatutDB =
    d.statut ?? (user.role === 'relais' && d.verifieParRelais && cible.statut === 'recu' ? 'a_verifier' : cible.statut);

  const nouvellePhotoApres = d.photoApres !== undefined ? d.photoApres : cible.photoApres;
  const nouvelleConfirmationHabitant =
    d.confirmationHabitant !== undefined ? d.confirmationHabitant : cible.confirmationHabitant;

  // RÈGLE MÉTIER OBLIGATOIRE : « resolu » exige une photo « après » OU confirmationHabitant = true
  if (nouveauStatut === 'resolu') {
    const aPhotoApres = Boolean(nouvellePhotoApres && nouvellePhotoApres.trim().length > 0);
    const aConfirmationHabitant = nouvelleConfirmationHabitant === true;
    if (!aPhotoApres && !aConfirmationHabitant) {
      res.status(400).json({
        error:
          'Passage en « Résolu » refusé : une photo « après » ou la confirmation de l’habitant (confirmationHabitant = true) est obligatoire.',
      });
      return;
    }
  }

  const nouvelleCategorie = d.categorie ?? cible.categorie;
  const { acteur: suggestionParDefaut } = suggererActeurCompetent(nouvelleCategorie);
  const nouvelActeur =
    d.acteurCompetent !== undefined
      ? d.acteurCompetent
      : cible.acteurCompetent ?? (nouveauStatut === 'transmis' ? suggestionParDefaut : null);

  const verifieParRelais =
    d.verifieParRelais !== undefined
      ? d.verifieParRelais
      : user.role === 'relais'
        ? true
        : cible.verifieParRelais;

  const estMalveillant = d.estMalveillant !== undefined ? d.estMalveillant : cible.estMalveillant;

  const maintenant = new Date();
  const noteTrim = d.note?.trim();
  const noteParDefaut = estMalveillant && !cible.estMalveillant
    ? 'Signalement classé comme malveillant / abusif par l’administrateur (retrait de points citoyens).'
    : user.role === 'relais'
      ? 'Vérifié sur place par un relais de quartier.'
      : `Statut mis à jour vers « ${nouveauStatut} »${nouvelActeur ? ` (acteur compétent : ${nouvelActeur})` : ''}.`;

  const ajouterEntree =
    nouveauStatut !== cible.statut ||
    Boolean(noteTrim) ||
    (d.verifieParRelais !== undefined && d.verifieParRelais !== cible.verifieParRelais) ||
    (d.estMalveillant !== undefined && d.estMalveillant !== cible.estMalveillant);

  const nouvelHistorique = ajouterEntree
    ? [
        ...cible.historique,
        {
          date: maintenant.toISOString(),
          statut: nouveauStatut,
          note: noteTrim || noteParDefaut,
          auteur: `${user.nom} (${user.role})`,
        },
      ]
    : cible.historique;

  await db
    .update(reports)
    .set({
      statut: nouveauStatut,
      categorie: nouvelleCategorie,
      acteurCompetent: nouvelActeur,
      verifieParRelais,
      estMalveillant,
      photoApres: nouvellePhotoApres,
      confirmationHabitant: nouvelleConfirmationHabitant,
      relanceNiveau: nouveauStatut !== cible.statut ? 'aucune' : cible.relanceNiveau,
      relanceValideeAdmin: false,
      historique: nouvelHistorique,
      dateMiseAJour: maintenant,
    })
    .where(eq(reports.id, id));

  // Attribution / retrait auditable des points citoyens APRÈS vérification par l'admin ou un relais
  await appliquerReglesPointsSignalement({
    reportId: id,
    acteurNom: `${user.nom} (${user.role})`,
    estMalveillant,
    maintenant,
    db,
  });

  // Mise à jour ou validation de la suggestion de transcription (stockée à part)
  if (d.transcriptionSuggeree !== undefined || d.validerSuggestion) {
    const [sugExist] = await db.select().from(reportSuggestions).where(eq(reportSuggestions.reportId, id));
    const texte = d.transcriptionSuggeree ?? sugExist?.transcriptionSuggeree ?? '';
    const extraction = await extraireSuggestionCategorie(texte);

    if (sugExist) {
      await db
        .update(reportSuggestions)
        .set({
          transcriptionSuggeree: texte,
          categorieSuggeree: extraction.categorie ?? sugExist.categorieSuggeree,
          motsClesTrouves: extraction.motsTrouves.length ? extraction.motsTrouves : sugExist.motsClesTrouves,
          statutValidation: d.transcriptionSuggeree !== undefined ? 'corrigee' : 'validee',
          updatedAt: maintenant,
        })
        .where(eq(reportSuggestions.reportId, id));
    } else {
      await db.insert(reportSuggestions).values({
        id: crypto.randomUUID(),
        reportId: id,
        transcriptionSuggeree: texte,
        langueDetectee: 'fr',
        confianceTranscription: 1,
        fournisseurTranscription: 'Validation humaine',
        categorieSuggeree: extraction.categorie,
        motsClesTrouves: extraction.motsTrouves,
        sourceCategorie: 'mots_cles',
        statutValidation: 'validee',
      });
    }
  }

  const [maj] = await db.select().from(reports).where(eq(reports.id, id));
  const tous = await db.select().from(reports);
  const [sugMaj] = await db.select().from(reportSuggestions).where(eq(reportSuggestions.reportId, id));
  res.json(versSignalementAdmin(maj, tous, mapSuggestionRow(sugMaj)));
});

/* -------------------------------------------------------------------------- */
/* PATCH /api/admin/reports/:id/duplicate — Marquage doublon (admin)          */
/* -------------------------------------------------------------------------- */
adminRouter.patch('/reports/:id/duplicate', requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const parsed = adminDuplicatePatchSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Données de doublon invalides.' });
    return;
  }

  const db = await getDb();
  const [cible] = await db.select().from(reports).where(eq(reports.id, id));
  if (!cible) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }

  const maintenant = new Date();
  const note =
    parsed.data.note?.trim() ||
    (parsed.data.estDoublon
      ? 'Signalement marqué comme doublon par l’administrateur (aucun point citoyen attribué).'
      : 'Marquage doublon retiré par l’administrateur.');

  await db
    .update(reports)
    .set({
      estDoublon: parsed.data.estDoublon,
      doublonDeId: parsed.data.doublonDeId ?? null,
      dateMiseAJour: maintenant,
      historique: [
        ...cible.historique,
        {
          date: maintenant.toISOString(),
          statut: cible.statut,
          note,
          auteur: `${req.user!.nom} (admin)`,
        },
      ],
    })
    .where(eq(reports.id, id));

  await appliquerReglesPointsSignalement({
    reportId: id,
    acteurNom: `${req.user!.nom} (admin)`,
    maintenant,
    db,
  });

  const [maj] = await db.select().from(reports).where(eq(reports.id, id));
  const tous = await db.select().from(reports);
  const [sug] = await db.select().from(reportSuggestions).where(eq(reportSuggestions.reportId, id));
  res.json(versSignalementAdmin(maj, tous, mapSuggestionRow(sug)));
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/reminders & POST /api/admin/reminders/:id/validate          */
/* -------------------------------------------------------------------------- */
adminRouter.get('/reminders', async (_req: Request, res: Response) => {
  const bilan = await executerVerificationRelances();
  const db = await getDb();
  const tous = await db.select().from(reports);
  const enRelance = tous
    .filter((r) => !r.estDoublon && (r.relanceNiveau === 'j3' || r.relanceNiveau === 'j7'))
    .map((r) => versSignalementAdmin(r, tous))
    .sort((a, b) => b.priorite - a.priorite);

  res.json({
    politique: 'Aucune relance n’est envoyée à une institution sans validation explicite de l’administrateur.',
    verification: bilan,
    totalRelances: enRelance.length,
    j3Count: enRelance.filter((r) => r.relanceNiveau === 'j3').length,
    j7Count: enRelance.filter((r) => r.relanceNiveau === 'j7').length,
    items: enRelance,
  });
});

adminRouter.post('/reminders/:id/validate', requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const db = await getDb();
  const [cible] = await db.select().from(reports).where(eq(reports.id, id));
  if (!cible) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }

  const maintenant = new Date();
  const acteur = cible.acteurCompetent || suggererActeurCompetent(cible.categorie).acteur;
  const label = cible.relanceNiveau === 'j7' ? 'Relance J+7' : 'Relance J+3';

  const [maj] = await db
    .update(reports)
    .set({
      relanceValideeAdmin: true,
      dateMiseAJour: maintenant,
      historique: [
        ...cible.historique,
        {
          date: maintenant.toISOString(),
          statut: cible.statut,
          note: `${label} validée par l’administrateur pour suivi auprès de : ${acteur}.`,
          auteur: `${req.user!.nom} (admin)`,
        },
      ],
    })
    .where(eq(reports.id, id))
    .returning();

  const tous = await db.select().from(reports);
  res.json(versSignalementAdmin(maj, tous));
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/points/ledger — Journal auditable des points citoyens       */
/* -------------------------------------------------------------------------- */
adminRouter.get('/points/ledger', async (_req: Request, res: Response) => {
  const db = await getDb();
  const entrees = await db.select().from(pointsLedger).orderBy(desc(pointsLedger.createdAt));
  const comptes = await db.select().from(citizens);
  const mapCitoyen = new Map(comptes.map((c) => [c.id, c.telephoneMasque]));
  const demandes = await db.select().from(payoutRequests).orderBy(desc(payoutRequests.createdAt));

  res.json({
    totalEntrees: entrees.length,
    totalComptesCitoyens: comptes.length,
    entries: entrees.map((e) => ({
      ...e,
      telephoneMasque: mapCitoyen.get(e.citizenId) || 'Citoyen vérifié',
      createdAt: e.createdAt.toISOString(),
    })),
    simulationsPaiement: demandes.map((d) => ({
      ...d,
      telephoneMasque: mapCitoyen.get(d.citizenId) || 'Citoyen vérifié',
      createdAt: d.createdAt.toISOString(),
    })),
  });
});

/* -------------------------------------------------------------------------- */
/* GET / POST / PATCH / DELETE /api/admin/rewards — Catalogue configurable    */
/* -------------------------------------------------------------------------- */
adminRouter.get('/rewards', async (_req: Request, res: Response) => {
  const db = await getDb();
  await seedCatalogueRecompensesParDefaut(db);
  const catalogue = await db.select().from(rewardsCatalog).orderBy(rewardsCatalog.pointsRequis);
  res.json({
    statutProgramme: 'Récompenses en cours de lancement',
    modePaiement: 'SIMULATION',
    providers: listerPayoutProviders(),
    items: catalogue,
  });
});

adminRouter.post('/rewards', requireAdmin, async (req: Request, res: Response) => {
  const parsed = rewardItemSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Données de récompense invalides.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const d = parsed.data;
  const db = await getDb();
  const [cree] = await db
    .insert(rewardsCatalog)
    .values({
      id: crypto.randomUUID(),
      titre: d.titre,
      description: d.description,
      pointsRequis: d.pointsRequis,
      fournisseurPaiement: d.fournisseurPaiement,
      sponsorNom: d.sponsorNom,
      sponsorContact: d.sponsorContact,
      montantIndicatif: d.montantIndicatif,
      actif: d.actif,
    })
    .returning();

  res.status(201).json(cree);
});

adminRouter.patch('/rewards/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const parsed = rewardItemSchema.partial().safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Mise à jour de récompense invalide.' });
    return;
  }

  const db = await getDb();
  const [exist] = await db.select().from(rewardsCatalog).where(eq(rewardsCatalog.id, id));
  if (!exist) {
    res.status(404).json({ error: 'Récompense introuvable.' });
    return;
  }

  const [maj] = await db
    .update(rewardsCatalog)
    .set({
      titre: parsed.data.titre ?? exist.titre,
      description: parsed.data.description ?? exist.description,
      pointsRequis: parsed.data.pointsRequis ?? exist.pointsRequis,
      fournisseurPaiement: parsed.data.fournisseurPaiement ?? exist.fournisseurPaiement,
      sponsorNom: parsed.data.sponsorNom ?? exist.sponsorNom,
      sponsorContact: parsed.data.sponsorContact ?? exist.sponsorContact,
      montantIndicatif: parsed.data.montantIndicatif ?? exist.montantIndicatif,
      actif: parsed.data.actif ?? exist.actif,
    })
    .where(eq(rewardsCatalog.id, id))
    .returning();

  res.json(maj);
});

adminRouter.delete('/rewards/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const db = await getDb();
  await db.delete(rewardsCatalog).where(eq(rewardsCatalog.id, id));
  res.json({ ok: true });
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/jobs — État de la file de transcription                     */
/* -------------------------------------------------------------------------- */
adminRouter.get('/jobs', async (_req: Request, res: Response) => {
  const db = await getDb();
  const jobs = await db.select().from(transcriptionJobs).orderBy(desc(transcriptionJobs.createdAt));
  res.json(jobs);
});
