import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Copy,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  ThumbsUp,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { api, priorite } from '../lib/api';
import { categoryColors } from '../lib/tokens';
import { categorieLabels, graviteLabels, statutInfos } from '../lib/referentiel';
import { formaterDate, formaterDateHeure, messageErreur } from '../lib/utils';
import { memoireAppareil } from '../lib/offline';
import { copierTexte, lienWhatsApp } from '../lib/partage';
import { audioWolofPour, lireEnFrancais, syntheseDisponible } from '../lib/speech';
import { useChargement, useTitre } from '../lib/hooks';
import { CategoryIcon } from '../components/CategoryIcon';
import { FriseStatuts } from '../components/FriseStatuts';
import { BadgeEnAttente, BadgeExemple, BadgeStatut, EtatErreur, EtatVide, Squelette, btn } from '../components/ui';

export default function FicheSignalement() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { etat, recharger, remplacer } = useChargement(() => api.obtenirSignalement(id), [id]);
  const s = etat.etat === 'ok' ? etat.donnees : null;
  useTitre(s ? `${s.code} — ${categorieLabels[s.categorie]}` : 'Fiche de suivi');

  const [dejaConfirme, setDejaConfirme] = useState(() => memoireAppareil.aConfirme(id));
  const [dejaVerifie, setDejaVerifie] = useState(() => memoireAppareil.aVerifie(id));
  const [action, setAction] = useState<'repos' | 'confirmation' | 'verification'>('repos');
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  /* Lecture à voix haute (français + fichier wolof pré-enregistré s'il existe) */
  const [lecture, setLecture] = useState(false);
  const [erreurVoix, setErreurVoix] = useState<string | null>(null);
  const [urlWolof, setUrlWolof] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setDejaConfirme(memoireAppareil.aConfirme(id));
    setDejaVerifie(memoireAppareil.aVerifie(id));
  }, [id]);

  useEffect(() => {
    if (!s) return;
    void audioWolofPour(s.statut).then(setUrlWolof);
  }, [s]);

  useEffect(() => () => stopRef.current?.(), []);

  const ecouter = () => {
    if (!s) return;
    if (lecture) {
      stopRef.current?.();
      setLecture(false);
      return;
    }
    setErreurVoix(null);
    const info = statutInfos[s.statut];
    const texte = `Signalement ${s.code.split('').join(' ')}. Catégorie : ${categorieLabels[s.categorie]}, secteur ${s.secteur}. Statut actuel : ${info.label}. ${info.vocal} ${s.confirmations} habitant${s.confirmations > 1 ? 's ont' : ' a'} confirmé ce problème.`;
    try {
      setLecture(true);
      stopRef.current = lireEnFrancais(texte, () => setLecture(false));
    } catch (e) {
      setLecture(false);
      setErreurVoix(messageErreur(e));
    }
  };

  const confirmer = async () => {
    if (!s || dejaConfirme) return;
    setAction('confirmation');
    setErreurAction(null);
    try {
      const maj = await api.confirmerProbleme(s.id);
      memoireAppareil.marquerConfirme(s.id);
      setDejaConfirme(true);
      remplacer(maj);
    } catch (e) {
      setErreurAction(messageErreur(e));
    } finally {
      setAction('repos');
    }
  };

  const verifier = async (regle: boolean) => {
    if (!s) return;
    setAction('verification');
    setErreurAction(null);
    try {
      const maj = await api.repondreVerification(s.id, regle);
      memoireAppareil.marquerVerifie(s.id);
      setDejaVerifie(true);
      remplacer(maj);
    } catch (e) {
      setErreurAction(messageErreur(e));
    } finally {
      setAction('repos');
    }
  };

  const copier = async () => {
    if (!s) return;
    try {
      await copierTexte(s.code);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      /* ignoré */
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 pb-32 pt-24 sm:pt-28" aria-labelledby="titre-fiche">
      <Link to="/signalements" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft size={16} aria-hidden /> Tous les signalements
      </Link>

      {etat.etat === 'chargement' && (
        <div className="mt-4 space-y-4" role="status">
          <Squelette className="h-28 w-full" />
          <Squelette className="h-64 w-full" />
          <span className="sr-only">Chargement de la fiche…</span>
        </div>
      )}
      {etat.etat === 'erreur' && <div className="mt-6"><EtatErreur message={etat.message} onReessayer={() => recharger()} /></div>}
      {etat.etat === 'ok' && !s && (
        <div className="mt-6">
          <EtatVide
            titre="Signalement introuvable"
            texte="Vérifiez le code de suivi ou cherchez par secteur."
            action={
              <Link to="/suivre" className={`${btn.base} ${btn.accent}`}>
                Aller à la recherche
              </Link>
            }
          />
        </div>
      )}

      {s && (
        <div className="mt-3 space-y-6">
          {params.get('confirme') === '1' && (
            <div role="status" className="rounded-2xl bg-accent/15 px-4 py-3 text-sm font-semibold">
              Merci : votre confirmation a été ajoutée à ce signalement existant.
            </div>
          )}

          {/* En-tête */}
          <div className="glass rounded-4xl p-5 shadow-soft sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              {s.estExemple && <BadgeExemple />}
              {s.enAttenteEnvoi && <BadgeEnAttente />}
              <BadgeStatut statut={s.statut} />
              <span className="ml-auto font-mono text-lg font-extrabold text-accent">{s.code}</span>
              <button
                type="button"
                onClick={() => void copier()}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line px-3 text-xs font-bold hover:border-accent"
              >
                {copie ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copie ? 'Copié' : 'Copier'}
              </button>
            </div>

            <div className="mt-4 flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 rounded-2xl p-2 text-ink dark:text-sand" style={{ background: `${categoryColors[s.categorie]}26` }}>
                <CategoryIcon id={s.categorie} />
              </div>
              <div>
                <h1 id="titre-fiche" className="text-2xl font-extrabold sm:text-3xl">
                  {categorieLabels[s.categorie]} — {s.secteur}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} aria-hidden /> {s.secteur}
                    {s.latitude !== null && ` (${s.latitude}, ${s.longitude})`}
                  </span>
                  <span>Gravité : {graviteLabels[s.gravite].label}</span>
                  <span>Créé le {formaterDate(s.dateCreation)}</span>
                </p>
              </div>
            </div>

            {s.description && <p className="mt-4 text-lg">{s.description}</p>}

            {/* Bouton Écouter */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              {syntheseDisponible() && (
                <button type="button" onClick={ecouter} className={`${btn.base} ${btn.secondary} min-h-11 text-sm`}>
                  {lecture ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
                  {lecture ? 'Arrêter la lecture' : 'Écouter le statut (français)'}
                </button>
              )}
              {urlWolof ? (
                <audio controls src={urlWolof} className="h-11" aria-label="Message vocal en wolof" />
              ) : (
                <span className="text-xs text-fg-muted">
                  Voix wolof : réservée aux enregistrements par un locuteur natif (aucune voix synthétique).
                </span>
              )}
              <a
                href={lienWhatsApp(s.code, s.categorie, s.secteur)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1F7A4D] px-4 text-sm font-bold text-white"
              >
                <MessageCircle size={16} aria-hidden /> Partager
              </a>
            </div>
            {erreurVoix && <p role="alert" className="mt-2 text-sm">{erreurVoix}</p>}
          </div>

          {/* Vérification citoyenne quand le statut est « Résolu » */}
          {s.statut === 'resolu' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-4xl border-2 border-accent bg-accent/10 p-5 sm:p-6"
            >
              <h2 className="text-xl font-extrabold">Le problème est-il vraiment réglé ?</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Si un habitant répond « Non, toujours là », le signalement repasse immédiatement en « À vérifier ».
              </p>
              {dejaVerifie ? (
                <p className="mt-3 font-semibold text-accent">Merci, votre réponse a bien été enregistrée sur cet appareil.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={action !== 'repos'}
                    onClick={() => void verifier(true)}
                    className={`${btn.base} ${btn.accent} flex-1`}
                  >
                    <Check size={18} aria-hidden /> Oui, réglé
                  </button>
                  <button
                    type="button"
                    disabled={action !== 'repos'}
                    onClick={() => void verifier(false)}
                    className={`${btn.base} flex-1 bg-[#C8553D] text-white hover:brightness-110`}
                  >
                    <XCircle size={18} aria-hidden /> Non, toujours là
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Bouton « Je confirme ce problème » + Priorisation transparente */}
          <div className="glass space-y-4 rounded-4xl p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold">
                  {s.confirmations} confirmation{s.confirmations > 1 ? 's' : ''} d’habitants · Score de priorité {priorite(s)}
                </p>
                <p className="text-sm text-fg-muted">Vous voyez aussi ce problème dans le quartier ? Confirmez-le (une fois par appareil).</p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={dejaConfirme || action !== 'repos'}
                onClick={() => void confirmer()}
                className={`${btn.base} ${dejaConfirme ? btn.secondary : btn.primary} shrink-0`}
              >
                {action === 'confirmation' ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                ) : dejaConfirme ? (
                  <Check size={18} aria-hidden />
                ) : (
                  <ThumbsUp size={18} aria-hidden />
                )}
                {dejaConfirme ? 'Déjà confirmé sur cet appareil' : 'Je confirme ce problème'}
              </motion.button>
            </div>
            {s.prioriteDetail && (
              <details className="rounded-2xl border border-line bg-bg-elev px-4 py-2.5 text-xs">
                <summary className="cursor-pointer font-bold text-accent">
                  Pourquoi ce score de priorité ({s.prioriteDetail.score} pts) ?
                </summary>
                <p className="mt-1.5 font-mono text-[11px]">{s.prioriteDetail.formule}</p>
                <p className="mt-1 text-fg-muted">{s.prioriteDetail.explication}</p>
              </details>
            )}
          </div>
          {erreurAction && (
            <p role="alert" className="rounded-2xl bg-[#C8553D]/12 px-4 py-3 text-sm">
              {erreurAction}
            </p>
          )}

          {/* Médias : note vocale, photo avant, photo après */}
          {(s.audio || s.photo || s.photoApres) && (
            <div className="glass space-y-4 rounded-4xl p-5 shadow-soft">
              <h2 className="text-xl font-bold">Pièces jointes</h2>
              {s.audio && (
                <div>
                  <p className="mb-1 text-sm font-semibold">Note vocale de l’habitant</p>
                  <audio controls src={s.audio} className="w-full" preload="metadata" />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {s.photo && (
                  <figure>
                    <img src={s.photo} alt="Photo du problème signalé" className="max-h-72 w-full rounded-2xl object-cover" />
                    <figcaption className="mt-1 text-xs font-semibold text-fg-muted">Photo au moment du signalement</figcaption>
                  </figure>
                )}
                {s.photoApres && (
                  <figure>
                    <img src={s.photoApres} alt="Photo après intervention" className="max-h-72 w-full rounded-2xl object-cover" />
                    <figcaption className="mt-1 text-xs font-semibold text-accent">Photo « après »</figcaption>
                  </figure>
                )}
              </div>
            </div>
          )}

          {/* Frise des 5 statuts + historique daté */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass rounded-4xl p-5 shadow-soft sm:p-6">
              <h2 className="mb-4 text-xl font-bold">Les 5 étapes du suivi</h2>
              <FriseStatuts statut={s.statut} historique={s.historique} />
            </div>

            <div className="glass rounded-4xl p-5 shadow-soft sm:p-6">
              <h2 className="mb-4 text-xl font-bold">Historique daté</h2>
              <ol className="space-y-3">
                {[...s.historique].reverse().map((h, i) => (
                  <li key={`${h.date}-${i}`} className="rounded-2xl border border-line bg-bg-elev p-3">
                    <div className="flex items-center justify-between gap-2">
                      <BadgeStatut statut={h.statut} taille="sm" />
                      <time dateTime={h.date} className="text-xs font-semibold text-fg-muted">
                        {formaterDateHeure(h.date)}
                      </time>
                    </div>
                    <p className="mt-1.5 text-sm">{h.note}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Mention obligatoire */}
          <p className="flex items-start gap-2.5 rounded-3xl border border-line bg-bg-elev px-4 py-3 text-sm text-fg-muted">
            <Info size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span>Le traitement dépend des acteurs compétents. NIO FAR ne représente aucune institution sans autorisation.</span>
          </p>
        </div>
      )}
    </section>
  );
}
