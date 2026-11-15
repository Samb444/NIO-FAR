import { categorieLabels } from './referentiel';
import type { Categorie } from './types';

/** Lien wa.me prérempli — sans aucune donnée personnelle (ni nom, ni contact, ni position précise). */
export function lienWhatsApp(code: string, categorie: Categorie, secteur: string): string {
  const url = `${window.location.origin}/suivre?code=${encodeURIComponent(code)}`;
  const texte = `J’ai signalé un problème « ${categorieLabels[categorie]} » à ${secteur} sur NIO FAR. Code de suivi : ${code}. Suivez-le ou confirmez-le ici : ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(texte)}`;
}

export async function copierTexte(texte: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(texte);
    return;
  }
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.style.position = 'fixed';
  zone.style.opacity = '0';
  document.body.appendChild(zone);
  zone.select();
  const ok = document.execCommand('copy');
  zone.remove();
  if (!ok) throw new Error('Copie impossible : notez le code à la main.');
}
