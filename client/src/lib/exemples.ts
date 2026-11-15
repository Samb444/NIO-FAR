/**
 * EXEMPLES FICTIFS — uniquement pour la démonstration.
 * Chargés sur demande via un bouton, toujours affichés avec l'étiquette « Exemple fictif ».
 * Les illustrations sont des dessins SVG génériques, pas des photos réelles.
 */
import { categoryColors } from './tokens';
import { SECTEURS, categorieLabels } from './referentiel';
import type { Categorie, EntreeHistorique, Gravite, Signalement, Statut } from './types';

function illustration(categorie: Categorie, apres: boolean): string {
  const c = apres ? '#0B6B4F' : categoryColors[categorie];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320">
<rect width="480" height="320" fill="#F6F1E7"/>
<rect y="210" width="480" height="110" fill="#E5DCC8"/>
<rect x="30" y="80" width="120" height="130" fill="#D9CDB4"/><rect x="330" y="60" width="120" height="150" fill="#D9CDB4"/>
${apres ? `<circle cx="240" cy="200" r="54" fill="${c}" opacity=".18"/><path d="M212 200 l20 20 l40 -44" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="240" cy="220" r="62" fill="${c}" opacity=".85"/><circle cx="210" cy="208" r="18" fill="#14231C" opacity=".25"/>`}
<rect x="12" y="12" rx="10" width="190" height="34" fill="#14231C"/>
<text x="24" y="35" font-family="sans-serif" font-size="17" font-weight="700" fill="#F6F1E7">EXEMPLE FICTIF</text>
<text x="240" y="300" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#14231C">${categorieLabels[categorie]}${apres ? ' — après' : ''} (illustration)</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const jours = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

type Modele = {
  id: string;
  code: string;
  categorie: Categorie;
  description: string;
  secteurIndex: number;
  gravite: Gravite;
  ilYA: number;
  etapes: [Statut, number, string][]; // statut, il y a N jours, note
  confirmations: number;
  confirmationHabitant: boolean | null;
  photoApres?: boolean;
  dx: number;
  dy: number;
};

const modeles: Modele[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    code: 'NF-EX2A4',
    categorie: 'dechets',
    description: 'Exemple fictif : dépôt d’ordures à l’angle de la rue, près du marché.',
    secteurIndex: 0,
    gravite: 2,
    ilYA: 9,
    etapes: [
      ['recu', 9, 'Signalement reçu par NIO FAR.'],
      ['a_verifier', 8, 'Vérification demandée aux habitants du secteur.'],
      ['transmis', 6, 'Porté à la connaissance des acteurs compétents (exemple).'],
    ],
    confirmations: 7,
    confirmationHabitant: null,
    dx: 0.004,
    dy: -0.003,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    code: 'NF-EX3B7',
    categorie: 'eau_stagnante',
    description: 'Exemple fictif : eau stagnante depuis la dernière pluie devant l’école.',
    secteurIndex: 1,
    gravite: 3,
    ilYA: 14,
    etapes: [
      ['recu', 14, 'Signalement reçu par NIO FAR.'],
      ['a_verifier', 13, 'Vérification demandée.'],
      ['transmis', 11, 'Transmis (exemple).'],
      ['en_cours', 6, 'Pompage annoncé (exemple).'],
      ['resolu', 2, 'Déclaré résolu (exemple).'],
    ],
    confirmations: 12,
    confirmationHabitant: null,
    photoApres: true,
    dx: -0.003,
    dy: 0.002,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    code: 'NF-EX4C9',
    categorie: 'eclairage',
    description: 'Exemple fictif : trois lampadaires éteints sur l’avenue principale.',
    secteurIndex: 3,
    gravite: 2,
    ilYA: 4,
    etapes: [['recu', 4, 'Signalement reçu par NIO FAR.']],
    confirmations: 3,
    confirmationHabitant: null,
    dx: 0.002,
    dy: 0.004,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    code: 'NF-EX5D3',
    categorie: 'voirie',
    description: 'Exemple fictif : nid-de-poule profond, dangereux pour les motos la nuit.',
    secteurIndex: 2,
    gravite: 3,
    ilYA: 20,
    etapes: [
      ['recu', 20, 'Signalement reçu par NIO FAR.'],
      ['a_verifier', 19, 'Vérification demandée.'],
      ['transmis', 17, 'Transmis (exemple).'],
      ['en_cours', 10, 'Travaux annoncés (exemple).'],
      ['resolu', 5, 'Déclaré résolu (exemple).'],
    ],
    confirmations: 9,
    confirmationHabitant: true,
    photoApres: true,
    dx: -0.002,
    dy: -0.004,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    code: 'NF-EX6E8',
    categorie: 'dechets',
    description: 'Exemple fictif : bac collectif qui déborde depuis plusieurs jours.',
    secteurIndex: 4,
    gravite: 1,
    ilYA: 2,
    etapes: [
      ['recu', 2, 'Signalement reçu par NIO FAR.'],
      ['a_verifier', 1, 'Vérification demandée.'],
    ],
    confirmations: 1,
    confirmationHabitant: null,
    dx: 0.001,
    dy: 0.001,
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    code: 'NF-EX7F2',
    categorie: 'eau_stagnante',
    description: 'Exemple fictif : caniveau bouché, l’eau revient malgré l’intervention.',
    secteurIndex: 6,
    gravite: 2,
    ilYA: 25,
    etapes: [
      ['recu', 25, 'Signalement reçu par NIO FAR.'],
      ['transmis', 22, 'Transmis (exemple).'],
      ['resolu', 12, 'Déclaré résolu (exemple).'],
      ['a_verifier', 10, 'Un habitant signale que le problème est toujours là.'],
    ],
    confirmations: 5,
    confirmationHabitant: false,
    dx: 0.003,
    dy: 0.003,
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    code: 'NF-EX8G5',
    categorie: 'voirie',
    description: 'Exemple fictif : regard d’égout ouvert au milieu de la ruelle.',
    secteurIndex: 0,
    gravite: 3,
    ilYA: 1,
    etapes: [['recu', 1, 'Signalement reçu par NIO FAR.']],
    confirmations: 0,
    confirmationHabitant: null,
    dx: -0.004,
    dy: 0.001,
  },
];

export function creerExemplesFictifs(): Signalement[] {
  return modeles.map((m) => {
    const secteur = SECTEURS[m.secteurIndex];
    const historique: EntreeHistorique[] = m.etapes.map(([statut, n, note]) => ({ date: jours(n), statut, note }));
    return {
      id: m.id,
      code: m.code,
      categorie: m.categorie,
      description: m.description,
      secteur: secteur.nom,
      latitude: Math.round((secteur.lat + m.dy) * 1000) / 1000,
      longitude: Math.round((secteur.lng + m.dx) * 1000) / 1000,
      gravite: m.gravite,
      photo: illustration(m.categorie, false),
      audio: null,
      contact: null,
      statut: historique[historique.length - 1].statut,
      estDoublon: false,
      confirmations: m.confirmations,
      confirmationHabitant: m.confirmationHabitant,
      photoApres: m.photoApres ? illustration(m.categorie, true) : null,
      enAttenteEnvoi: false,
      dateCreation: jours(m.ilYA),
      historique,
      estExemple: true,
    };
  });
}
