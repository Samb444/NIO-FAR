import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, List, Map as MapIcon, MapPin, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { categories } from '../lib/categories';
import { SECTEURS, STATUTS, statutInfos } from '../lib/referentiel';
import type { Categorie, Statut } from '../lib/types';
import { useChargement, useTitre } from '../lib/hooks';
import { CarteSignalement } from '../components/CarteSignalement';
import { EnTetePage, EtatErreur, EtatVide, Squelette, SqueletteCartes, btn } from '../components/ui';

const Carte = lazy(() => import('../components/CarteSignalements'));

export default function Signalements() {
  useTitre('Carte et liste des signalements');
  const [vue, setVue] = useState<'carte' | 'liste'>('carte');
  const [secteur, setSecteur] = useState('');
  const [cats, setCats] = useState<Categorie[]>([]);
  const [statuts, setStatuts] = useState<Statut[]>([]);
  const [actionEx, setActionEx] = useState(false);

  const { etat, recharger } = useChargement(
    () => api.listerSignalements({ secteur: secteur || undefined, categories: cats, statuts }),
    [secteur, cats.join(','), statuts.join(',')],
  );

  const basculer = <T,>(l: T[], v: T) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

  const chargerExemples = async () => {
    setActionEx(true);
    try {
      await api.chargerExemples();
      recharger();
    } finally {
      setActionEx(false);
    }
  };
  const retirerExemples = async () => {
    setActionEx(true);
    try {
      await api.retirerExemples();
      recharger();
    } finally {
      setActionEx(false);
    }
  };

  const contientExemples = etat.etat === 'ok' && etat.donnees.some((s) => s.estExemple);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:pt-28" aria-labelledby="titre-sig">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <EnTetePage titre="Les signalements" intro="Carte et liste publique des problèmes signalés et suivis dans les quartiers." />
        <div className="glass mb-6 inline-flex rounded-full p-1 shadow-soft" role="tablist" aria-label="Mode d’affichage">
          {(
            [
              ['carte', 'Carte', MapIcon],
              ['liste', 'Liste', List],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={vue === id}
              onClick={() => setVue(id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors ${
                vue === id ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="glass rounded-3xl p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden />
            <select
              aria-label="Secteur"
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              className="min-h-11 appearance-none rounded-full border border-line bg-bg-elev pl-9 pr-7 text-sm font-semibold outline-none focus:border-accent"
            >
              <option value="">Tous les secteurs</option>
              {SECTEURS.map((s) => (
                <option key={s.nom} value={s.nom}>
                  {s.nom}
                </option>
              ))}
            </select>
          </div>
          {categories.map((c) => {
            const actif = cats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={actif}
                onClick={() => setCats((l) => basculer(l, c.id))}
                className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold ${
                  actif ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-bg-elev'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Légende / filtres par statut */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Statuts :</span>
          {STATUTS.map((st) => {
            const info = statutInfos[st];
            const actif = statuts.includes(st);
            return (
              <button
                key={st}
                type="button"
                aria-pressed={actif}
                onClick={() => setStatuts((l) => basculer(l, st))}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${
                  actif ? 'border-fg bg-fg text-bg' : 'border-line bg-bg-elev'
                }`}
              >
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: info.couleur }} />
                {info.label}
              </button>
            );
          })}
          {(secteur || cats.length > 0 || statuts.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSecteur('');
                setCats([]);
                setStatuts([]);
              }}
              className="min-h-11 rounded-full px-3 text-xs font-bold text-accent hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {etat.etat === 'chargement' && (vue === 'carte' ? <Squelette className="h-[62svh] w-full" /> : <SqueletteCartes n={6} />)}
        {etat.etat === 'erreur' && <EtatErreur message={etat.message} onReessayer={() => recharger()} />}
        {etat.etat === 'ok' && etat.donnees.length === 0 && (
          <EtatVide
            titre="Aucun signalement à afficher"
            texte="Créez un signalement réel ou chargez les exemples fictifs pour explorer la carte et les statuts."
            action={
              <>
                <Link to="/signaler" className={`${btn.base} ${btn.primary}`}>
                  Signaler un problème
                </Link>
                <button type="button" onClick={() => void chargerExemples()} disabled={actionEx} className={`${btn.base} ${btn.secondary}`}>
                  <FlaskConical size={18} aria-hidden /> Charger des exemples fictifs
                </button>
              </>
            }
          />
        )}
        {etat.etat === 'ok' && etat.donnees.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-fg-muted">
              <span>
                {etat.donnees.length} signalement{etat.donnees.length > 1 ? 's' : ''} · positions arrondies à ~100 m
              </span>
              {contientExemples ? (
                <button type="button" onClick={() => void retirerExemples()} disabled={actionEx} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:underline">
                  <Trash2 size={15} aria-hidden /> Retirer les exemples fictifs
                </button>
              ) : (
                <button type="button" onClick={() => void chargerExemples()} disabled={actionEx} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:underline">
                  <FlaskConical size={15} aria-hidden /> Ajouter les exemples fictifs
                </button>
              )}
            </div>
            {vue === 'carte' ? (
              <Suspense fallback={<Squelette className="h-[62svh] w-full" />}>
                <Carte items={etat.donnees} />
              </Suspense>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {etat.donnees.map((s) => (
                  <li key={s.id}>
                    <CarteSignalement s={s} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
