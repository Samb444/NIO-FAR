import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { reports, reportSuggestions, transcriptionJobs, type CategorieDB } from '../db/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYWORDS_PATH = path.resolve(__dirname, '../data/keywords.json');

export type LangueIndice = 'fr' | 'wo' | 'inconnue';

export type ResultatTranscription = {
  texte: string;
  langue: LangueIndice;
  confiance: number;
  fournisseur: string;
  estSuggestion: true;
  avertissement: string | null;
};

export interface TranscriptionProvider {
  readonly nom: string;
  readonly langueCible: 'fr' | 'wo';
  readonly actif: boolean;
  transcrire(audioSource: string): Promise<ResultatTranscription>;
}

/**
 * Adaptateur Français (Whisper ou service compatible OpenAI / Whisper local).
 */
export class WhisperFrenchAdapter implements TranscriptionProvider {
  readonly nom = 'Whisper (Français)';
  readonly langueCible = 'fr' as const;

  get actif(): boolean {
    return Boolean(config.whisperApiKey);
  }

  async transcrire(audioSource: string): Promise<ResultatTranscription> {
    if (!this.actif) {
      return {
        texte: '',
        langue: 'fr',
        confiance: 0,
        fournisseur: this.nom,
        estSuggestion: true,
        avertissement:
          'Adaptateur Whisper français configuré mais aucune clé WHISPER_API_KEY n’est définie. L’audio original reste disponible pour écoute humaine.',
      };
    }

    try {
      let buffer: Buffer;
      if (audioSource.startsWith('data:')) {
        const base64 = audioSource.split(',')[1] || '';
        buffer = Buffer.from(base64, 'base64');
      } else if (fs.existsSync(audioSource)) {
        buffer = fs.readFileSync(audioSource);
      } else {
        throw new Error('Fichier audio introuvable pour la transcription.');
      }

      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(buffer)], { type: 'audio/webm' }), 'note.webm');
      form.append('model', config.whisperModel);
      form.append('language', 'fr');

      const res = await fetch(config.whisperApiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.whisperApiKey}` },
        body: form,
      });

      if (!res.ok) {
        throw new Error(`Erreur service Whisper (${res.status})`);
      }

      const data = (await res.json()) as { text?: string };
      return {
        texte: (data.text || '').trim(),
        langue: 'fr',
        confiance: 0.75,
        fournisseur: this.nom,
        estSuggestion: true,
        avertissement: 'Transcription automatique française (suggestion à relire et valider par un humain).',
      };
    } catch (err) {
      return {
        texte: '',
        langue: 'fr',
        confiance: 0,
        fournisseur: this.nom,
        estSuggestion: true,
        avertissement: `Échec de la transcription automatique (${err instanceof Error ? err.message : 'erreur'}). L’audio reste disponible pour écoute humaine.`,
      };
    }
  }
}

/**
 * Adaptateur Wolof (modèle open source à évaluer — DÉSACTIVÉ PAR DÉFAUT).
 * Règle éthique & technique : n'affirme jamais qu'un modèle comprend le wolof sans validation explicite.
 */
export class WolofExperimentalAdapter implements TranscriptionProvider {
  readonly nom = 'Adaptateur Wolof (expérimental — à évaluer)';
  readonly langueCible = 'wo' as const;

  get actif(): boolean {
    return config.wolofAsrEnabled && Boolean(config.wolofAsrUrl);
  }

  async transcrire(_audioSource: string): Promise<ResultatTranscription> {
    if (!this.actif) {
      return {
        texte: '',
        langue: 'wo',
        confiance: 0,
        fournisseur: this.nom,
        estSuggestion: true,
        avertissement:
          'L’adaptateur de transcription wolof est désactivé par défaut tant qu’il n’a pas été évalué et validé sur un corpus local. Écoutez la note vocale directement.',
      };
    }

    return {
      texte: '',
      langue: 'wo',
      confiance: 0,
      fournisseur: this.nom,
      estSuggestion: true,
      avertissement:
        'Modèle wolof en cours d’évaluation : toute sortie doit être vérifiée par un locuteur natif avant validation.',
    };
  }
}

const adaptateurFr = new WhisperFrenchAdapter();
const adaptateurWo = new WolofExperimentalAdapter();

export function obtenirAdaptateurTranscription(langue: LangueIndice = 'fr'): TranscriptionProvider {
  if (langue === 'wo') return adaptateurWo;
  return adaptateurFr;
}

/* -------------------------------------------------------------------------- */
/* Extraction de catégorie : mots-clés (JSON éditable) d'abord, LLM ensuite    */
/* -------------------------------------------------------------------------- */

type FichierMotsCles = {
  langues: Record<
    'fr' | 'wo',
    {
      valide: boolean;
      categories: Record<CategorieDB, string[]>;
    }
  >;
};

function lireMotsCles(): FichierMotsCles {
  const brut = fs.readFileSync(KEYWORDS_PATH, 'utf-8');
  return JSON.parse(brut) as FichierMotsCles;
}

function normaliserTexte(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type SuggestionExtractionCategorie = {
  categorie: CategorieDB | null;
  motsTrouves: string[];
  source: 'mots_cles' | 'llm_suggestion' | 'aucune';
  estSuggestion: true;
};

export async function extraireSuggestionCategorie(texte: string): Promise<SuggestionExtractionCategorie> {
  const propre = ` ${normaliserTexte(texte).replace(/[^a-z0-9\- ]/g, ' ')} `;
  if (propre.trim().length >= 2) {
    const fichier = lireMotsCles();
    const scores = new Map<CategorieDB, { score: number; mots: string[] }>();

    for (const langue of ['fr', 'wo'] as const) {
      const bloc = fichier.langues[langue];
      if (!bloc) continue;
      for (const cat of Object.keys(bloc.categories) as CategorieDB[]) {
        for (const mot of bloc.categories[cat]) {
          const m = normaliserTexte(mot);
          if (!m) continue;
          if (propre.includes(` ${m} `)) {
            const cur = scores.get(cat) ?? { score: 0, mots: [] };
            cur.score += m.includes(' ') || m.includes('-') ? 2 : 1;
            cur.mots.push(mot);
            scores.set(cat, cur);
          }
        }
      }
    }

    const meilleur = [...scores.entries()].sort((a, b) => b[1].score - a[1].score)[0];
    if (meilleur) {
      return {
        categorie: meilleur[0],
        motsTrouves: meilleur[1].mots,
        source: 'mots_cles',
        estSuggestion: true,
      };
    }
  }

  // Option 2 : LLM en second recours (uniquement si activé, jamais décisionnel)
  if (config.llmCategoryEnabled && config.llmApiUrl && config.llmApiKey && texte.trim().length > 5) {
    try {
      const res = await fetch(config.llmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.llmApiKey}`,
        },
        body: JSON.stringify({ text: texte }),
      });
      if (res.ok) {
        const data = (await res.json()) as { categorie?: CategorieDB };
        if (data.categorie && ['dechets', 'eau_stagnante', 'eclairage', 'voirie'].includes(data.categorie)) {
          return {
            categorie: data.categorie,
            motsTrouves: [],
            source: 'llm_suggestion',
            estSuggestion: true,
          };
        }
      }
    } catch {
      /* Le LLM est optionnel et ne doit jamais bloquer */
    }
  }

  return {
    categorie: null,
    motsTrouves: [],
    source: 'aucune',
    estSuggestion: true,
  };
}

/* -------------------------------------------------------------------------- */
/* File de tâches (table transcription_jobs)                                   */
/* -------------------------------------------------------------------------- */

export async function planifierJobTranscription(reportId: string, langueIndice: LangueIndice = 'fr'): Promise<string> {
  const db = await getDb();
  const jobId = crypto.randomUUID();
  await db.insert(transcriptionJobs).values({
    id: jobId,
    reportId,
    langueIndice,
    statut: 'en_attente',
    tentatives: 0,
  });

  // Exécution asynchrone non-bloquante : si le job échoue, le signalement reste valide
  setImmediate(() => {
    void traiterJobTranscription(jobId).catch(() => {
      /* erreur déjà enregistrée dans transcription_jobs */
    });
  });

  return jobId;
}

export async function traiterJobTranscription(jobId: string): Promise<void> {
  const db = await getDb();
  const [job] = await db.select().from(transcriptionJobs).where(eq(transcriptionJobs.id, jobId));
  if (!job || job.statut === 'termine') return;

  await db
    .update(transcriptionJobs)
    .set({ statut: 'en_cours', tentatives: job.tentatives + 1, updatedAt: new Date() })
    .where(eq(transcriptionJobs.id, jobId));

  try {
    const [rep] = await db.select().from(reports).where(eq(reports.id, job.reportId));
    if (!rep) {
      await db
        .update(transcriptionJobs)
        .set({ statut: 'echoue', erreur: 'Signalement introuvable', updatedAt: new Date() })
        .where(eq(transcriptionJobs.id, jobId));
      return;
    }

    const adaptateur = obtenirAdaptateurTranscription(job.langueIndice as LangueIndice);
    let resultatAudio: ResultatTranscription = {
      texte: '',
      langue: (job.langueIndice as LangueIndice) || 'fr',
      confiance: 0,
      fournisseur: adaptateur.nom,
      estSuggestion: true,
      avertissement: rep.audio
        ? null
        : 'Aucune note vocale jointe : suggestion établie à partir de la description écrite.',
    };

    if (rep.audio) {
      resultatAudio = await adaptateur.transcrire(rep.audio);
    }

    const texteAnalyse = [resultatAudio.texte, rep.description].filter(Boolean).join(' ');
    const extraction = await extraireSuggestionCategorie(texteAnalyse);

    const existing = await db.select().from(reportSuggestions).where(eq(reportSuggestions.reportId, rep.id));
    if (existing.length > 0) {
      await db
        .update(reportSuggestions)
        .set({
          transcriptionSuggeree: resultatAudio.texte || existing[0].transcriptionSuggeree,
          langueDetectee: resultatAudio.langue,
          confianceTranscription: resultatAudio.confiance,
          fournisseurTranscription: resultatAudio.fournisseur,
          avertissementTranscription: resultatAudio.avertissement,
          categorieSuggeree: extraction.categorie,
          motsClesTrouves: extraction.motsTrouves,
          sourceCategorie: extraction.source,
          updatedAt: new Date(),
        })
        .where(eq(reportSuggestions.reportId, rep.id));
    } else {
      await db.insert(reportSuggestions).values({
        id: crypto.randomUUID(),
        reportId: rep.id,
        transcriptionSuggeree: resultatAudio.texte,
        langueDetectee: resultatAudio.langue,
        confianceTranscription: resultatAudio.confiance,
        fournisseurTranscription: resultatAudio.fournisseur,
        avertissementTranscription: resultatAudio.avertissement,
        categorieSuggeree: extraction.categorie,
        motsClesTrouves: extraction.motsTrouves,
        sourceCategorie: extraction.source,
        statutValidation: 'en_attente',
      });
    }

    await db
      .update(transcriptionJobs)
      .set({ statut: 'termine', erreur: null, updatedAt: new Date() })
      .where(eq(transcriptionJobs.id, jobId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue lors de la transcription';
    await db
      .update(transcriptionJobs)
      .set({ statut: 'echoue', erreur: msg, updatedAt: new Date() })
      .where(eq(transcriptionJobs.id, jobId));
  }
}
