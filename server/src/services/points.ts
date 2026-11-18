import crypto from 'node:crypto';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { getDb, type Database } from '../db/index.js';
import {
  citizenOtps,
  citizens,
  payoutRequests,
  pointsLedger,
  reports,
  rewardsCatalog,
  type MotifPointDB,
} from '../db/schema.js';
import { obtenirPayoutProvider } from './payout.js';

/** Barème transparent et prudent des points citoyens */
export const POINTS_PAR_SIGNALEMENT_VERIFIE = 10;
export const PLAFOND_QUOTIDIEN_POINTS = 30; // Max 3 signalements vérifiés crédités par jour et par citoyen
export const PENALITE_SIGNALEMENT_MALVEILLANT = -20;

export function normaliserTelephone(brut: string): string {
  const chiffres = brut.replace(/[^\d+]/g, '');
  return chiffres.startsWith('+') ? chiffres : `+221${chiffres.replace(/^221/, '')}`;
}

export function hacherTelephone(telephoneBrut: string): string {
  const norm = normaliserTelephone(telephoneBrut);
  return crypto.createHmac('sha256', config.deviceHashSalt).update(`tel:${norm}`).digest('hex');
}

export function masquerTelephone(telephoneBrut: string): string {
  const norm = normaliserTelephone(telephoneBrut);
  if (norm.length <= 6) return '***';
  return `${norm.slice(0, 4)} •• ••• ${norm.slice(-2)}`;
}

/**
 * Génère un code OTP à 6 chiffres (valable 10 minutes) pour le compte citoyen facultatif.
 */
export async function demanderOtpCitoyen(params: {
  telephone: string;
  secteur: string;
  db?: Database;
}) {
  const database = params.db || (await getDb());
  const telHash = hacherTelephone(params.telephone);
  const telMasque = masquerTelephone(params.telephone);
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await database.insert(citizenOtps).values({
    id: crypto.randomUUID(),
    telephoneHash: telHash,
    telephoneMasque: telMasque,
    secteur: params.secteur.trim() || 'Pikine',
    code,
    expiresAt,
    used: false,
  });

  return {
    telephoneMasque: telMasque,
    expiresAt: expiresAt.toISOString(),
    // En mode prototype / démonstration sans passerelle SMS payante, le code OTP est renvoyé avec étiquette explicite
    codeOtpDemo: code,
    avertissement:
      'Mode prototype : code OTP affiché directement pour la démonstration (aucun SMS réel envoyé).',
  };
}

/**
 * Vérifie le code OTP et crée ou récupère le compte citoyen facultatif.
 */
export async function verifierOtpCitoyen(params: {
  telephone: string;
  code: string;
  secteur?: string;
  db?: Database;
}) {
  const database = params.db || (await getDb());
  const telHash = hacherTelephone(params.telephone);
  const maintenant = new Date();

  const otps = await database
    .select()
    .from(citizenOtps)
    .where(and(eq(citizenOtps.telephoneHash, telHash), eq(citizenOtps.used, false)))
    .orderBy(desc(citizenOtps.createdAt));

  const valide = otps.find((o) => o.code === params.code.trim() && new Date(o.expiresAt) >= maintenant);
  if (!valide) {
    throw new Error('Code OTP invalide ou expiré.');
  }

  await database.update(citizenOtps).set({ used: true }).where(eq(citizenOtps.id, valide.id));

  const existants = await database.select().from(citizens).where(eq(citizens.telephoneHash, telHash));
  if (existants.length > 0) {
    const c = existants[0];
    if (params.secteur && params.secteur.trim() && params.secteur.trim() !== c.secteur) {
      const [maj] = await database
        .update(citizens)
        .set({ secteur: params.secteur.trim() })
        .where(eq(citizens.id, c.id))
        .returning();
      return maj;
    }
    return c;
  }

  const [nouveau] = await database
    .insert(citizens)
    .values({
      id: crypto.randomUUID(),
      telephoneHash: telHash,
      telephoneMasque: valide.telephoneMasque,
      secteur: params.secteur?.trim() || valide.secteur || 'Pikine',
      pointsBalance: 0,
    })
    .returning();

  return nouveau;
}

/**
 * Calcule le total de points positifs gagnés aujourd'hui par un citoyen (plafond quotidien anti-fraude).
 */
export async function pointsGagnesAujourdHui(
  citizenId: string,
  maintenant: Date = new Date(),
  db?: Database,
): Promise<number> {
  const database = db || (await getDb());
  const debutJour = new Date(maintenant);
  debutJour.setUTCHours(0, 0, 0, 0);

  const entrees = await database
    .select()
    .from(pointsLedger)
    .where(and(eq(pointsLedger.citizenId, citizenId), gte(pointsLedger.createdAt, debutJour)));

  return entrees
    .filter((e) => e.delta > 0 && e.motif === 'verification_signalement')
    .reduce((acc, e) => acc + e.delta, 0);
}

/**
 * Évalue et applique les règles d'attribution ou de retrait de points citoyens sur un signalement :
 * - Aucun point à la création (uniquement APRÈS vérification par l'admin ou un relais).
 * - Aucun point pour les doublons (et retrait si des points avaient déjà été attribués).
 * - Retrait / pénalité en cas de signalement malveillant.
 * - Plafond quotidien strict par citoyen.
 * - Toutes les opérations sont inscrites dans le journal auditable `points_ledger`.
 */
export async function appliquerReglesPointsSignalement(params: {
  reportId: string;
  acteurNom: string;
  estMalveillant?: boolean;
  maintenant?: Date;
  db?: Database;
}): Promise<{ delta: number; message: string | null }> {
  const database = params.db || (await getDb());
  const maintenant = params.maintenant || new Date();

  const [rep] = await database.select().from(reports).where(eq(reports.id, params.reportId));
  if (!rep || !rep.citizenId) {
    return { delta: 0, message: null };
  }

  const [citoyen] = await database.select().from(citizens).where(eq(citizens.id, rep.citizenId));
  if (!citoyen) {
    return { delta: 0, message: null };
  }

  // 1. Cas signalement malveillant : retrait des points attribués + pénalité
  const malveillant = params.estMalveillant ?? rep.estMalveillant;
  if (malveillant) {
    // Vérifier si une pénalité malveillante a déjà été appliquée pour ce signalement
    const dejaPenalise = await database
      .select()
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.reportId, rep.id),
          eq(pointsLedger.motif, 'retrait_malveillant'),
        ),
      );

    if (dejaPenalise.length > 0) {
      return { delta: 0, message: 'Pénalité pour signalement malveillant déjà appliquée.' };
    }

    const retrait = -(rep.pointsAttribues > 0 ? rep.pointsAttribues : 0) + PENALITE_SIGNALEMENT_MALVEILLANT;
    const nouveauSolde = Math.max(0, citoyen.pointsBalance + retrait);

    await database.insert(pointsLedger).values({
      id: crypto.randomUUID(),
      citizenId: citoyen.id,
      reportId: rep.id,
      secteur: rep.secteur,
      delta: retrait,
      motif: 'retrait_malveillant',
      description: `Retrait de points (${retrait} pts) : signalement ${rep.code} marqué comme malveillant / abusif.`,
      createdBy: params.acteurNom,
      createdAt: maintenant,
    });

    await database
      .update(citizens)
      .set({ pointsBalance: nouveauSolde })
      .where(eq(citizens.id, citoyen.id));

    await database
      .update(reports)
      .set({ pointsAttribues: 0, estMalveillant: true })
      .where(eq(reports.id, rep.id));

    return {
      delta: retrait,
      message: `Signalement malveillant : ${retrait} points inscrits au journal.`,
    };
  }

  // 2. Cas doublon : aucun point pour les doublons (retrait si déjà crédité)
  if (rep.estDoublon) {
    if (rep.pointsAttribues > 0) {
      const retrait = -rep.pointsAttribues;
      const nouveauSolde = Math.max(0, citoyen.pointsBalance + retrait);

      await database.insert(pointsLedger).values({
        id: crypto.randomUUID(),
        citizenId: citoyen.id,
        reportId: rep.id,
        secteur: rep.secteur,
        delta: retrait,
        motif: 'retrait_doublon',
        description: `Annulation des points (${retrait} pts) : signalement ${rep.code} classé comme doublon.`,
        createdBy: params.acteurNom,
        createdAt: maintenant,
      });

      await database
        .update(citizens)
        .set({ pointsBalance: nouveauSolde })
        .where(eq(citizens.id, citoyen.id));

      await database
        .update(reports)
        .set({ pointsAttribues: 0 })
        .where(eq(reports.id, rep.id));

      return { delta: retrait, message: 'Points retirés (signalement doublon).' };
    }
    return { delta: 0, message: 'Aucun point attribué pour un doublon.' };
  }

  // 3. Attribution après vérification par un relais ou un administrateur
  const estVerifie =
    rep.verifieParRelais ||
    rep.statut === 'transmis' ||
    rep.statut === 'en_cours' ||
    rep.statut === 'resolu';

  if (!estVerifie || rep.pointsAttribues > 0) {
    return { delta: 0, message: null };
  }

  const dejaGagneJour = await pointsGagnesAujourdHui(citoyen.id, maintenant, database);
  const restantPossible = Math.max(0, PLAFOND_QUOTIDIEN_POINTS - dejaGagneJour);
  if (restantPossible <= 0) {
    return {
      delta: 0,
      message: `Plafond quotidien atteint (${PLAFOND_QUOTIDIEN_POINTS} pts/jour) : aucun point supplémentaire crédité aujourd’hui.`,
    };
  }

  const credit = Math.min(POINTS_PAR_SIGNALEMENT_VERIFIE, restantPossible);
  const nouveauSolde = citoyen.pointsBalance + credit;

  await database.insert(pointsLedger).values({
    id: crypto.randomUUID(),
    citizenId: citoyen.id,
    reportId: rep.id,
    secteur: rep.secteur,
    delta: credit,
    motif: 'verification_signalement',
    description: `+${credit} pts après vérification terrain/admin du signalement ${rep.code} (${rep.secteur}).`,
    createdBy: params.acteurNom,
    createdAt: maintenant,
  });

  await database
    .update(citizens)
    .set({ pointsBalance: nouveauSolde })
    .where(eq(citizens.id, citoyen.id));

  await database
    .update(reports)
    .set({ pointsAttribues: credit })
    .where(eq(reports.id, rep.id));

  return {
    delta: credit,
    message: `+${credit} points citoyens attribués après vérification.`,
  };
}

/**
 * Tableau de classement par QUARTIER / SECTEUR uniquement (jamais par individu)
 * pour encourager l'émulation collective sans exposer les personnes.
 */
export async function obtenirClassementParQuartier(db?: Database) {
  const database = db || (await getDb());
  const tousSignalements = await database.select().from(reports);
  const journal = await database.select().from(pointsLedger);

  const parQuartier = new Map<
    string,
    {
      secteur: string;
      pointsTotaux: number;
      signalementsVerifies: number;
      resolusVerifies: number;
      confirmationsCitoyennes: number;
    }
  >();

  for (const r of tousSignalements) {
    if (r.estDoublon || r.estMalveillant) continue;
    const cur = parQuartier.get(r.secteur) || {
      secteur: r.secteur,
      pointsTotaux: 0,
      signalementsVerifies: 0,
      resolusVerifies: 0,
      confirmationsCitoyennes: 0,
    };
    const verifie = r.verifieParRelais || ['transmis', 'en_cours', 'resolu'].includes(r.statut);
    if (verifie) cur.signalementsVerifies += 1;
    if (r.statut === 'resolu' && (Boolean(r.photoApres) || r.confirmationHabitant === true)) {
      cur.resolusVerifies += 1;
    }
    cur.confirmationsCitoyennes += r.confirmations;
    parQuartier.set(r.secteur, cur);
  }

  for (const entry of journal) {
    const cur = parQuartier.get(entry.secteur) || {
      secteur: entry.secteur,
      pointsTotaux: 0,
      signalementsVerifies: 0,
      resolusVerifies: 0,
      confirmationsCitoyennes: 0,
    };
    if (entry.motif !== 'echange_recompense') {
      cur.pointsTotaux = Math.max(0, cur.pointsTotaux + entry.delta);
    }
    parQuartier.set(entry.secteur, cur);
  }

  // Si un secteur a des signalements vérifiés mais aucun compte citoyen lié, afficher un score collectif basé sur les entrées du journal + bonus collectif transparent
  const classement = Array.from(parQuartier.values())
    .map((q) => ({
      ...q,
      scoreCollectif: q.pointsTotaux + q.signalementsVerifies * 10 + q.resolusVerifies * 5,
    }))
    .sort((a, b) => b.scoreCollectif - a.scoreCollectif || a.secteur.localeCompare(b.secteur));

  return {
    politiqueConfidentialite:
      'Classement établi uniquement par quartier (secteur) : aucun classement individuel ni numéro de téléphone n’est exposé.',
    regles: {
      pointsParSignalementVerifie: POINTS_PAR_SIGNALEMENT_VERIFIE,
      plafondQuotidienPoints: PLAFOND_QUOTIDIEN_POINTS,
      penaliteMalveillant: PENALITE_SIGNALEMENT_MALVEILLANT,
      pointsDoublon: 0,
    },
    quartiers: classement,
  };
}

/**
 * Échange de points contre une récompense du catalogue via PayoutProvider en MODE SIMULATION.
 */
export async function echangerPointsRecompense(params: {
  citizenId: string;
  rewardId: string;
  db?: Database;
}) {
  const database = params.db || (await getDb());
  const [citoyen] = await database.select().from(citizens).where(eq(citizens.id, params.citizenId));
  if (!citoyen) {
    throw new Error('Compte citoyen introuvable.');
  }

  const [reward] = await database
    .select()
    .from(rewardsCatalog)
    .where(eq(rewardsCatalog.id, params.rewardId));
  if (!reward || !reward.actif) {
    throw new Error('Récompense introuvable ou inactive.');
  }

  if (citoyen.pointsBalance < reward.pointsRequis) {
    throw new Error(
      `Solde insuffisant (${citoyen.pointsBalance} pts disponibles, ${reward.pointsRequis} pts requis).`,
    );
  }

  const provider = obtenirPayoutProvider(reward.fournisseurPaiement);
  const simulation = await provider.simulerVersement({
    citizenId: citoyen.id,
    rewardId: reward.id,
    pointsUtilises: reward.pointsRequis,
  });

  const nouveauSolde = citoyen.pointsBalance - reward.pointsRequis;
  await database
    .update(citizens)
    .set({ pointsBalance: nouveauSolde })
    .where(eq(citizens.id, citoyen.id));

  const [ledgerEntry] = await database
    .insert(pointsLedger)
    .values({
      id: crypto.randomUUID(),
      citizenId: citoyen.id,
      reportId: null,
      secteur: citoyen.secteur,
      delta: -reward.pointsRequis,
      motif: 'echange_recompense' as MotifPointDB,
      description: `Échange simulé (« ${reward.titre} ») via ${provider.nom} — Réf. ${simulation.referenceSimulation}.`,
      createdBy: 'Citoyen (mode simulation)',
    })
    .returning();

  const [demande] = await database
    .insert(payoutRequests)
    .values({
      id: crypto.randomUUID(),
      citizenId: citoyen.id,
      rewardId: reward.id,
      provider: reward.fournisseurPaiement,
      pointsUtilises: reward.pointsRequis,
      statut: 'simule',
      referenceSimulation: simulation.referenceSimulation,
    })
    .returning();

  return {
    demande,
    simulation,
    nouveauSolde,
    ledgerEntry,
  };
}
