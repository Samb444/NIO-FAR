/** Petits utilitaires sans dépendance. */

export function genererUUID(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Alphabet sans caractères ambigus (pas de 0/O, 1/I/L) : plus facile à dicter au téléphone. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function genererCodeSuivi(): string {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  return `NF-${Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('')}`;
}

/** Normalise une saisie libre en code « NF-XXXXX » si possible. */
export function normaliserCode(saisie: string): string | null {
  const brut = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const corps = brut.startsWith('NF') ? brut.slice(2) : brut;
  if (corps.length !== 5) return null;
  return `NF-${corps}`;
}

export function arrondir3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateHeureFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formaterDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
export function formaterDateHeure(iso: string): string {
  return dateHeureFmt.format(new Date(iso));
}

export function depuis(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return `il y a ${j} jour${j > 1 ? 's' : ''}`;
}

export function messageErreur(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Une erreur inattendue est survenue.';
}

export function lireCommeDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
    r.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    r.readAsDataURL(blob);
  });
}
