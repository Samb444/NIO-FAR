import type { Categorie, Gravite, Statut } from './types';

export const STATUTS: Statut[] = ['recu', 'a_verifier', 'transmis', 'en_cours', 'resolu'];

export const statutInfos: Record<Statut, { label: string; description: string; couleur: string; vocal: string }> = {
  recu: {
    label: 'Reçu',
    description: 'Le signalement est enregistré sur NIO FAR.',
    couleur: '#6B7C74',
    vocal: 'Votre signalement a bien été reçu.',
  },
  a_verifier: {
    label: 'À vérifier',
    description: 'Une vérification sur le terrain est nécessaire.',
    couleur: '#E0A21B',
    vocal: 'Votre signalement est en cours de vérification.',
  },
  transmis: {
    label: 'Transmis',
    description: 'Le problème a été porté à la connaissance des acteurs compétents.',
    couleur: '#2F8FBF',
    vocal: 'Votre signalement a été transmis aux acteurs compétents.',
  },
  en_cours: {
    label: 'En cours',
    description: 'Une intervention est annoncée ou en cours.',
    couleur: '#8E5BD0',
    vocal: 'Une intervention est en cours.',
  },
  resolu: {
    label: 'Résolu',
    description: 'Le problème est déclaré réglé. Les habitants peuvent le confirmer.',
    couleur: '#0B6B4F',
    vocal: 'Le problème est déclaré résolu. Pouvez-vous confirmer qu’il est vraiment réglé ?',
  },
};

export const categorieLabels: Record<Categorie, string> = {
  dechets: 'Déchets',
  eau_stagnante: 'Eau stagnante',
  eclairage: 'Éclairage public',
  voirie: 'Voirie',
};

export const graviteLabels: Record<Gravite, { label: string; aide: string }> = {
  1: { label: 'Gênant', aide: 'Désagréable mais sans risque immédiat' },
  2: { label: 'Important', aide: 'Gêne le passage ou la vie du quartier' },
  3: { label: 'Dangereux', aide: 'Risque pour la santé ou la sécurité' },
};

/**
 * Secteurs de la banlieue de Dakar proposés au choix.
 * Coordonnées approximatives du centre (3 décimales) pour placer les signalements sans GPS.
 */
export const SECTEURS: { nom: string; lat: number; lng: number }[] = [
  { nom: 'Pikine', lat: 14.755, lng: -17.39 },
  { nom: 'Guédiawaye', lat: 14.776, lng: -17.394 },
  { nom: 'Thiaroye', lat: 14.748, lng: -17.367 },
  { nom: 'Keur Massar', lat: 14.783, lng: -17.312 },
  { nom: 'Yeumbeul', lat: 14.772, lng: -17.346 },
  { nom: 'Malika', lat: 14.795, lng: -17.335 },
  { nom: 'Mbao', lat: 14.739, lng: -17.326 },
  { nom: 'Rufisque', lat: 14.716, lng: -17.273 },
  { nom: 'Parcelles Assainies', lat: 14.765, lng: -17.44 },
  { nom: 'Diamaguène Sicap Mbao', lat: 14.752, lng: -17.341 },
];

export const CENTRE_CARTE: [number, number] = [14.762, -17.36];

/** Secteur le plus proche d'une position (simple distance euclidienne, suffisante à cette échelle). */
export function secteurLePlusProche(lat: number, lng: number): { nom: string; distanceKm: number } {
  let meilleur = SECTEURS[0];
  let d = Infinity;
  for (const s of SECTEURS) {
    const dd = Math.hypot(s.lat - lat, (s.lng - lng) * Math.cos((lat * Math.PI) / 180));
    if (dd < d) {
      d = dd;
      meilleur = s;
    }
  }
  return { nom: meilleur.nom, distanceKm: d * 111 };
}
