import type { CategorieDB, StatutDB } from '../db/schema.js';

export type DetailPriorite = {
  score: number;
  gravite: number;
  gravitePoints: number;
  similairesCount: number;
  similairesPoints: number;
  confirmations: number;
  confirmationsPoints: number;
  joursDepuisCreation: number;
  tranchesTroisJours: number;
  anciennetePoints: number;
  formule: string;
  explication: string;
};

export type SignalementPourPriorite = {
  id: string;
  categorie: CategorieDB;
  secteur: string;
  gravite: number;
  confirmations: number;
  statut: StatutDB;
  estDoublon: boolean;
  confirmationHabitant: boolean | null;
  dateCreation: Date | string;
};

/**
 * Calcule le score de priorisation transparente :
 * score = gravité × 2 + signalements similaires + confirmations + 1 point par tranche de 3 jours
 */
export function calculerPrioriteTransparente(
  cible: Pick<SignalementPourPriorite, 'gravite' | 'confirmations' | 'dateCreation'>,
  similairesCount: number,
  maintenant: Date = new Date(),
): DetailPriorite {
  const dateCreation = cible.dateCreation instanceof Date ? cible.dateCreation : new Date(cible.dateCreation);
  const diffMs = Math.max(0, maintenant.getTime() - dateCreation.getTime());
  const joursDepuisCreation = Math.floor(diffMs / 86_400_000);
  const tranchesTroisJours = Math.floor(joursDepuisCreation / 3);

  const gravitePoints = cible.gravite * 2;
  const similairesPoints = Math.max(0, similairesCount);
  const confirmationsPoints = Math.max(0, cible.confirmations);
  const anciennetePoints = tranchesTroisJours;

  const score = gravitePoints + similairesPoints + confirmationsPoints + anciennetePoints;

  return {
    score,
    gravite: cible.gravite,
    gravitePoints,
    similairesCount: similairesPoints,
    similairesPoints,
    confirmations: cible.confirmations,
    confirmationsPoints,
    joursDepuisCreation,
    tranchesTroisJours,
    anciennetePoints,
    formule: `${cible.gravite}×2 (gravité) + ${similairesPoints} (similaires) + ${confirmationsPoints} (confirmations) + ${anciennetePoints} (${joursDepuisCreation} j / 3) = ${score}`,
    explication: `Gravité (${cible.gravite} × 2 = ${gravitePoints} pt${gravitePoints > 1 ? 's' : ''}) + ${similairesPoints} signalement${similairesPoints > 1 ? 's' : ''} similaire${similairesPoints > 1 ? 's' : ''} dans le secteur + ${confirmationsPoints} confirmation${confirmationsPoints > 1 ? 's' : ''} d'habitants + ${anciennetePoints} pt${anciennetePoints > 1 ? 's' : ''} d'ancienneté (${joursDepuisCreation} jour${joursDepuisCreation > 1 ? 's' : ''}, soit ${tranchesTroisJours} tranche${tranchesTroisJours > 1 ? 's' : ''} de 3 jours).`,
  };
}

/**
 * Compte les signalements similaires ouverts (même catégorie et même secteur, hors doublons et résolus confirmés).
 */
export function compterSimilairesDansListe(
  cible: SignalementPourPriorite,
  tous: SignalementPourPriorite[],
): number {
  return tous.filter(
    (autre) =>
      autre.id !== cible.id &&
      !autre.estDoublon &&
      autre.categorie === cible.categorie &&
      autre.secteur.toLowerCase() === cible.secteur.toLowerCase() &&
      !(autre.statut === 'resolu' && autre.confirmationHabitant !== false),
  ).length;
}
