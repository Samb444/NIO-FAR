import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { STATUTS, statutInfos } from '../lib/referentiel';
import type { EntreeHistorique, Statut } from '../lib/types';
import { formaterDateHeure } from '../lib/utils';

/** Frise verticale animée des 5 statuts. */
export function FriseStatuts({ statut, historique }: { statut: Statut; historique: EntreeHistorique[] }) {
  const index = STATUTS.indexOf(statut);
  return (
    <ol className="relative" aria-label="Avancement du signalement">
      {STATUTS.map((st, i) => {
        const info = statutInfos[st];
        const atteint = i <= index;
        const actuel = i === index;
        const derniere = [...historique].reverse().find((h) => h.statut === st);
        return (
          <li key={st} className="relative flex gap-4 pb-6 last:pb-0" aria-current={actuel ? 'step' : undefined}>
            {i < STATUTS.length - 1 && (
              <div aria-hidden className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 bg-line">
                <motion.div
                  className="w-full origin-top bg-accent"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: i < index ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.2 }}
                  style={{ height: '100%' }}
                />
              </div>
            )}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 + i * 0.2 }}
              className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${
                atteint ? 'border-transparent text-white' : 'border-line bg-bg-elev text-fg-muted'
              }`}
              style={atteint ? { background: info.couleur } : undefined}
            >
              {actuel && <span aria-hidden className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: info.couleur }} />}
              {atteint && !actuel ? <Check size={18} aria-hidden /> : <span className="text-sm font-bold">{i + 1}</span>}
            </motion.div>
            <div className="pt-1.5">
              <p className={`font-bold ${atteint ? '' : 'text-fg-muted'}`}>
                {info.label}
                {actuel && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-fg">Actuel</span>}
              </p>
              <p className="text-sm text-fg-muted">{info.description}</p>
              {derniere && <p className="mt-0.5 text-xs font-semibold text-fg-muted">{formaterDateHeure(derniere.date)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
