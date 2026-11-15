import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FlaskConical, Loader2, MapPin, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { categories } from '../lib/categories';
import { SECTEURS, categorieLabels } from '../lib/referentiel';
import type { Categorie } from '../lib/types';
import { normaliserCode, depuis, messageErreur } from '../lib/utils';
import { memoireAppareil, useHorsLigne } from '../lib/offline';
import { useChargement, useTitre } from '../lib/hooks';
import { CarteSignalement } from '../components/CarteSignalement';
import { BadgeEnAttente, EnTetePage, EtatErreur, EtatVide, SqueletteCartes, btn } from '../components/ui';

export default function Suivre() {
  useTitre('Suivre un signalement');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [codeSaisi, setCodeSaisi] = useState(params.get('code') ?? '');
  const [codeInfo, setCodeInfo] = useState<{ etat: 'repos' | 'cours' | 'erreur'; message?: string }>({ etat: 'repos' });
  const [secteur, setSecteur] = useState(params.get('secteur') ?? '');
  const [cats, setCats] = useState<Categorie[]>([]);
  const [actionEx, setActionEx] = useState(false);
  const { enAttente, enLigne, synchroniser, synchroEnCours } = useHorsLigne();
  const mesRecents = memoireAppareil.mesSignalements();

  const codeFiltre = params.get('code') ? normaliserCode(params.get('code')!) ?? undefined : undefined;
  const { etat, recharger } = useChargement(
    () => api.listerSignalements({ code: codeFiltre, secteur: secteur || undefined, categories: cats }),
    [codeFiltre, secteur, cats.join(','), enAttente.length],
  );

  const chercherCode = async (e: FormEvent) => {
    e.preventDefault();
    const norm = normaliserCode(codeSaisi);
    if (!norm) {
      setCodeInfo({ etat: 'erreur', message: 'Entrez un code à 5 caractères, par exemple NF-23456.' });
      return;
    }
    const local = enAttente.find((x) => x.code === norm);
    if (local) {
      setCodeInfo({ etat: 'erreur', message: `Le signalement ${norm} est sur votre téléphone, en attente d’envoi.` });
      return;
    }
    setCodeInfo({ etat: 'cours' });
    try {
      const s = await api.obtenirParCode(norm);
      if (s) {
        navigate(`/signalements/${s.id}`);
        return;
      }
      setCodeInfo({ etat: 'erreur', message: `Aucun signalement trouvé pour le code ${norm}.` });
    } catch (err) {
      setCodeInfo({ etat: 'erreur', message: messageErreur(err) });
    }
  };

  const basculerCat = (c: Categorie) =>
    setCats((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));

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
    <section className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:pt-28" aria-labelledby="titre-suivre">
      <EnTetePage
        titre="Suivre avec un simple code, sans compte"
        intro="Retrouvez votre signalement avec son code NF-XXXXX, ou parcourez ceux de votre secteur."
      />

      {/* Recherche directe par code */}
      <form onSubmit={(e) => void chercherCode(e)} className="glass rounded-3xl p-4 shadow-soft sm:p-6">
        <label htmlFor="code-suivi" className="block font-bold">
          Vous avez un code de suivi ?
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="code-suivi"
            type="text"
            value={codeSaisi}
            onChange={(e) => {
              setCodeSaisi(e.target.value);
              setCodeInfo({ etat: 'repos' });
            }}
            placeholder="NF-XXXXX"
            maxLength={10}
            className="min-h-12 flex-1 rounded-2xl border border-line bg-bg-elev px-4 font-mono text-lg uppercase tracking-wider outline-none focus:border-accent"
          />
          <button type="submit" disabled={codeInfo.etat === 'cours'} className={`${btn.base} ${btn.accent}`}>
            {codeInfo.etat === 'cours' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Search size={18} aria-hidden />}
            Ouvrir la fiche
          </button>
          {codeFiltre && (
            <button
              type="button"
              onClick={() => {
                setCodeSaisi('');
                setParams({});
              }}
              className={`${btn.base} ${btn.ghost}`}
            >
              <X size={18} aria-hidden /> Effacer
            </button>
          )}
        </div>
        {codeInfo.message && (
          <p role="alert" className="mt-2 text-sm font-medium">
            {codeInfo.message}
          </p>
        )}
      </form>

      {/* File d'attente hors-ligne */}
      {enAttente.length > 0 && (
        <div className="mt-6 rounded-3xl border border-ochre/60 bg-ochre/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BadgeEnAttente />
              <span className="font-bold">
                {enAttente.length} signalement{enAttente.length > 1 ? 's' : ''} stocké{enAttente.length > 1 ? 's' : ''} sur cet appareil
              </span>
            </div>
            {enLigne && (
              <button type="button" onClick={() => void synchroniser()} disabled={synchroEnCours} className={`${btn.base} ${btn.secondary} min-h-11 text-sm`}>
                <RefreshCw size={16} className={synchroEnCours ? 'animate-spin' : ''} aria-hidden /> Synchroniser maintenant
              </button>
            )}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {enAttente.map((x) => (
              <li key={x.id} className="rounded-2xl bg-bg-elev p-3 text-sm">
                <span className="font-mono font-bold text-accent">{x.code}</span> · {categorieLabels[x.categorie]} · {x.secteur}
                <p className="line-clamp-1 text-fg-muted">{x.description || 'Note vocale ou photo'}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Codes récents enregistrés sur cet appareil */}
      {mesRecents.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-fg-muted">Sur cet appareil :</span>
          {mesRecents.slice(0, 6).map((m) => (
            <Link
              key={m.id}
              to={`/signalements/${m.id}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-bg-elev px-3.5 font-mono font-bold text-accent hover:border-accent"
            >
              {m.code} <span className="font-sans text-xs font-normal text-fg-muted">({depuis(m.date)})</span>
            </Link>
          ))}
        </div>
      )}

      {/* Filtres par secteur et par catégorie */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-64">
          <MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden />
          <select
            aria-label="Filtrer par secteur"
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className="min-h-12 w-full appearance-none rounded-full border border-line bg-bg-elev pl-11 pr-8 text-sm font-semibold outline-none focus:border-accent"
          >
            <option value="">Tous les secteurs</option>
            {SECTEURS.map((s) => (
              <option key={s.nom} value={s.nom}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
          {categories.map((c) => {
            const actif = cats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={actif}
                onClick={() => basculerCat(c.id)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  actif ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-bg-elev text-fg hover:border-accent'
                }`}
              >
                {c.label}
              </button>
            );
          })}
          {(secteur || cats.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSecteur('');
                setCats([]);
              }}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-fg-muted hover:text-fg"
            >
              Tout afficher
            </button>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="mt-6">
        {etat.etat === 'chargement' && <SqueletteCartes n={6} />}
        {etat.etat === 'erreur' && <EtatErreur message={etat.message} onReessayer={() => recharger()} />}
        {etat.etat === 'ok' && etat.donnees.length === 0 && (
          <EtatVide
            titre="Aucun signalement à afficher"
            texte={
              secteur || cats.length > 0
                ? 'Aucun signalement ne correspond à ces filtres.'
                : 'La base est vide par défaut : aucune donnée fictive n’est affichée sans votre accord.'
            }
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-fg-muted">
              <span>
                {etat.donnees.length} signalement{etat.donnees.length > 1 ? 's' : ''}
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
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {etat.donnees.map((s) => (
                <li key={s.id}>
                  <CarteSignalement s={s} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
