import type { CategorieDB } from '../db/schema.js';

/**
 * Table de suggestion d'acteur compétent par catégorie.
 * Présentée à l'administrateur comme « suggestion à confirmer » et toujours modifiable.
 */
export const SUGGESTIONS_ACTEURS: Record<CategorieDB, string> = {
  dechets: 'SONAGED',
  eau_stagnante: 'ONAS',
  eclairage: 'Senelec ou mairie',
  voirie: 'Services techniques de la mairie',
};

export function suggererActeurCompetent(categorie: CategorieDB): {
  acteur: string;
  mention: string;
} {
  return {
    acteur: SUGGESTIONS_ACTEURS[categorie] ?? 'Services techniques de la mairie',
    mention: 'Suggestion à confirmer par l’administrateur',
  };
}
