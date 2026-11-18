import { getDb, type Database } from '../db/index.js';
import { reports, type CategorieDB } from '../db/schema.js';
import { SECTEURS_DAKAR } from './sectors.js';

export const SEUIL_MINIMAL_SIGNALEMENTS_SECTEUR = 30;
export const MENTION_INDICATIVE_PREDICTION =
  'Indicatif, basé sur les données de NIO FAR — méthode statistique et règles explicables (aucune boîte noire, jamais une certitude).';

export type PrevisionPluieJour = {
  date: string;
  precipitationMm: number;
  probabiliteMax: number;
};

export type MeteoDakarIndicative = {
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
  jours: PrevisionPluieJour[];
  estRepliHorsLigne: boolean;
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
  categorie: CategorieDB;
  labelCategorie: string;
  nbSignalementsCategorie: number;
  nbRecurrentsOuActifs: number;
  donneesSuffisantes: boolean;
  statutDonnees: 'ok' | 'Datos_insuffisantes' | 'donnees_insuffisantes';
  messageGardeFou: string;
  scoreRisque: number | null; // null si < 30 signalements dans le secteur
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
  statutAffichage: string; // « Données insuffisantes » si total < 30
  scoreGlobalSecteur: number | null;
  niveauGlobal: 'donnees_insuffisantes' | 'faible' | 'modere' | 'eleve';
  saisonnaliteMensuelle: { mois: number; labelMois: string; count: number; estHivernage: boolean }[];
  parCategorie: ScoreRisqueCategorie[];
};

export type ElementAAnticiper = {
  secteur: string;
  categorie: CategorieDB;
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
  meteo: MeteoDakarIndicative;
  secteurs: PointNoirSecteur[];
  aAnticiper: ElementAAnticiper[];
};

const MOIS_LABELS = [
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
];

// Coefficient saisonnier mensuel (Dakar : pré-hivernage mai-juin, hivernage juillet-octobre)
const POIDS_SAISONNIER_MOIS: Record<number, number> = {
  0: 25, // Janvier (saison sèche)
  1: 25,
  2: 30,
  3: 35,
  4: 55, // Mai (préparation pré-hivernage : curage caniveaux)
  5: 75, // Juin (début hivernage)
  6: 90, // Juillet
  7: 100, // Août (pic pluviométrique à Dakar)
  8: 95, // Septembre
  9: 70, // Octobre
  10: 40, // Novembre
  11: 30, // Décembre
};

const LABELS_CATEGORIE: Record<CategorieDB, string> = {
  eau_stagnante: 'Inondations & eau stagnante',
  dechets: 'Amas de déchets & dépôts sauvages',
  voirie: 'Voirie & affaissements',
  eclairage: 'Éclairage public',
};

let cacheMeteo: { expireAt: number; data: MeteoDakarIndicative } | null = null;

function construireMeteoRepli(maintenant: Date = new Date()): MeteoDakarIndicative {
  const jours: PrevisionPluieJour[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(maintenant.getTime() + i * 86_400_000);
    const mois = d.getUTCMonth();
    const enHivernage = mois >= 5 && mois <= 9;
    const mm = enHivernage ? (i === 2 ? 18.4 : i === 4 ? 9.2 : 1.5) : i === 3 ? 12.5 : 0;
    const prob = mm > 10 ? 75 : mm > 0 ? 35 : 10;
    return {
      date: d.toISOString().slice(0, 10),
      precipitationMm: mm,
      probabiliteMax: prob,
    };
  });

  const cumul7JoursMm = Math.round(jours.reduce((a, b) => a + b.precipitationMm, 0) * 10) / 10;
  const maxJourMm = Math.max(...jours.map((j) => j.precipitationMm), 0);
  const importante = jours.find((j) => j.precipitationMm >= 10) || jours.find((j) => j.precipitationMm >= 5) || null;

  return {
    source: 'Open-Meteo (zone Dakar 14.76°N, -17.36°E — mode hors-ligne / repli indicatif)',
    zone: 'Banlieue de Dakar (Pikine, Guédiawaye, Keur Massar, Rufisque)',
    latitude: 14.76,
    longitude: -17.36,
    horodatage: maintenant.toISOString(),
    cumul7JoursMm,
    maxJourMm,
    prochainePluieImportante: importante
      ? {
          date: importante.date,
          precipitationMm: importante.precipitationMm,
          probabiliteMax: importante.probabiliteMax,
          seuilMm: 10,
        }
      : null,
    jours,
    estRepliHorsLigne: true,
  };
}

/**
 * Récupère les prévisions de pluie sur 7 jours via l'API Open-Meteo (sans clé) pour Dakar.
 */
export async function obtenirPrevisionsPluieDakar(
  maintenant: Date = new Date(),
): Promise<MeteoDakarIndicative> {
  if (process.env.NODE_ENV === 'test') {
    return construireMeteoRepli(maintenant);
  }
  if (cacheMeteo && cacheMeteo.expireAt > Date.now()) {
    return cacheMeteo.data;
  }

  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=14.76&longitude=-17.36&daily=precipitation_sum,precipitation_probability_max&timezone=Africa%2FDakar&forecast_days=7';

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      daily?: {
        time?: string[];
        precipitation_sum?: (number | null)[];
        precipitation_probability_max?: (number | null)[];
      };
    };

    const times = json.daily?.time ?? [];
    const sums = json.daily?.precipitation_sum ?? [];
    const probs = json.daily?.precipitation_probability_max ?? [];

    if (times.length === 0) {
      throw new Error('Réponse Open-Meteo vide');
    }

    const jours: PrevisionPluieJour[] = times.map((date, idx) => ({
      date,
      precipitationMm: Math.round((Number(sums[idx] ?? 0) || 0) * 10) / 10,
      probabiliteMax: Math.round(Number(probs[idx] ?? 0) || 0),
    }));

    const cumul7JoursMm = Math.round(jours.reduce((a, b) => a + b.precipitationMm, 0) * 10) / 10;
    const maxJourMm = Math.max(...jours.map((j) => j.precipitationMm), 0);
    const importante =
      jours.find((j) => j.precipitationMm >= 10) ||
      jours.find((j) => j.precipitationMm >= 3 && j.probabiliteMax >= 50) ||
      null;

    const data: MeteoDakarIndicative = {
      source: 'API Open-Meteo (sans clé, prévisions 7 jours pour Dakar 14.76°N, -17.36°E)',
      zone: 'Banlieue de Dakar (Pikine, Guédiawaye, Keur Massar, Rufisque)',
      latitude: 14.76,
      longitude: -17.36,
      horodatage: maintenant.toISOString(),
      cumul7JoursMm,
      maxJourMm,
      prochainePluieImportante: importante
        ? {
            date: importante.date,
            precipitationMm: importante.precipitationMm,
            probabiliteMax: importante.probabiliteMax,
            seuilMm: 10,
          }
        : null,
      jours,
      estRepliHorsLigne: false,
    };

    cacheMeteo = {
      expireAt: Date.now() + 30 * 60 * 1000, // Cache 30 minutes
      data,
    };
    return data;
  } catch {
    const fallback = construireMeteoRepli(maintenant);
    cacheMeteo = {
      expireAt: Date.now() + 5 * 60 * 1000,
      data: fallback,
    };
    return fallback;
  }
}

function actionRecommandeePour(categorie: CategorieDB, niveau: 'faible' | 'modere' | 'eleve'): string {
  if (categorie === 'eau_stagnante') {
    return niveau === 'eleve'
      ? 'Curage préventif prioritaire des caniveaux et points bas avant la prochaine pluie (ONAS / commune).'
      : 'Inspection préventive du réseau d’évacuation des eaux pluviales.';
  }
  if (categorie === 'dechets') {
    return niveau === 'eleve'
      ? 'Rotation préventive de collecte avant la pluie pour éviter l’obstruction des caniveaux par les déchets (SONAGED / commune).'
      : 'Vérification du remplissage des bacs collectifs du secteur.';
  }
  if (categorie === 'voirie') {
    return 'Sécurisation et comblement des affaissements susceptibles d’être aggravés par le ruissellement.';
  }
  return 'Tournée de maintenance préventive des points lumineux signalés.';
}

/**
 * Calcule le rapport d'urbanisme prédictif (« Points noirs ») par secteur et par catégorie.
 * Applique strictement le garde-fou : moins de 30 signalements dans le secteur => « Données insuffisantes ».
 */
export async function calculerPointsNoirsPredictifs(params?: {
  db?: Database;
  maintenant?: Date;
  meteoOverride?: MeteoDakarIndicative;
}): Promise<RapportPointsNoirs> {
  const database = params?.db || (await getDb());
  const maintenant = params?.maintenant || new Date();
  const meteo = params?.meteoOverride || (await obtenirPrevisionsPluieDakar(maintenant));

  const tous = (await database.select().from(reports)).filter(
    (r) => !r.estDoublon && !r.estMalveillant,
  );
  const contientExemplesFictifs = tous.some((r) => r.estExemple);

  const categoriesCibles: CategorieDB[] = ['eau_stagnante', 'dechets', 'voirie', 'eclairage'];
  const moisCourant = maintenant.getUTCMonth();

  const secteursResult: PointNoirSecteur[] = [];
  const aAnticiper: ElementAAnticiper[] = [];

  for (const secInfo of SECTEURS_DAKAR) {
    const duSecteur = tous.filter(
      (r) => r.secteur.toLowerCase() === secInfo.nom.toLowerCase(),
    );
    const totalSecteur = duSecteur.length;
    const donneesSuffisantes = totalSecteur >= SEUIL_MINIMAL_SIGNALEMENTS_SECTEUR;

    // Saisonnalité mensuelle (12 mois)
    const saisonnaliteMensuelle = MOIS_LABELS.map((labelMois, idx) => {
      const count = duSecteur.filter((r) => new Date(r.dateCreation).getUTCMonth() === idx).length;
      return {
        mois: idx + 1,
        labelMois,
        count,
        estHivernage: idx >= 5 && idx <= 9,
      };
    });

    const parCategorie: ScoreRisqueCategorie[] = categoriesCibles.map((cat) => {
      const deCat = duSecteur.filter((r) => r.categorie === cat);
      const nbCat = deCat.length;
      const nbRecurrentsOuActifs = deCat.filter(
        (r) =>
          r.statut !== 'resolu' ||
          r.confirmationHabitant === false ||
          r.gravite === 3 ||
          r.confirmations >= 3,
      ).length;

      // Facteur 1 : Densité dans le secteur (poids 35 %)
      // Normalisé sur une base de 20 signalements de cette catégorie dans le secteur = 100/100
      const scoreDensite = Math.min(100, Math.round((nbCat / 18) * 100));
      const contribDensite = Math.round(scoreDensite * 0.35);

      // Facteur 2 : Récurrence, gravité & non-résolution (poids 30 %)
      const ratioRecurrence = nbCat > 0 ? nbRecurrentsOuActifs / nbCat : 0;
      const confirmationsMoyennes =
        nbCat > 0 ? deCat.reduce((acc, r) => acc + r.confirmations, 0) / nbCat : 0;
      const scoreRecurrence = Math.min(
        100,
        Math.round(ratioRecurrence * 70 + Math.min(30, confirmationsMoyennes * 6)),
      );
      const contribRecurrence = Math.round(scoreRecurrence * 0.3);

      // Facteur 3 : Saisonnalité historique par mois & hivernage (poids 20 %)
      const nbHivernageCat = deCat.filter((r) => {
        const m = new Date(r.dateCreation).getUTCMonth();
        return m >= 4 && m <= 9; // mai à octobre
      }).length;
      const partHivernage = nbCat > 0 ? nbHivernageCat / nbCat : 0;
      const baseCalendrier = POIDS_SAISONNIER_MOIS[moisCourant] ?? 40;
      const scoreSaisonnalite = Math.min(
        100,
        Math.round(baseCalendrier * 0.5 + partHivernage * 50),
      );
      const contribSaisonnalite = Math.round(scoreSaisonnalite * 0.2);

      // Facteur 4 : Prévisions de pluie Open-Meteo Dakar (poids 15 %)
      // Impact plus fort sur eau_stagnante et dechets (déchets qui bouchent les caniveaux sous la pluie)
      const coefSensibilitePluie =
        cat === 'eau_stagnante' ? 1.0 : cat === 'dechets' ? 0.85 : cat === 'voirie' ? 0.6 : 0.35;
      const scorePluieBrut = Math.min(
        100,
        Math.round((meteo.cumul7JoursMm * 3 + meteo.maxJourMm * 2) * coefSensibilitePluie),
      );
      const contribMeteo = Math.round(scorePluieBrut * 0.15);

      const facteurs: FacteurExplicable[] = [
        {
          code: 'densite',
          label: 'Densité de signalements',
          poidsPourcent: 35,
          scoreBrutSur100: scoreDensite,
          contributionPoints: contribDensite,
          explication: `${nbCat} signalement(s) « ${LABELS_CATEGORIE[cat]} » sur ${totalSecteur} dans le secteur ${secInfo.nom}.`,
        },
        {
          code: 'recurrence',
          label: 'Récurrence & cas non résolus',
          poidsPourcent: 30,
          scoreBrutSur100: scoreRecurrence,
          contributionPoints: contribRecurrence,
          explication: `${nbRecurrentsOuActifs} cas actif(s), réouvert(s) ou de gravité élevée (${Math.round(ratioRecurrence * 100)} %).`,
        },
        {
          code: 'saisonnalite',
          label: 'Saisonnalité mensuelle (hivernage)',
          poidsPourcent: 20,
          scoreBrutSur100: scoreSaisonnalite,
          contributionPoints: contribSaisonnalite,
          explication: `${nbHivernageCat}/${nbCat} cas enregistrés sur la période mai–octobre (indice saisonnier ${scoreSaisonnalite}/100).`,
        },
        {
          code: 'meteo',
          label: 'Prévision pluie Open-Meteo (7 j)',
          poidsPourcent: 15,
          scoreBrutSur100: scorePluieBrut,
          contributionPoints: contribMeteo,
          explication: `Cumul prévu : ${meteo.cumul7JoursMm} mm sur 7 jours (pic : ${meteo.maxJourMm} mm).`,
        },
      ];

      if (!donneesSuffisantes) {
        return {
          categorie: cat,
          labelCategorie: LABELS_CATEGORIE[cat],
          nbSignalementsCategorie: nbCat,
          nbRecurrentsOuActifs,
          donneesSuffisantes: false,
          statutDonnees: 'donnees_insuffisantes',
          messageGardeFou: `Données insuffisantes (${totalSecteur}/${SEUIL_MINIMAL_SIGNALEMENTS_SECTEUR} signalements dans le secteur ${secInfo.nom}).`,
          scoreRisque: null,
          niveauRisque: 'donnees_insuffisantes',
          formuleExplicable:
            'Score désactivé par garde-fou : moins de 30 signalements dans ce secteur.',
          facteurs,
          actionSuggereeCommune:
            'Poursuivre la collecte citoyenne jusqu’au seuil minimal de 30 signalements dans le secteur.',
        };
      }

      const scoreTotal = Math.min(
        100,
        contribDensite + contribRecurrence + contribSaisonnalite + contribMeteo,
      );
      const niveauRisque: 'faible' | 'modere' | 'eleve' =
        scoreTotal >= 65 ? 'eleve' : scoreTotal >= 40 ? 'modere' : 'faible';

      const formuleExplicable = `Score ${scoreTotal}/100 = Densité (${contribDensite} pts [35%]) + Récurrence (${contribRecurrence} pts [30%]) + Saisonnalité (${contribSaisonnalite} pts [20%]) + Pluie Open-Meteo (${contribMeteo} pts [15%])`;

      const actionSuggereeCommune = actionRecommandeePour(cat, niveauRisque);

      if (
        (cat === 'eau_stagnante' || cat === 'dechets' || scoreTotal >= 55) &&
        (niveauRisque === 'eleve' || niveauRisque === 'modere') &&
        nbCat > 0
      ) {
        aAnticiper.push({
          secteur: secInfo.nom,
          categorie: cat,
          labelCategorie: LABELS_CATEGORIE[cat],
          scoreRisque: scoreTotal,
          niveauRisque,
          prochainePluieDate: meteo.prochainePluieImportante?.date ?? null,
          prochainePluieMm: meteo.prochainePluieImportante?.precipitationMm ?? null,
          justificationCourte: `${nbCat} signalements (${nbRecurrentsOuActifs} récurrents/actifs) croisés avec ${meteo.cumul7JoursMm} mm de pluie prévus.`,
          actionRecommandee: actionSuggereeCommune,
          facteurs,
        });
      }

      return {
        categorie: cat,
        labelCategorie: LABELS_CATEGORIE[cat],
        nbSignalementsCategorie: nbCat,
        nbRecurrentsOuActifs,
        donneesSuffisantes: true,
        statutDonnees: 'ok',
        messageGardeFou: MENTION_INDICATIVE_PREDICTION,
        scoreRisque: scoreTotal,
        niveauRisque,
        formuleExplicable,
        facteurs,
        actionSuggereeCommune,
      };
    });

    const scoresDisponibles = parCategorie
      .map((c) => c.scoreRisque)
      .filter((s): s is number => typeof s === 'number');

    const scoreGlobalSecteur =
      donneesSuffisantes && scoresDisponibles.length > 0
        ? Math.max(...scoresDisponibles)
        : null;

    const niveauGlobal: PointNoirSecteur['niveauGlobal'] = !donneesSuffisantes
      ? 'donnees_insuffisantes'
      : (scoreGlobalSecteur ?? 0) >= 65
        ? 'eleve'
        : (scoreGlobalSecteur ?? 0) >= 40
          ? 'modere'
          : 'faible';

    secteursResult.push({
      secteur: secInfo.nom,
      latitude: secInfo.lat,
      longitude: secInfo.lng,
      totalSignalementsSecteur: totalSecteur,
      seuilMinimalRequis: SEUIL_MINIMAL_SIGNALEMENTS_SECTEUR,
      donneesSuffisantes,
      statutAffichage: donneesSuffisantes
        ? `Indicatif (${totalSecteur} signalements)`
        : `Données insuffisantes (${totalSecteur}/${SEUIL_MINIMAL_SIGNALEMENTS_SECTEUR})`,
      scoreGlobalSecteur,
      niveauGlobal,
      saisonnaliteMensuelle,
      parCategorie,
    });
  }

  secteursResult.sort((a, b) => {
    if (a.donneesSuffisantes !== b.donneesSuffisantes) return a.donneesSuffisantes ? -1 : 1;
    return (
      (b.scoreGlobalSecteur ?? -1) - (a.scoreGlobalSecteur ?? -1) ||
      b.totalSignalementsSecteur - a.totalSignalementsSecteur
    );
  });

  aAnticiper.sort((a, b) => b.scoreRisque - a.scoreRisque);

  return {
    mentionLegale: MENTION_INDICATIVE_PREDICTION,
    methode:
      'Formule explicable à 4 facteurs pondérés : Densité sectorielle (35 %) + Récurrence & non-résolution (30 %) + Saisonnalité mensuelle hivernage (20 %) + Prévisions de pluie Open-Meteo 7 jours (15 %). Garde-fou actif sous 30 signalements par secteur.',
    seuilMinimalSecteur: SEUIL_MINIMAL_SIGNALEMENTS_SECTEUR,
    genereLe: maintenant.toISOString(),
    contientExemplesFictifs,
    meteo,
    secteurs: secteursResult,
    aAnticiper,
  };
}
