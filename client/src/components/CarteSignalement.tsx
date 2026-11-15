import { Link } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';
import { categoryColors } from '../lib/tokens';
import { categorieLabels } from '../lib/referentiel';
import type { SignalementPublic } from '../lib/types';
import { depuis } from '../lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { BadgeEnAttente, BadgeExemple, BadgeStatut, TiltCard } from './ui';

export function CarteSignalement({ s }: { s: SignalementPublic }) {
  const couleur = categoryColors[s.categorie];
  return (
    <TiltCard>
      <Link
        to={`/signalements/${s.id}`}
        className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl shadow-soft transition-shadow hover:shadow-glow"
      >
        <div className="relative h-36 overflow-hidden" style={{ background: `${couleur}22` }}>
          {s.photo ? (
            <img src={s.photo} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="mx-auto h-full w-28 p-3 text-ink dark:text-sand">
              <CategoryIcon id={s.categorie} />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {s.estExemple && <BadgeExemple />}
            {s.enAttenteEnvoi && <BadgeEnAttente />}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: couleur }} />
              {categorieLabels[s.categorie]}
            </span>
            <BadgeStatut statut={s.statut} taille="sm" />
          </div>
          <p className="mt-2 line-clamp-2 text-fg-muted">{s.description || 'Signalement sans description (note vocale ou photo).'}</p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} aria-hidden /> {s.secteur}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={14} aria-hidden /> {s.confirmations} confirmation{s.confirmations > 1 ? 's' : ''}
            </span>
            <span>{depuis(s.dateCreation)}</span>
          </div>
          <p className="mt-2 font-mono text-sm font-bold tracking-wider text-accent">{s.code}</p>
        </div>
      </Link>
    </TiltCard>
  );
}
