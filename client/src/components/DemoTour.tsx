import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FlaskConical,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { IndicateursPublics, RapportPointsNoirs, ReponseScenarioDemo } from '../lib/types';
import { messageErreur } from '../lib/utils';
import { BadgeExemple, BadgeStatut, btn } from './ui';

const ETAPES_SCENARIO = [
  {
    step: 1,
    court: '1. Voix citoyenne',
    titre: '1/5 — Un habitant signale par la voix',
    icone: Mic,
  },
  {
    step: 2,
    court: '2. Vérif. admin',
    titre: '2/5 — L’admin écoute et vérifie',
    icone: ShieldCheck,
  },
  {
    step: 3,
    court: '3. Transmis (Acteur)',
    titre: '3/5 — Statut « Transmis » (acteur suggéré : ONAS)',
    icone: ArrowRight,
  },
  {
    step: 4,
    court: '4. Photo & Confirmé',
    titre: '4/5 — L’habitant confirme après la photo « après »',
    icone: CheckCircle2,
  },
  {
    step: 5,
    court: '5. Transparence & Points noirs',
    titre: '5/5 — Indicateurs & carte « Points noirs » mis à jour en direct',
    icone: TrendingUp,
  },
];

export function DemoTour() {
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etatEtape, setEtatEtape] = useState<ReponseScenarioDemo | null>(null);
  const [statsDirect, setStatsDirect] = useState<IndicateursPublics | null>(null);
  const [hotspotsDirect, setHotspotsDirect] = useState<RapportPointsNoirs | null>(null);
  const [messageReset, setMessageReset] = useState<string | null>(null);

  const notifierRafraichissement = () => {
    window.dispatchEvent(new CustomEvent('niofar:demo-update'));
  };

  const lancerEtape = async (step: number) => {
    setEnCours(true);
    setErreur(null);
    setMessageReset(null);
    try {
      const rep = await api.executerEtapeDemo(step);
      setEtatEtape(rep);
      const [st, hs] = await Promise.all([
        api.indicateursPublics(),
        api.pointsNoirsPublics(),
      ]);
      setStatsDirect(st);
      setHotspotsDirect(hs);
      notifierRafraichissement();

      if (step === 1 && rep.report) {
        navigate(`/signalements/${rep.report.id}`);
      } else if (step === 5) {
        navigate('/transparence');
      }
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  };

  const demarrerModeDemo = async () => {
    setOuvert(true);
    await lancerEtape(1);
  };

  const reinitialiser = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await api.reinitialiserDemo();
      setEtatEtape(null);
      const [st, hs] = await Promise.all([
        api.indicateursPublics(),
        api.pointsNoirsPublics(),
      ]);
      setStatsDirect(st);
      setHotspotsDirect(hs);
      setMessageReset(r.message);
      notifierRafraichissement();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  };

  const stepActuel = etatEtape?.step ?? 0;

  return (
    <>
      <div className="fixed bottom-20 right-3 z-40 lg:bottom-5 lg:right-5">
        <button
          type="button"
          onClick={() => (ouvert ? setOuvert(false) : void demarrerModeDemo())}
          aria-expanded={ouvert}
          data-testid="btn-mode-demo"
          className="glass inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-xs font-extrabold text-fg shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-glow"
        >
          <FlaskConical size={15} className="text-ochre" aria-hidden />
          <span>Mode démo</span>
          {stepActuel > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-fg">
              {stepActuel}/5
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {ouvert && (
          <motion.aside
            role="dialog"
            aria-modal="false"
            aria-labelledby="titre-mode-demo"
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.96 }}
            className="glass fixed inset-x-3 bottom-24 z-50 mx-auto max-w-xl rounded-4xl border-2 border-accent/50 p-5 shadow-glow lg:bottom-20 lg:left-auto lg:right-5 lg:mx-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-ochre text-ink">
                  <Sparkles size={16} aria-hidden />
                </span>
                <div>
                  <h2 id="titre-mode-demo" className="text-base font-extrabold">
                    Scénario guidé — Présentation Jury (5 temps)
                  </h2>
                  <p className="text-[11px] text-fg-muted">
                    Tous les exemples chargés portent l’étiquette obligatoire « Exemple fictif ».
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <BadgeExemple />
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  aria-label="Fermer le panneau Mode démo"
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-fg/10"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {ETAPES_SCENARIO.map((et) => {
                const actif = stepActuel === et.step;
                const fait = stepActuel > et.step;
                return (
                  <button
                    key={et.step}
                    type="button"
                    disabled={enCours}
                    onClick={() => void lancerEtape(et.step)}
                    className={`flex flex-col items-center rounded-2xl border p-2 text-center text-[11px] font-bold transition-all ${
                      actif
                        ? 'border-accent bg-accent text-accent-fg shadow-glow'
                        : fait
                          ? 'border-accent/40 bg-accent/15 text-accent'
                          : 'border-line bg-bg-elev text-fg-muted hover:text-fg'
                    }`}
                  >
                    <span>Temps {et.step}</span>
                    <span className="mt-0.5 line-clamp-1 text-[10px] font-normal opacity-90">
                      {et.court.slice(3)}
                    </span>
                  </button>
                );
              })}
            </div>

            {erreur && (
              <p role="alert" className="mt-3 rounded-2xl bg-[#C8553D]/15 px-3 py-2 text-xs font-semibold">
                {erreur}
              </p>
            )}

            {messageReset && (
              <p role="status" className="mt-3 rounded-2xl bg-accent/15 px-3 py-2 text-xs font-semibold text-accent">
                {messageReset}
              </p>
            )}

            {etatEtape ? (
              <div className="mt-4 space-y-3 rounded-3xl border border-line bg-bg-elev p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-accent">{etatEtape.titre}</p>
                  {etatEtape.report && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-extrabold">{etatEtape.report.code}</span>
                      <BadgeStatut statut={etatEtape.report.statut} taille="sm" />
                    </div>
                  )}
                </div>
                <p className="text-fg-muted">{etatEtape.explication}</p>

                {etatEtape.report && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-bg p-2.5">
                    <span className="font-bold">
                      Acteur suggéré :{' '}
                      <strong className="text-accent">
                        {etatEtape.report.acteurCompetent || etatEtape.report.acteurSuggere || 'ONAS'}
                      </strong>
                    </span>
                    <span className="text-fg-muted">·</span>
                    <span>
                      Score priorité : <strong>{etatEtape.report.priorite} pts</strong>
                    </span>
                    {etatEtape.report.confirmationHabitant === true && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 font-bold text-accent">
                        Confirmé réglé par l’habitant
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/signalements/${etatEtape.report!.id}`)}
                      className="ml-auto inline-flex items-center gap-1 font-bold text-accent underline"
                    >
                      <Eye size={13} aria-hidden /> Voir la fiche
                    </button>
                  </div>
                )}

                {(statsDirect || hotspotsDirect) && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="rounded-xl border border-line bg-bg p-2">
                      <p className="font-display text-base font-extrabold text-accent">
                        {statsDirect?.resolusVerifies ?? 0} / {statsDirect?.total ?? 0}
                      </p>
                      <p className="text-[10px] text-fg-muted">
                        Résolus vérifiés ({statsDirect?.tauxResolutionVerifiee ?? 0} %)
                      </p>
                    </div>
                    <div className="rounded-xl border border-line bg-bg p-2">
                      <p className="font-display text-base font-extrabold text-[#C8553D]">
                        {hotspotsDirect?.aAnticiper.length ?? 0}
                      </p>
                      <p className="text-[10px] text-fg-muted">Points noirs « À anticiper »</p>
                    </div>
                    <div className="rounded-xl border border-line bg-bg p-2">
                      <p className="font-display text-base font-extrabold text-[#2F8FBF]">
                        {hotspotsDirect?.meteo.cumul7JoursMm ?? 0} mm
                      </p>
                      <p className="text-[10px] text-fg-muted">Pluie Open-Meteo (7 j)</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-line bg-bg-elev p-4 text-xs text-fg-muted">
                Cliquez sur « Lancer le Temps 1/5 » pour démarrer le parcours guidé de démonstration.
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={enCours}
                onClick={() => void reinitialiser()}
                data-testid="btn-reset-demo"
                className={`${btn.base} ${btn.secondary} min-h-10 px-3.5 text-xs`}
              >
                <RotateCcw size={14} aria-hidden /> Réinitialiser la démo
              </button>

              <div className="flex items-center gap-2">
                {stepActuel < 5 ? (
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => void lancerEtape(stepActuel + 1)}
                    data-testid="btn-next-demo"
                    className={`${btn.base} ${btn.accent} min-h-10 px-4 text-xs`}
                  >
                    {enCours ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                    ) : (
                      <Play size={14} aria-hidden />
                    )}
                    {stepActuel === 0 ? 'Lancer le Temps 1/5' : `Temps suivant (${stepActuel + 1}/5)`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/admin')}
                    className={`${btn.base} ${btn.primary} min-h-10 px-4 text-xs`}
                  >
                    Ouvrir l’Admin &amp; Carte Points noirs
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
