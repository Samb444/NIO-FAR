import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Copy,
  Crosshair,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api, ErreurReseau } from '../lib/api';
import { categories } from '../lib/categories';
import { categoryColors } from '../lib/tokens';
import { SECTEURS, categorieLabels, graviteLabels, secteurLePlusProche } from '../lib/referentiel';
import type { Categorie, Contact, Gravite, NouveauSignalement, SignalementPublic } from '../lib/types';
import { arrondir3, genererCodeSuivi, genererUUID, lireCommeDataURL, messageErreur } from '../lib/utils';
import { compresserImage } from '../lib/image';
import { suggererCategorie } from '../lib/keywords';
import { transcription, type SuggestionTranscription } from '../lib/transcription';
import { memoireAppareil, useHorsLigne } from '../lib/offline';
import { copierTexte, lienWhatsApp } from '../lib/partage';
import { useTitre } from '../lib/hooks';
import { CategoryIcon } from '../components/CategoryIcon';
import { EnregistreurVocal } from '../components/EnregistreurVocal';
import { BanniereUrgence } from '../components/BanniereUrgence';
import { BadgeEnAttente, BadgeExemple, BadgeStatut, TiltCard, btn } from '../components/ui';

type Brouillon = {
  id: string;
  categorie: Categorie | null;
  description: string;
  audio: Blob | null;
  secteur: string;
  latitude: number | null;
  longitude: number | null;
  gravite: Gravite;
  photo: string | null;
  contactType: Contact['type'];
  contactValeur: string;
};

const nouveauBrouillon = (): Brouillon => ({
  id: genererUUID(),
  categorie: null,
  description: '',
  audio: null,
  secteur: '',
  latitude: null,
  longitude: null,
  gravite: 2,
  photo: null,
  contactType: 'whatsapp',
  contactValeur: '',
});

type Resultat = { code: string; id: string; enAttente: boolean; categorie: Categorie; secteur: string };

const ETAPES = ['Catégorie', 'Description', 'Lieu', 'Envoi'];

export default function Signaler() {
  useTitre('Signaler un problème');
  const [b, setB] = useState<Brouillon>(nouveauBrouillon);
  const [etape, setEtape] = useState(0);
  const [direction, setDirection] = useState(1);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const haut = useRef<HTMLDivElement>(null);

  const maj = (p: Partial<Brouillon>) => setB((x) => ({ ...x, ...p }));
  const aller = (n: number) => {
    setDirection(n > etape ? 1 : -1);
    setEtape(n);
    haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const recommencer = () => {
    setB(nouveauBrouillon());
    setResultat(null);
    setEtape(0);
  };

  return (
    <section ref={haut} className="mx-auto max-w-2xl px-4 pb-32 pt-24 sm:pt-28" aria-labelledby="titre-signaler">
      <BanniereUrgence />
      {resultat ? (
        <Confirmation r={resultat} onNouveau={recommencer} />
      ) : (
        <>
          <h1 id="titre-signaler" className="mt-6 text-3xl font-extrabold sm:text-4xl">
            Signaler un problème
          </h1>
          <Progression etape={etape} />
          <div className="relative mt-6">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={etape}
                custom={direction}
                initial={{ opacity: 0, x: direction * 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -48 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {etape === 0 && (
                  <EtapeCategorie
                    valeur={b.categorie}
                    onChoix={(c) => {
                      maj({ categorie: c });
                      aller(1);
                    }}
                  />
                )}
                {etape === 1 && <EtapeVocale b={b} maj={maj} onRetour={() => aller(0)} onSuite={() => aller(2)} />}
                {etape === 2 && <EtapeLieu b={b} maj={maj} onRetour={() => aller(1)} onSuite={() => aller(3)} />}
                {etape === 3 && <EtapeEnvoi b={b} maj={maj} onRetour={() => aller(2)} onModifier={aller} onFini={setResultat} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </section>
  );
}

function Progression({ etape }: { etape: number }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-fg-muted">
        Étape {etape + 1} sur {ETAPES.length} — {ETAPES[etape]}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
        {ETAPES.map((e, i) => (
          <div key={e} className="h-2 overflow-hidden rounded-full bg-fg/10">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: i <= etape ? '100%' : '0%' }}
              transition={{ duration: 0.4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Navigation({
  onRetour,
  onSuite,
  suiteLabel = 'Continuer',
  suiteDesactivee = false,
}: {
  onRetour?: () => void;
  onSuite?: () => void;
  suiteLabel?: string;
  suiteDesactivee?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {onRetour ? (
        <button type="button" onClick={onRetour} className={`${btn.base} ${btn.ghost}`}>
          <ArrowLeft size={18} aria-hidden /> Retour
        </button>
      ) : (
        <span />
      )}
      {onSuite && (
        <button type="button" onClick={onSuite} disabled={suiteDesactivee} className={`${btn.base} ${btn.accent}`}>
          {suiteLabel} <ArrowRight size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}

/* ---------------- Étape 1 : catégorie ---------------- */

function EtapeCategorie({ valeur, onChoix }: { valeur: Categorie | null; onChoix: (c: Categorie) => void }) {
  return (
    <fieldset>
      <legend className="text-xl font-bold">Quel est le problème ?</legend>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {categories.map((c, i) => {
          const actif = valeur === c.id;
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <TiltCard>
                <button
                  type="button"
                  onClick={() => onChoix(c.id)}
                  aria-pressed={actif}
                  className={`glass flex h-full min-h-44 w-full flex-col items-center justify-center rounded-3xl p-3 text-center shadow-soft transition-shadow ${
                    actif ? 'ring-4 ring-accent' : 'hover:shadow-glow'
                  }`}
                >
                  <span className="h-20 w-20 rounded-2xl p-2 text-ink dark:text-sand" style={{ background: `${categoryColors[c.id]}26` }}>
                    <CategoryIcon id={c.id} />
                  </span>
                  <span className="mt-3 text-lg font-bold leading-tight">{c.label}</span>
                  <span className="mt-1 text-xs text-fg-muted">{c.examples}</span>
                </button>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------------- Étape 2 : assistant vocal ---------------- */

function EtapeVocale({
  b,
  maj,
  onRetour,
  onSuite,
}: {
  b: Brouillon;
  maj: (p: Partial<Brouillon>) => void;
  onRetour: () => void;
  onSuite: () => void;
}) {
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionTranscription | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [audioInitial] = useState(() => (b.audio ? URL.createObjectURL(b.audio) : null));

  const surAudio = async (blob: Blob | null) => {
    maj({ audio: blob });
    setSuggestion(null);
    setErreur(null);
    if (!blob) return;
    setTranscriptionEnCours(true);
    try {
      const s = await transcription.transcrire(blob);
      setSuggestion(s);
      if (s.texte && !b.description.trim()) maj({ description: s.texte });
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setTranscriptionEnCours(false);
    }
  };

  const suggestionCat = suggererCategorie(b.description);
  const autreCat = suggestionCat && suggestionCat.categorie !== b.categorie ? suggestionCat : null;

  return (
    <div>
      <h2 className="text-xl font-bold">Parlez, on s’occupe du reste</h2>
      <p className="mt-1 text-fg-muted">
        Décrivez le problème à voix haute, <strong>en wolof ou en français</strong>, sans rien écrire.
      </p>

      <div className="glass mt-5 rounded-4xl px-4 py-6 shadow-soft">
        <EnregistreurVocal audioInitial={audioInitial} onTermine={surAudio} />
      </div>

      {transcriptionEnCours && (
        <p className="mt-4 flex items-center gap-2 text-fg-muted" role="status">
          <Loader2 className="animate-spin" size={18} aria-hidden /> Préparation de la suggestion…
        </p>
      )}
      {suggestion?.avertissement && (
        <p className="mt-4 rounded-2xl bg-accent/10 px-4 py-3 text-sm">{suggestion.avertissement}</p>
      )}
      {erreur && (
        <p role="alert" className="mt-4 rounded-2xl bg-[#C8553D]/12 px-4 py-3 text-sm">
          {erreur}
        </p>
      )}

      <label htmlFor="description" className="mt-6 block font-bold">
        Description <span className="font-normal text-fg-muted">(facultatif si vous avez enregistré une note)</span>
      </label>
      {suggestion?.texte && (
        <p className="mt-1 text-sm font-semibold text-accent">Suggestion automatique : relisez et corrigez librement.</p>
      )}
      <textarea
        id="description"
        rows={3}
        maxLength={500}
        value={b.description}
        onChange={(e) => maj({ description: e.target.value })}
        placeholder="Ex. : tas d’ordures devant la mosquée depuis une semaine"
        className="mt-2 w-full rounded-2xl border border-line bg-bg-elev px-4 py-3 text-base outline-none focus:border-accent"
      />
      <p className="mt-1 text-right text-xs text-fg-muted">{b.description.length}/500</p>

      <AnimatePresence>
        {autreCat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-ochre/50 bg-ochre/10 px-4 py-3 text-sm">
              <Sparkles size={18} aria-hidden />
              <span className="flex-1">
                Suggestion : votre description évoque plutôt <strong>« {categorieLabels[autreCat.categorie]} »</strong>.
              </span>
              <button type="button" className={`${btn.base} ${btn.secondary} min-h-11 px-4 text-sm`} onClick={() => maj({ categorie: autreCat.categorie })}>
                Changer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navigation onRetour={onRetour} onSuite={onSuite} />
    </div>
  );
}

/* ---------------- Étape 3 : lieu, gravité, photo ---------------- */

function EtapeLieu({
  b,
  maj,
  onRetour,
  onSuite,
}: {
  b: Brouillon;
  maj: (p: Partial<Brouillon>) => void;
  onRetour: () => void;
  onSuite: () => void;
}) {
  const [geo, setGeo] = useState<{ etat: 'repos' | 'cours' | 'ok' | 'erreur'; message?: string }>({
    etat: b.latitude !== null ? 'ok' : 'repos',
  });
  const [photoEtat, setPhotoEtat] = useState<{ cours: boolean; erreur: string | null }>({ cours: false, erreur: null });

  const localiser = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ etat: 'erreur', message: 'La géolocalisation n’est pas disponible. Choisissez votre secteur.' });
      return;
    }
    setGeo({ etat: 'cours' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = arrondir3(p.coords.latitude);
        const lng = arrondir3(p.coords.longitude);
        const proche = secteurLePlusProche(lat, lng);
        maj({ latitude: lat, longitude: lng, secteur: b.secteur || (proche.distanceKm < 8 ? proche.nom : '') });
        setGeo({
          etat: 'ok',
          message: proche.distanceKm < 8 ? undefined : 'Vous semblez hors de la zone couverte : choisissez le secteur concerné.',
        });
      },
      (e) =>
        setGeo({
          etat: 'erreur',
          message: e.code === e.PERMISSION_DENIED ? 'Position refusée. Choisissez simplement votre secteur.' : 'Position introuvable. Choisissez votre secteur.',
        }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  };

  const surPhoto = async (f: File | undefined) => {
    if (!f) return;
    setPhotoEtat({ cours: true, erreur: null });
    try {
      maj({ photo: await compresserImage(f) });
      setPhotoEtat({ cours: false, erreur: null });
    } catch (e) {
      setPhotoEtat({ cours: false, erreur: messageErreur(e) });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Où se trouve le problème ?</h2>

      <button type="button" onClick={localiser} disabled={geo.etat === 'cours'} className={`${btn.base} ${btn.secondary} mt-4 w-full`}>
        {geo.etat === 'cours' ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Crosshair size={18} aria-hidden />}
        Utiliser ma position
      </button>
      <div aria-live="polite" className="mt-2 text-sm">
        {geo.etat === 'ok' && b.latitude !== null && (
          <p className="flex items-center gap-1.5 font-semibold text-accent">
            <Check size={16} aria-hidden /> Position arrondie enregistrée (≈ 100 m) : {b.latitude}, {b.longitude}
            <button type="button" className="ml-auto inline-grid h-11 w-11 place-items-center rounded-full hover:bg-fg/10" aria-label="Retirer la position" onClick={() => { maj({ latitude: null, longitude: null }); setGeo({ etat: 'repos' }); }}>
              <X size={16} aria-hidden />
            </button>
          </p>
        )}
        {geo.message && <p className="text-fg-muted">{geo.message}</p>}
      </div>

      <label htmlFor="secteur" className="mt-4 block font-bold">
        Secteur <span className="text-[#B4432D] dark:text-[#F08A73]">*</span>
      </label>
      <div className="relative mt-2">
        <MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden />
        <select
          id="secteur"
          value={b.secteur}
          onChange={(e) => maj({ secteur: e.target.value })}
          className="min-h-12 w-full appearance-none rounded-2xl border border-line bg-bg-elev py-3 pl-11 pr-4 text-base outline-none focus:border-accent"
        >
          <option value="">Choisir un secteur…</option>
          {SECTEURS.map((s) => (
            <option key={s.nom} value={s.nom}>
              {s.nom}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="mt-6">
        <legend className="font-bold">Gravité</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([1, 2, 3] as Gravite[]).map((g) => {
            const actif = b.gravite === g;
            return (
              <motion.button
                key={g}
                type="button"
                whileTap={{ scale: 0.95 }}
                aria-pressed={actif}
                onClick={() => maj({ gravite: g })}
                className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 text-center transition-colors ${
                  actif ? 'border-accent bg-accent/10' : 'border-line bg-bg-elev'
                }`}
              >
                <span className="flex gap-0.5" aria-hidden>
                  {[1, 2, 3].map((k) => (
                    <span key={k} className={`h-2.5 w-2.5 rounded-full ${k <= g ? 'bg-ochre' : 'bg-fg/15'}`} />
                  ))}
                </span>
                <span className="mt-1 font-bold">{graviteLabels[g].label}</span>
                <span className="text-[0.7rem] leading-tight text-fg-muted">{graviteLabels[g].aide}</span>
              </motion.button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        <p className="font-bold">
          Photo <span className="font-normal text-fg-muted">(facultative, compressée à 480 px)</span>
        </p>
        {b.photo ? (
          <div className="relative mt-2 overflow-hidden rounded-2xl">
            <img src={b.photo} alt="Aperçu de la photo jointe" className="max-h-64 w-full object-cover" />
            <button
              type="button"
              onClick={() => maj({ photo: null })}
              className="absolute right-2 top-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-ink/80 px-4 text-sm font-semibold text-sand"
            >
              <Trash2 size={16} aria-hidden /> Retirer
            </button>
          </div>
        ) : (
          <label className={`${btn.base} ${btn.secondary} mt-2 w-full cursor-pointer`}>
            {photoEtat.cours ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Camera size={18} aria-hidden />}
            Prendre ou choisir une photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void surPhoto(e.target.files?.[0])} />
          </label>
        )}
        {photoEtat.erreur && (
          <p role="alert" className="mt-2 text-sm">
            {photoEtat.erreur}
          </p>
        )}
        <p className="mt-2 text-xs text-fg-muted">Évitez de photographier des visages ou des plaques d’immatriculation.</p>
      </div>

      <Navigation onRetour={onRetour} onSuite={onSuite} suiteDesactivee={!b.secteur} />
      {!b.secteur && <p className="mt-2 text-right text-sm text-fg-muted">Choisissez un secteur pour continuer.</p>}
    </div>
  );
}

/* ---------------- Étape 4 : contact, récapitulatif, envoi ---------------- */

function EtapeEnvoi({
  b,
  maj,
  onRetour,
  onModifier,
  onFini,
}: {
  b: Brouillon;
  maj: (p: Partial<Brouillon>) => void;
  onRetour: () => void;
  onModifier: (etape: number) => void;
  onFini: (r: Resultat) => void;
}) {
  const navigate = useNavigate();
  const { mettreEnAttente } = useHorsLigne();
  const [envoi, setEnvoi] = useState<'repos' | 'verification' | 'envoi'>('repos');
  const [erreur, setErreur] = useState<string | null>(null);
  const [similaires, setSimilaires] = useState<SignalementPublic[] | null>(null);
  const [confirmationEnCours, setConfirmationEnCours] = useState<string | null>(null);
  const code = useRef(genererCodeSuivi());

  const contactValide = !b.contactValeur || /^[+\d][\d\s.-]{6,}$/.test(b.contactValeur.trim());
  const contenuPresent = Boolean(b.audio || b.description.trim() || b.photo);

  const construire = async (): Promise<NouveauSignalement> => ({
    id: b.id,
    code: code.current,
    categorie: b.categorie ?? 'dechets',
    description: b.description.trim(),
    secteur: b.secteur,
    latitude: b.latitude,
    longitude: b.longitude,
    gravite: b.gravite,
    photo: b.photo,
    audio: b.audio ? await lireCommeDataURL(b.audio) : null,
    contact: b.contactValeur.trim() ? { type: b.contactType, valeur: b.contactValeur.trim() } : null,
    dateCreation: new Date().toISOString(),
  });

  const creer = async () => {
    setEnvoi('envoi');
    setErreur(null);
    try {
      const donnees = await construire();
      const base = { categorie: donnees.categorie, secteur: donnees.secteur };
      if (!navigator.onLine) {
        await mettreEnAttente(donnees);
        onFini({ ...base, code: donnees.code, id: donnees.id, enAttente: true });
        return;
      }
      try {
        const s = await api.creerSignalement(donnees);
        memoireAppareil.retenir({ id: s.id, code: s.code, categorie: s.categorie, date: s.dateCreation });
        onFini({ ...base, code: s.code, id: s.id, enAttente: false });
      } catch (e) {
        if (!(e instanceof ErreurReseau)) throw e;
        await mettreEnAttente(donnees);
        onFini({ ...base, code: donnees.code, id: donnees.id, enAttente: true });
      }
    } catch (e) {
      setErreur(messageErreur(e));
      setEnvoi('repos');
    }
  };

  const envoyer = async () => {
    if (!b.categorie || !b.secteur) return;
    setErreur(null);
    if (navigator.onLine && similaires === null) {
      setEnvoi('verification');
      try {
        const sim = await api.chercherSimilaires(b.categorie, b.secteur);
        if (sim.length > 0) {
          setSimilaires(sim);
          setEnvoi('repos');
          return;
        }
      } catch {
        /* vérification impossible : on continue l'envoi */
      }
    }
    await creer();
  };

  const confirmerExistant = async (s: SignalementPublic) => {
    setConfirmationEnCours(s.id);
    try {
      if (!memoireAppareil.aConfirme(s.id)) {
        await api.confirmerProbleme(s.id);
        memoireAppareil.marquerConfirme(s.id);
      }
      navigate(`/signalements/${s.id}?confirme=1`);
    } catch (e) {
      setErreur(messageErreur(e));
      setConfirmationEnCours(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Être tenu informé ?</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Facultatif. Votre numéro n’est <strong>jamais affiché publiquement</strong>. Le code de suivi suffit pour suivre votre signalement.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type de contact">
        {(
          [
            ['whatsapp', 'WhatsApp', MessageCircle],
            ['telephone', 'Téléphone', Phone],
          ] as const
        ).map(([t, label, Icon]) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={b.contactType === t}
            onClick={() => maj({ contactType: t })}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 font-semibold ${
              b.contactType === t ? 'border-accent bg-accent/10' : 'border-line bg-bg-elev'
            }`}
          >
            <Icon size={18} aria-hidden /> {label}
          </button>
        ))}
      </div>
      <label htmlFor="contact" className="sr-only">
        Numéro {b.contactType === 'whatsapp' ? 'WhatsApp' : 'de téléphone'}
      </label>
      <input
        id="contact"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+221 7X XXX XX XX"
        value={b.contactValeur}
        onChange={(e) => maj({ contactValeur: e.target.value })}
        aria-invalid={!contactValide}
        className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-bg-elev px-4 py-3 text-base outline-none focus:border-accent"
      />
      {!contactValide && <p className="mt-1 text-sm font-semibold">Ce numéro semble incomplet.</p>}

      <h2 className="mt-8 text-xl font-bold">Récapitulatif</h2>
      <dl className="glass mt-3 divide-y divide-line rounded-3xl shadow-soft">
        <Ligne label="Catégorie" onModifier={() => onModifier(0)}>
          {b.categorie ? categorieLabels[b.categorie] : '—'}
        </Ligne>
        <Ligne label="Description" onModifier={() => onModifier(1)}>
          {b.description.trim() || <span className="text-fg-muted">Aucune</span>}
          {b.audio && <span className="mt-1 block text-sm font-semibold text-accent">🎙 Note vocale jointe</span>}
        </Ligne>
        <Ligne label="Lieu" onModifier={() => onModifier(2)}>
          {b.secteur}
          {b.latitude !== null && <span className="block text-sm text-fg-muted">Position arrondie : {b.latitude}, {b.longitude}</span>}
        </Ligne>
        <Ligne label="Gravité" onModifier={() => onModifier(2)}>
          {graviteLabels[b.gravite].label}
        </Ligne>
        <Ligne label="Photo" onModifier={() => onModifier(2)}>
          {b.photo ? <img src={b.photo} alt="Photo jointe" className="h-16 w-24 rounded-lg object-cover" /> : <span className="text-fg-muted">Aucune</span>}
        </Ligne>
      </dl>

      {!contenuPresent && (
        <p className="mt-4 rounded-2xl bg-ochre/15 px-4 py-3 text-sm">
          Ajoutez au moins une note vocale, une description ou une photo pour que le problème soit compréhensible.
        </p>
      )}
      {erreur && (
        <p role="alert" className="mt-4 rounded-2xl bg-[#C8553D]/12 px-4 py-3 text-sm">
          {erreur}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" onClick={onRetour} className={`${btn.base} ${btn.ghost}`}>
          <ArrowLeft size={18} aria-hidden /> Retour
        </button>
        <button
          type="button"
          onClick={() => void envoyer()}
          disabled={envoi !== 'repos' || !contactValide || !contenuPresent}
          className={`${btn.base} ${btn.primary}`}
        >
          {envoi === 'repos' ? <Send size={18} aria-hidden /> : <Loader2 size={18} className="animate-spin" aria-hidden />}
          {envoi === 'verification' ? 'Vérification…' : envoi === 'envoi' ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>

      <AnimatePresence>
        {similaires && similaires.length > 0 && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-3 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titre-doublon"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-4xl bg-bg-elev p-5 shadow-soft"
            >
              <h2 id="titre-doublon" className="text-2xl font-bold">
                Ce problème est peut-être déjà signalé
              </h2>
              <p className="mt-1 text-fg-muted">
                {similaires.length} signalement{similaires.length > 1 ? 's' : ''} « {b.categorie && categorieLabels[b.categorie]} » à {b.secteur}. Confirmer
                l’existant augmente sa priorité et évite les doublons.
              </p>
              <ul className="mt-4 space-y-3">
                {similaires.slice(0, 3).map((s) => (
                  <li key={s.id} className="rounded-3xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-accent">{s.code}</span>
                      <BadgeStatut statut={s.statut} taille="sm" />
                      {s.estExemple && <BadgeExemple />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{s.description || 'Sans description'}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
                      <Users size={12} aria-hidden /> {s.confirmations} confirmation{s.confirmations > 1 ? 's' : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => void confirmerExistant(s)}
                      disabled={confirmationEnCours !== null}
                      className={`${btn.base} ${btn.accent} mt-3 w-full`}
                    >
                      {confirmationEnCours === s.id ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
                      Confirmer le signalement existant
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setSimilaires([]);
                  void creer();
                }}
                disabled={confirmationEnCours !== null}
                className={`${btn.base} ${btn.ghost} mt-3 w-full`}
              >
                Non, c’est un autre problème : créer un signalement
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Ligne({ label, children, onModifier }: { label: string; children: ReactNode; onModifier: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <dt className="w-24 shrink-0 text-sm font-semibold text-fg-muted">{label}</dt>
      <dd className="flex-1">{children}</dd>
      <button type="button" onClick={onModifier} className="min-h-11 rounded-full px-3 text-sm font-semibold text-accent hover:bg-accent/10">
        Modifier
      </button>
    </div>
  );
}

/* ---------------- Écran de confirmation ---------------- */

function Confirmation({ r, onNouveau }: { r: Resultat; onNouveau: () => void }) {
  const [copie, setCopie] = useState<'repos' | 'ok' | 'erreur'>('repos');
  const copier = async () => {
    try {
      await copierTexte(r.code);
      setCopie('ok');
      window.setTimeout(() => setCopie('repos'), 2500);
    } catch {
      setCopie('erreur');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent text-accent-fg shadow-glow"
      >
        <Check size={40} aria-hidden />
      </motion.div>
      <h1 id="titre-signaler" className="mt-5 text-3xl font-extrabold sm:text-4xl">
        {r.enAttente ? 'Signalement enregistré sur votre téléphone' : 'Merci, signalement reçu !'}
      </h1>
      {r.enAttente && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <BadgeEnAttente />
          <p className="max-w-md text-sm text-fg-muted">Pas de réseau : il sera envoyé automatiquement dès le retour de la connexion.</p>
        </div>
      )}

      <div className="glass mx-auto mt-6 max-w-md rounded-4xl p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-fg-muted">Votre code de suivi</p>
        <motion.p
          initial={{ letterSpacing: '0.5em', opacity: 0 }}
          animate={{ letterSpacing: '0.12em', opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mt-2 select-all font-mono text-4xl font-extrabold text-accent sm:text-5xl"
          aria-live="polite"
        >
          {r.code}
        </motion.p>
        <p className="mt-2 text-sm text-fg-muted">Notez-le : il suffit pour suivre votre signalement, sans compte.</p>
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={() => void copier()} className={`${btn.base} ${btn.accent}`}>
            {copie === 'ok' ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
            {copie === 'ok' ? 'Code copié !' : 'Copier le code'}
          </button>
          <a
            href={lienWhatsApp(r.code, r.categorie, r.secteur)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn.base} bg-[#1F7A4D] text-white hover:brightness-110`}
          >
            <MessageCircle size={18} aria-hidden /> Partager sur WhatsApp
          </a>
          {copie === 'erreur' && <p role="alert" className="text-sm">Copie impossible : notez le code à la main.</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        {r.enAttente ? (
          <Link to="/suivre" className={`${btn.base} ${btn.secondary}`}>
            Voir mes signalements
          </Link>
        ) : (
          <Link to={`/signalements/${r.id}`} className={`${btn.base} ${btn.secondary}`}>
            Voir la fiche de suivi
          </Link>
        )}
        <button type="button" onClick={onNouveau} className={`${btn.base} ${btn.ghost}`}>
          Faire un autre signalement
        </button>
      </div>
    </motion.div>
  );
}
