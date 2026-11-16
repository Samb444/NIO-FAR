import crypto from 'node:crypto';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { getDb, type Database } from './index.js';
import {
  reports,
  reportSuggestions,
  users,
  type CategorieDB,
  type EntreeHistoriqueDB,
  type RelanceNiveauDB,
  type StatutDB,
} from './schema.js';
import { SUGGESTIONS_ACTEURS } from '../services/actors.js';

const COULEURS_CAT: Record<CategorieDB, string> = {
  dechets: '#E0A21B',
  eau_stagnante: '#2F8FBF',
  eclairage: '#F2C94C',
  voirie: '#C8553D',
};

const LABELS_CAT: Record<CategorieDB, string> = {
  dechets: 'Déchets',
  eau_stagnante: 'Eau stagnante',
  eclairage: 'Éclairage public',
  voirie: 'Voirie',
};

function illustrationSvg(categorie: CategorieDB, apres: boolean): string {
  const c = apres ? '#0B6B4F' : COULEURS_CAT[categorie];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320">
<rect width="480" height="320" fill="#F6F1E7"/>
<rect y="210" width="480" height="110" fill="#E5DCC8"/>
<rect x="30" y="80" width="120" height="130" fill="#D9CDB4"/><rect x="330" y="60" width="120" height="150" fill="#D9CDB4"/>
${
  apres
    ? `<circle cx="240" cy="200" r="54" fill="${c}" opacity=".18"/><path d="M212 200 l20 20 l40 -44" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="240" cy="220" r="62" fill="${c}" opacity=".85"/><circle cx="210" cy="208" r="18" fill="#14231C" opacity=".25"/>`
}
<rect x="12" y="12" rx="10" width="190" height="34" fill="#14231C"/>
<text x="24" y="35" font-family="sans-serif" font-size="17" font-weight="700" fill="#F6F1E7">EXEMPLE FICTIF</text>
<text x="240" y="300" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#14231C">${LABELS_CAT[categorie]}${apres ? ' — après' : ''} (illustration)</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Génère un court WAV silencieux/bip de démonstration (2 secondes) en data URL pour tester l'écoute admin. */
function genererAudioWavDemo(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * 1; // 1 seconde
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.sin(Math.PI * t);
    const val = Math.round(Math.sin(2 * Math.PI * 440 * t) * 4000 * env);
    buffer.writeInt16LE(val, 44 + i * 2);
  }
  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

const joursAvant = (n: number) => new Date(Date.now() - n * 86_400_000);

type ModeleExemple = {
  id: string;
  code: string;
  categorie: CategorieDB;
  description: string;
  secteur: string;
  lat: number;
  lng: number;
  gravite: 1 | 2 | 3;
  ilYAJours: number;
  derniereMajJours: number;
  etapes: [StatutDB, number, string][];
  confirmations: number;
  confirmationHabitant: boolean | null;
  verifieParRelais: boolean;
  photoApres?: boolean;
  avecAudio?: boolean;
  relanceNiveau?: RelanceNiveauDB;
  transcriptionSuggeree?: string;
  motsCles?: string[];
};

const MODELES_EXEMPLES: ModeleExemple[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    code: 'NF-EX2A4',
    categorie: 'dechets',
    description: 'Exemple fictif : dépôt sauvage d’ordures et sachets plastiques à l’angle de la rue, près du marché.',
    secteur: 'Pikine',
    lat: 14.752,
    lng: -17.386,
    gravite: 3,
    ilYAJours: 9,
    derniereMajJours: 8,
    etapes: [
      ['recu', 9, 'Signalement reçu par NIO FAR (exemple fictif).'],
      ['a_verifier', 8, 'Vérification sur place demandée aux relais du secteur.'],
      ['transmis', 8, 'Porté à la connaissance de SONAGED (exemple fictif).'],
    ],
    confirmations: 7,
    confirmationHabitant: null,
    verifieParRelais: true,
    avecAudio: true,
    relanceNiveau: 'j7',
    transcriptionSuggeree: 'Il y a un grand tas d’ordures et de sachets plastiques devant le marché de Pikine depuis plus d’une semaine.',
    motsCles: ['ordures', 'sachets', 'plastique', 'tas'],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    code: 'NF-EX3B7',
    categorie: 'eau_stagnante',
    description: 'Exemple fictif : eau stagnante et caniveau bouché devant l’école primaire.',
    secteur: 'Guédiawaye',
    lat: 14.778,
    lng: -17.397,
    gravite: 3,
    ilYAJours: 14,
    derniereMajJours: 2,
    etapes: [
      ['recu', 14, 'Signalement reçu par NIO FAR (exemple fictif).'],
      ['a_verifier', 13, 'Vérifié par un relais communautaire.'],
      ['transmis', 11, 'Transmis à l’ONAS (exemple fictif).'],
      ['en_cours', 6, 'Équipe de curage annoncée (exemple fictif).'],
      ['resolu', 2, 'Déclaré résolu avec photo après intervention (exemple fictif).'],
    ],
    confirmations: 12,
    confirmationHabitant: true,
    verifieParRelais: true,
    photoApres: true,
    motsCles: ['eau', 'stagnante', 'caniveau'],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    code: 'NF-EX4C9',
    categorie: 'eclairage',
    description: 'Exemple fictif : trois lampadaires éteints dans le noir sur l’avenue principale.',
    secteur: 'Keur Massar',
    lat: 14.787,
    lng: -17.31,
    gravite: 2,
    ilYAJours: 5,
    derniereMajJours: 4,
    etapes: [
      ['recu', 5, 'Signalement reçu par NIO FAR (exemple fictif).'],
      ['a_verifier', 4, 'En attente de vérification terrain (exemple fictif).'],
    ],
    confirmations: 4,
    confirmationHabitant: null,
    verifieParRelais: false,
    avecAudio: true,
    relanceNiveau: 'j3',
    transcriptionSuggeree: 'Trois lampadaires sont éteints la nuit sur la route principale à Keur Massar.',
    motsCles: ['lampadaires', 'éteints', 'nuit'],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    code: 'NF-EX5D3',
    categorie: 'voirie',
    description: 'Exemple fictif : nid-de-poule profond sur la chaussée, dangereux pour les deux-roues la nuit.',
    secteur: 'Thiaroye',
    lat: 14.744,
    lng: -17.369,
    gravite: 3,
    ilYAJours: 20,
    derniereMajJours: 5,
    etapes: [
      ['recu', 20, 'Signalement reçu par NIO FAR (exemple fictif).'],
      ['a_verifier', 19, 'Vérification terrain effectuée.'],
      ['transmis', 17, 'Transmis aux services techniques de la mairie (exemple fictif).'],
      ['en_cours', 10, 'Travaux de rebouchage annoncés (exemple fictif).'],
      ['resolu', 5, 'Déclaré résolu et confirmé par les habitants (exemple fictif).'],
    ],
    confirmations: 9,
    confirmationHabitant: true,
    verifieParRelais: true,
    photoApres: true,
    motsCles: ['nid-de-poule', 'chaussée', 'nuit'],
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    code: 'NF-EX6E8',
    categorie: 'dechets',
    description: 'Exemple fictif : bac collectif qui déborde près du rond-point.',
    secteur: 'Yeumbeul',
    lat: 14.773,
    lng: -17.345,
    gravite: 2,
    ilYAJours: 2,
    derniereMajJours: 1,
    etapes: [
      ['recu', 2, 'Signalement reçu par NIO FAR (exemple fictif).'],
      ['a_verifier', 1, 'Vérification demandée (exemple fictif).'],
    ],
    confirmations: 2,
    confirmationHabitant: null,
    verifieParRelais: false,
    motsCles: ['bac', 'déchets'],
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    code: 'NF-EX7F2',
    categorie: 'eau_stagnante',
    description: 'Exemple fictif : canalisation bouchée, l’eau stagnante revient malgré l’intervention.',
    secteur: 'Mbao',
    lat: 14.742,
    lng: -17.323,
    gravite: 2,
    ilYAJours: 25,
    derniereMajJours: 4,
    etapes: [
      ['recu', 25, 'Signalement reçu par NIO FAR (exemple fictif).'],
      ['a_verifier', 24, 'Vérifié sur place par un relais.'],
      ['transmis', 22, 'Transmis à l’ONAS (exemple fictif).'],
      ['resolu', 12, 'Déclaré résolu (exemple fictif).'],
      ['a_verifier', 4, 'Un habitant signale que le problème est toujours là.'],
    ],
    confirmations: 5,
    confirmationHabitant: false,
    verifieParRelais: true,
    relanceNiveau: 'j3',
    motsCles: ['canalisation', 'eau', 'stagnante'],
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    code: 'NF-EX8G5',
    categorie: 'voirie',
    description: 'Exemple fictif : regard d’égout sans plaque au milieu de la rue.',
    secteur: 'Pikine',
    lat: 14.756,
    lng: -17.394,
    gravite: 3,
    ilYAJours: 1,
    derniereMajJours: 1,
    etapes: [['recu', 1, 'Signalement reçu par NIO FAR (exemple fictif).']],
    confirmations: 3,
    confirmationHabitant: null,
    verifieParRelais: false,
    motsCles: ['regard', 'plaque', 'rue'],
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    code: 'NF-EX9H6',
    categorie: 'eclairage',
    description: 'Exemple fictif : poteau électrique dont l’ampoule clignote près de l’arrêt de bus.',
    secteur: 'Rufisque',
    lat: 14.718,
    lng: -17.271,
    gravite: 1,
    ilYAJours: 11,
    derniereMajJours: 3,
    etapes: [
      ['recu', 11, 'Signalement reçu par NIO FAR (exemple fictif).'],
      ['a_verifier', 9, 'Vérifié par un relais local.'],
      ['transmis', 7, 'Transmis à Senelec ou mairie (exemple fictif).'],
      ['en_cours', 3, 'Intervention programmée (exemple fictif).'],
    ],
    confirmations: 4,
    confirmationHabitant: null,
    verifieParRelais: true,
    motsCles: ['poteau', 'ampoule', 'clignote'],
  },
];

export async function seedUtilisateursDemo(db?: Database): Promise<void> {
  const database = db || (await getDb());

  const adminExist = await database.select().from(users).where(eq(users.email, config.seedAdminEmail));
  if (adminExist.length === 0) {
    const hash = await argon2.hash(config.seedAdminPassword);
    await database.insert(users).values({
      id: '10000000-0000-4000-8000-000000000001',
      email: config.seedAdminEmail,
      nom: 'Administrateur NIO FAR (Démo)',
      passwordHash: hash,
      role: 'admin',
    });
  }

  const relaisExist = await database.select().from(users).where(eq(users.email, config.seedRelaisEmail));
  if (relaisExist.length === 0) {
    const hash = await argon2.hash(config.seedRelaisPassword);
    await database.insert(users).values({
      id: '10000000-0000-4000-8000-000000000002',
      email: config.seedRelaisEmail,
      nom: 'Relais de quartier (Démo)',
      passwordHash: hash,
      role: 'relais',
    });
  }
}

export async function chargerExemplesFictifsEnBase(db?: Database): Promise<number> {
  const database = db || (await getDb());
  const audioDemo = genererAudioWavDemo();
  let ajoutes = 0;

  for (const m of MODELES_EXEMPLES) {
    const exist = await database.select({ id: reports.id }).from(reports).where(eq(reports.id, m.id));
    if (exist.length > 0) continue;

    const historique: EntreeHistoriqueDB[] = m.etapes.map(([statut, n, note]) => ({
      date: joursAvant(n).toISOString(),
      statut,
      note,
    }));
    const statutActuel = historique[historique.length - 1].statut;

    await database.insert(reports).values({
      id: m.id,
      code: m.code,
      categorie: m.categorie,
      description: m.description,
      secteur: m.secteur,
      latitude: m.lat,
      longitude: m.lng,
      gravite: m.gravite,
      photo: illustrationSvg(m.categorie, false),
      audio: m.avecAudio ? audioDemo : null,
      audioMime: m.avecAudio ? 'audio/wav' : null,
      contact: { type: 'whatsapp', valeur: '+221 77 000 00 00' },
      statut: statutActuel,
      estDoublon: false,
      confirmations: m.confirmations,
      confirmationHabitant: m.confirmationHabitant,
      photoApres: m.photoApres ? illustrationSvg(m.categorie, true) : null,
      enAttenteEnvoi: false,
      verifieParRelais: m.verifieParRelais,
      acteurCompetent: SUGGESTIONS_ACTEURS[m.categorie],
      relanceNiveau: m.relanceNiveau ?? 'aucune',
      relanceDate: m.relanceNiveau && m.relanceNiveau !== 'aucune' ? joursAvant(1) : null,
      relanceValideeAdmin: false,
      historique,
      estExemple: true,
      dateCreation: joursAvant(m.ilYAJours),
      dateMiseAJour: joursAvant(m.derniereMajJours),
    });

    await database.insert(reportSuggestions).values({
      id: crypto.randomUUID(),
      reportId: m.id,
      transcriptionSuggeree: m.transcriptionSuggeree ?? '',
      langueDetectee: 'fr',
      confianceTranscription: m.transcriptionSuggeree ? 0.82 : 0,
      fournisseurTranscription: m.avecAudio ? 'Whisper (Français — suggestion)' : 'Mots-clés (description)',
      avertissementTranscription: m.avecAudio
        ? 'Suggestion automatique à écouter et valider par l’administrateur.'
        : null,
      categorieSuggeree: m.categorie,
      motsClesTrouves: m.motsCles ?? [],
      sourceCategorie: 'mots_cles',
      statutValidation: 'en_attente',
    });

    ajoutes++;
  }

  return ajoutes;
}

export async function retirerExemplesFictifsDeBase(db?: Database): Promise<number> {
  const database = db || (await getDb());
  const supprimes = await database
    .delete(reports)
    .where(eq(reports.estExemple, true))
    .returning({ id: reports.id });
  return supprimes.length;
}
