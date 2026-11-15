/**
 * Extracteur de catégorie par mots-clés (FR + wolof), alimenté par src/data/keywords.json.
 * Le résultat est une SUGGESTION : l'habitant garde toujours la main sur la catégorie.
 */
import donnees from '../data/keywords.json';
import type { Categorie } from './types';

type Langue = 'fr' | 'wo';
type FichierMotsCles = {
  langues: Record<Langue, { valide: boolean; categories: Record<Categorie, string[]> }>;
};

const fichier = donnees as FichierMotsCles;

function normaliser(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type SuggestionCategorie = {
  categorie: Categorie;
  score: number;
  motsTrouves: string[];
};

export function suggererCategorie(texte: string): SuggestionCategorie | null {
  const t = ` ${normaliser(texte).replace(/[^a-z0-9\- ]/g, ' ')} `;
  if (t.trim().length < 2) return null;
  const scores = new Map<Categorie, SuggestionCategorie>();
  for (const langue of Object.keys(fichier.langues) as Langue[]) {
    const cats = fichier.langues[langue].categories;
    for (const cat of Object.keys(cats) as Categorie[]) {
      for (const mot of cats[cat]) {
        const m = normaliser(mot);
        if (!m) continue;
        if (t.includes(` ${m} `)) {
          const cur = scores.get(cat) ?? { categorie: cat, score: 0, motsTrouves: [] };
          cur.score += m.includes(' ') || m.includes('-') ? 2 : 1;
          cur.motsTrouves.push(mot);
          scores.set(cat, cur);
        }
      }
    }
  }
  const tri = [...scores.values()].sort((a, b) => b.score - a.score);
  return tri[0] ?? null;
}

export function motsClesWolofDisponibles(): boolean {
  return Object.values(fichier.langues.wo.categories).some((l) => l.length > 0);
}
