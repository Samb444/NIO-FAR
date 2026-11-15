import type { CategoryId } from './tokens';

export type Category = {
  id: CategoryId;
  label: string;
  description: string;
  examples: string;
};

export const categories: Category[] = [
  {
    id: 'dechets',
    label: 'Déchets',
    description: 'Dépôts sauvages, bacs qui débordent, ordures non ramassées.',
    examples: 'Tas d’ordures, bac plein, dépôt sauvage',
  },
  {
    id: 'eau_stagnante',
    label: 'Eau stagnante',
    description: 'Inondations, flaques persistantes, caniveaux bouchés après la pluie.',
    examples: 'Rue inondée, caniveau bouché, mare',
  },
  {
    id: 'eclairage',
    label: 'Éclairage public',
    description: 'Lampadaires éteints, clignotants ou endommagés dans les rues.',
    examples: 'Lampadaire éteint, poteau abîmé',
  },
  {
    id: 'voirie',
    label: 'Voirie',
    description: 'Nids-de-poule, chaussée dégradée, regards ouverts, sable envahissant.',
    examples: 'Nid-de-poule, regard ouvert, ensablement',
  },
];
