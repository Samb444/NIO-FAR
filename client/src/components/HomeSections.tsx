import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, CheckCircle2, Clock, FlaskConical, Mic, Search, ShieldAlert, Trash2, Users } from 'lucide-react';
import { api } from '../lib/api';
import { STATUTS, categorieLabels, statutInfos } from '../lib/referentiel';
import type { Categorie } from '../lib/types';
import { normaliserCode } from '../lib/utils';
import { useChargement } from '../lib/hooks';
import { ButtonLink } from './ButtonLink';
import { Reveal, SectionHeading } from './Reveal';
import { BadgeExemple, EtatErreur, Squelette, TiltCard, btn } from './ui';

/* 1. Section « Parlez, on s'occupe du reste » */
export function SectionVocale() {
  return (
    <section id="vocal" aria-labelledby="vocal-title" className="relative py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionHeading
            id="vocal-title"
            eyebrow="Signalement vocal"
            title={
              <>
                Parlez, <span className="text-accent">on s’occupe du reste.</span>
              </>
            }
            intro="Pas besoin de savoir écrire en français pour signaler un problème. Appuyez sur le micro et décrivez la situation en wolof ou en français, en 30 secondes."
          />
          <ul className="mt-6 space-y-2.5 text-fg-muted">
            <li>• Écoute avant envoi et possibilité de réenregistrer à tout moment.</li>
            <li>• Suggestion automatique de catégorie par mots-clés, toujours modifiable.</li>
            <li>• Fonctionne même hors-ligne : la note est envoyée dès le retour du réseau.</li>
          </ul>
          <div className="mt-8">
            <ButtonLink to="/signaler" variant="primary">
              <Mic size={18} aria-hidden /> Signaler à la voix
            </ButtonLink>
          </div>
        </div>

        <Reveal delay={0.15}>
          <TiltCard>
            <div className="glass relative overflow-hidden rounded-5xl p-8 text-center shadow-soft">
              <div className="mx-auto relative grid h-32 w-32 place-items-center">
                {[0, 1].map((i) => (
                  <motion.span
                    key={i}
                    aria-hidden
                    className="absolute inset-2 rounded-full bg-ochre/40"
                    animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
                    transition={{ duration: 2.2, delay: i * 1.1, repeat: Infinity, ease: 'easeOut' }}
                  />
                ))}
                <span className="relative grid h-24 w-24 place-items-center rounded-full bg-ochre text-ink shadow-cta">
                  <Mic size={40} aria-hidden />
                </span>
              </div>
              <p className="mt-4 font-display text-xl font-bold">« Waxal ci wolof walla ci faranse »</p>
              <p className="mt-1 text-sm text-fg-muted">Note vocale de 30 s maximum · écoutable avant l’envoi</p>
              <div aria-hidden className="mt-5 flex items-center justify-center gap-1">
                {[14, 26, 18, 34, 22, 38, 16, 30, 24, 14, 28, 20].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 rounded-full bg-accent"
                    animate={{ height: [h * 0.5, h, h * 0.6] }}
                    transition={{ duration: 1.2, delay: i * 0.08, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ height: h }}
                  />
                ))}
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}

/* 2. Section « Suivez avec un simple code, sans compte » */
export function SectionSuiviSansCompte() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    const norm = normaliserCode(code);
    if (!norm) {
      setErreur('Exemple de format attendu : NF-23456.');
      return;
    }
    navigate(`/suivre?code=${encodeURIComponent(norm)}`);
  };

  return (
    <section id="suivi-code" aria-labelledby="code-title" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="glass grid items-center gap-8 rounded-5xl p-6 shadow-soft sm:p-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionHeading
              id="code-title"
              eyebrow="Sans inscription"
              title={
                <>
                  Suivez avec un simple code, <span className="text-accent">sans compte.</span>
                </>
              }
              intro="Aucun mot de passe, aucun profil à créer. À la fin de votre signalement, vous recevez un code court de la forme NF-XXXXX à noter ou à partager sur WhatsApp."
            />
          </div>

          <Reveal delay={0.1}>
            <form onSubmit={soumettre} className="rounded-4xl border border-line bg-bg-elev p-5 sm:p-6">
              <label htmlFor="accueil-code" className="block font-bold">
                Entrer un code de suivi
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="accueil-code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setErreur(null);
                  }}
                  placeholder="NF-XXXXX"
                  maxLength={10}
                  className="min-h-12 flex-1 rounded-2xl border border-line bg-bg px-4 font-mono text-lg uppercase tracking-wider outline-none focus:border-accent"
                />
                <button type="submit" className={`${btn.base} ${btn.accent}`}>
                  <Search size={18} aria-hidden /> Suivre
                </button>
              </div>
              {erreur && <p role="alert" className="mt-2 text-sm">{erreur}</p>}
              <p className="mt-3 text-xs text-fg-muted">
                Pas de code ?{' '}
                <a href="/suivre" className="font-semibold text-accent underline">
                  Chercher par secteur →
                </a>
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* 3. Section « Transparence » (indicateurs publics) */
export function SectionTransparence() {
  const { etat, recharger } = useChargement(() => api.indicateursPublics(), []);
  const [enCours, setEnCours] = useState(false);

  const basculerExemples = async (charger: boolean) => {
    setEnCours(true);
    try {
      if (charger) await api.chargerExemples();
      else await api.retirerExemples();
      recharger();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section id="transparence" aria-labelledby="trans-title" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="trans-title"
            eyebrow="Transparence"
            title={
              <>
                Des indicateurs <span className="text-accent">publics et honnêtes.</span>
              </>
            }
            intro="Les chiffres ci-dessous sont calculés en direct sur les signalements enregistrés. Aucune statistique inventée."
          />
          {etat.etat === 'ok' && (
            <div className="flex flex-wrap items-center gap-2">
              {etat.donnees.contientExemples && <BadgeExemple />}
              {etat.donnees.contientExemples ? (
                <button type="button" onClick={() => void basculerExemples(false)} disabled={enCours} className={`${btn.base} ${btn.secondary} text-sm`}>
                  <Trash2 size={16} aria-hidden /> Retirer les exemples fictifs
                </button>
              ) : (
                <button type="button" onClick={() => void basculerExemples(true)} disabled={enCours} className={`${btn.base} ${btn.secondary} text-sm`}>
                  <FlaskConical size={16} aria-hidden /> Charger des exemples fictifs
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-10">
          {etat.etat === 'chargement' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Squelette key={i} className="h-32 w-full" />
              ))}
            </div>
          )}
          {etat.etat === 'erreur' && <EtatErreur message={etat.message} onReessayer={() => recharger()} />}
          {etat.etat === 'ok' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: BarChart3, label: 'Signalements enregistrés', val: etat.donnees.total },
                  { icon: CheckCircle2, label: 'Résolus et confirmés', val: etat.donnees.resolusConfirmes },
                  { icon: ShieldAlert, label: 'Résolutions contestées', val: etat.donnees.resolusContestes },
                  {
                    icon: Clock,
                    label: 'Délai moyen avant « Résolu »',
                    val: etat.donnees.delaiMoyenResolutionJours !== null ? `${etat.donnees.delaiMoyenResolutionJours} j` : '—',
                  },
                ].map(({ icon: Icon, label, val }) => (
                  <TiltCard key={label}>
                    <div className="glass flex h-full flex-col justify-between rounded-4xl p-6 shadow-soft">
                      <Icon size={22} className="text-accent" aria-hidden />
                      <p className="mt-4 font-display text-4xl font-extrabold">{val}</p>
                      <p className="mt-1 text-sm text-fg-muted">{label}</p>
                    </div>
                  </TiltCard>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="glass rounded-4xl p-6 shadow-soft">
                  <h3 className="font-bold">Répartition par statut</h3>
                  <ul className="mt-4 space-y-2.5">
                    {STATUTS.map((st) => {
                      const n = etat.donnees.parStatut[st];
                      const pct = etat.donnees.total ? Math.round((n / etat.donnees.total) * 100) : 0;
                      const info = statutInfos[st];
                      return (
                        <li key={st}>
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold">{info.label}</span>
                            <span className="text-fg-muted">
                              {n} ({pct} %)
                            </span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-fg/10">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: info.couleur }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="glass flex flex-col justify-between rounded-4xl p-6 shadow-soft">
                  <div>
                    <h3 className="font-bold">Par catégorie</h3>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      {(Object.keys(categorieLabels) as Categorie[]).map((c) => (
                        <div key={c} className="rounded-2xl border border-line bg-bg-elev p-3">
                          <dt className="text-sm text-fg-muted">{categorieLabels[c]}</dt>
                          <dd className="mt-1 font-display text-2xl font-extrabold">{etat.donnees.parCategorie[c]}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <p className="mt-4 flex items-center justify-between text-sm text-fg-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={16} aria-hidden /> {etat.donnees.totalConfirmations} confirmation{etat.donnees.totalConfirmations > 1 ? 's' : ''} citoyenne{etat.donnees.totalConfirmations > 1 ? 's' : ''}
                    </span>
                    <a href="/signalements" className="inline-flex items-center gap-1 font-bold text-accent hover:underline">
                      Voir la carte <ArrowRight size={15} aria-hidden />
                    </a>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
