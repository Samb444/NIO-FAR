/**
 * Transcription des notes vocales.
 *
 * `TranscriptionProvider` est l'interface à implémenter plus tard (service de reconnaissance
 * vocale FR/wolof validé). Toute transcription est une SUGGESTION modifiable, jamais une vérité.
 */
export type LangueIndice = 'fr' | 'wo' | 'inconnue';

export type SuggestionTranscription = {
  texte: string;
  langue: LangueIndice;
  /** 0 à 1 — indicatif uniquement. */
  confiance: number;
  /** Toujours vrai : rappel que le texte doit être relu par l'habitant. */
  estSuggestion: true;
  /** Mention à afficher (ex. « transcription de démonstration »). */
  avertissement: string | null;
};

export interface TranscriptionProvider {
  readonly nom: string;
  readonly disponible: boolean;
  transcrire(audio: Blob, indice?: LangueIndice): Promise<SuggestionTranscription>;
}

/**
 * Implémentation factice : n'analyse PAS l'audio.
 * Elle renvoie un texte vide à compléter, pour ne jamais présenter une fausse transcription.
 */
export class TranscriptionFactice implements TranscriptionProvider {
  readonly nom = 'Factice (aucune reconnaissance vocale)';
  readonly disponible = false;

  async transcrire(audio: Blob, indice: LangueIndice = 'inconnue'): Promise<SuggestionTranscription> {
    await new Promise((r) => setTimeout(r, 600));
    if (audio.size === 0) throw new Error('La note vocale est vide.');
    return {
      texte: '',
      langue: indice,
      confiance: 0,
      estSuggestion: true,
      avertissement:
        'La transcription automatique n’est pas encore activée. Votre note vocale sera jointe telle quelle : vous pouvez ajouter quelques mots si vous le souhaitez.',
    };
  }
}

export const transcription: TranscriptionProvider = new TranscriptionFactice();
