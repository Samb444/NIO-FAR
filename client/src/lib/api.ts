/**
 * Faux service de données (étape 2).
 *
 * Expose EXACTEMENT l'interface de la future API REST (étape 3) : il suffira de remplacer
 * l'implémentation `ServiceSimule` par un client HTTP qui respecte `NioFarApi`.
 * Les données sont gardées en mémoire et recopiées dans IndexedDB pour survivre au rechargement.
 * Aucune donnée n'est préchargée : les exemples sont fictifs, étiquetés et chargés à la demande.
 */
import { idbEcrire, idbSupprimer, idbToutLire } from './idb';
import { STATUTS } from './referentiel';
import type {
  Categorie,
  FiltresSignalements,
  IndicateursPublics,
  NouveauSignalement,
  Signalement,
  SignalementPublic,
  Statut,
} from './types';
import { genererCodeSuivi } from './utils';
import { creerExemplesFictifs } from './exemples';

export interface NioFarApi {
  listerSignalements(filtres?: FiltresSignalements): Promise<SignalementPublic[]>;
  obtenirSignalement(id: string): Promise<SignalementPublic | null>;
  obtenirParCode(code: string): Promise<SignalementPublic | null>;
  /** Signalements ouverts de même catégorie et même secteur (anti-doublon). */
  chercherSimilaires(categorie: Categorie, secteur: string): Promise<SignalementPublic[]>;
  /** Idempotent : renvoyer deux fois le même `id` ne crée qu'un seul signalement. */
  creerSignalement(donnees: NouveauSignalement): Promise<SignalementPublic>;
  confirmerProbleme(id: string): Promise<SignalementPublic>;
  repondreVerification(id: string, regle: boolean): Promise<SignalementPublic>;
  indicateursPublics(): Promise<IndicateursPublics>;
  chargerExemples(): Promise<number>;
  retirerExemples(): Promise<void>;
}

export class ErreurReseau extends Error {
  constructor() {
    super('Pas de connexion internet. Réessayez quand le réseau revient.');
    this.name = 'ErreurReseau';
  }
}

export class ErreurIntrouvable extends Error {
  constructor() {
    super('Signalement introuvable.');
    this.name = 'ErreurIntrouvable';
  }
}

/** Priorité indicative : gravité + confirmations des habitants. */
export function priorite(s: Pick<Signalement, 'gravite' | 'confirmations'>): number {
  return s.gravite * 2 + s.confirmations;
}

function versPublic(s: Signalement): SignalementPublic {
  const { contact: _contact, ...reste } = s;
  void _contact;
  return structuredClone(reste);
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

class ServiceSimule implements NioFarApi {
  private store = new Map<string, Signalement>();
  private pret: Promise<void> | null = null;

  private init(): Promise<void> {
    if (!this.pret) {
      this.pret = idbToutLire<Signalement>('simulation')
        .then((liste) => liste.forEach((s) => this.store.set(s.id, s)))
        .catch(() => {
          /* IndexedDB indisponible : on reste en mémoire seulement */
        });
    }
    return this.pret;
  }

  /** Simule la latence et l'absence de réseau. */
  private async reseau(): Promise<void> {
    await this.init();
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ErreurReseau();
    await pause(250 + Math.random() * 400);
  }

  private async sauver(s: Signalement): Promise<void> {
    this.store.set(s.id, s);
    try {
      await idbEcrire('simulation', s);
    } catch {
      /* persistance best-effort */
    }
  }

  private exiger(id: string): Signalement {
    const s = this.store.get(id);
    if (!s) throw new ErreurIntrouvable();
    return s;
  }

  async listerSignalements(filtres: FiltresSignalements = {}): Promise<SignalementPublic[]> {
    await this.reseau();
    const secteur = filtres.secteur?.trim().toLowerCase();
    return [...this.store.values()]
      .filter((s) => !filtres.code || s.code === filtres.code)
      .filter((s) => !secteur || s.secteur.toLowerCase().includes(secteur))
      .filter((s) => !filtres.categories?.length || filtres.categories.includes(s.categorie))
      .filter((s) => !filtres.statuts?.length || filtres.statuts.includes(s.statut))
      .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))
      .map(versPublic);
  }

  async obtenirSignalement(id: string): Promise<SignalementPublic | null> {
    await this.reseau();
    const s = this.store.get(id);
    return s ? versPublic(s) : null;
  }

  async obtenirParCode(code: string): Promise<SignalementPublic | null> {
    await this.reseau();
    const s = [...this.store.values()].find((x) => x.code === code);
    return s ? versPublic(s) : null;
  }

  async chercherSimilaires(categorie: Categorie, secteur: string): Promise<SignalementPublic[]> {
    await this.reseau();
    return [...this.store.values()]
      .filter((s) => s.categorie === categorie && s.secteur === secteur)
      .filter((s) => !(s.statut === 'resolu' && s.confirmationHabitant !== false))
      .sort((a, b) => priorite(b) - priorite(a))
      .map(versPublic);
  }

  async creerSignalement(d: NouveauSignalement): Promise<SignalementPublic> {
    await this.reseau();
    const existant = this.store.get(d.id);
    if (existant) return versPublic(existant); // idempotence par UUID
    let code = d.code;
    while ([...this.store.values()].some((s) => s.code === code)) code = genererCodeSuivi();
    const maintenant = new Date().toISOString();
    const s: Signalement = {
      ...d,
      code,
      statut: 'recu',
      estDoublon: false,
      confirmations: 0,
      confirmationHabitant: null,
      photoApres: null,
      enAttenteEnvoi: false,
      historique: [{ date: maintenant, statut: 'recu', note: 'Signalement reçu par NIO FAR.' }],
    };
    await this.sauver(s);
    return versPublic(s);
  }

  async confirmerProbleme(id: string): Promise<SignalementPublic> {
    await this.reseau();
    const s = this.exiger(id);
    const maj = { ...s, confirmations: s.confirmations + 1 };
    await this.sauver(maj);
    return versPublic(maj);
  }

  async repondreVerification(id: string, regle: boolean): Promise<SignalementPublic> {
    await this.reseau();
    const s = this.exiger(id);
    if (s.statut !== 'resolu') throw new Error('Ce signalement n’est pas marqué « Résolu ».');
    const date = new Date().toISOString();
    const maj: Signalement = regle
      ? {
          ...s,
          confirmationHabitant: true,
          historique: [...s.historique, { date, statut: 'resolu', note: 'Résolution confirmée par un habitant.' }],
        }
      : {
          ...s,
          statut: 'a_verifier',
          confirmationHabitant: false,
          historique: [
            ...s.historique,
            { date, statut: 'a_verifier', note: 'Un habitant signale que le problème est toujours là.' },
          ],
        };
    await this.sauver(maj);
    return versPublic(maj);
  }

  async indicateursPublics(): Promise<IndicateursPublics> {
    await this.reseau();
    const liste = [...this.store.values()];
    const parStatut = Object.fromEntries(STATUTS.map((st) => [st, 0])) as Record<Statut, number>;
    const parCategorie: Record<Categorie, number> = { dechets: 0, eau_stagnante: 0, eclairage: 0, voirie: 0 };
    const delais: number[] = [];
    let confirmations = 0;
    let resolusConfirmes = 0;
    let resolusContestes = 0;
    for (const s of liste) {
      parStatut[s.statut] += 1;
      parCategorie[s.categorie] += 1;
      confirmations += s.confirmations;
      if (s.confirmationHabitant === true) resolusConfirmes += 1;
      if (s.confirmationHabitant === false) resolusContestes += 1;
      const fin = s.historique.find((h) => h.statut === 'resolu');
      if (fin) delais.push((new Date(fin.date).getTime() - new Date(s.dateCreation).getTime()) / 86_400_000);
    }
    return {
      total: liste.length,
      parStatut,
      parCategorie,
      resolusConfirmes,
      resolusContestes,
      delaiMoyenResolutionJours: delais.length ? Math.round((delais.reduce((a, b) => a + b, 0) / delais.length) * 10) / 10 : null,
      totalConfirmations: confirmations,
      contientExemples: liste.some((s) => s.estExemple),
    };
  }

  async chargerExemples(): Promise<number> {
    await this.reseau();
    const exemples = creerExemplesFictifs();
    for (const e of exemples) await this.sauver(e);
    return exemples.length;
  }

  async retirerExemples(): Promise<void> {
    await this.reseau();
    for (const s of [...this.store.values()]) {
      if (!s.estExemple) continue;
      this.store.delete(s.id);
      try {
        await idbSupprimer('simulation', s.id);
      } catch {
        /* ignoré */
      }
    }
  }
}

export const api: NioFarApi = new ServiceSimule();
