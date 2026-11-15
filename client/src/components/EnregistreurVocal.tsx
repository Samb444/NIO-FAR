import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, RotateCcw, Square, Trash2 } from 'lucide-react';
import { btn } from './ui';

const DUREE_MAX = 30;

type Etat =
  | { type: 'repos' }
  | { type: 'enregistrement'; debut: number }
  | { type: 'pret'; url: string }
  | { type: 'erreur'; message: string };

function choisirMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
}

export function enregistrementPossible(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/** Grand bouton micro : note vocale de 30 s max, écoute avant envoi, réenregistrement. */
export function EnregistreurVocal({
  audioInitial,
  onTermine,
}: {
  audioInitial: string | null;
  onTermine: (audio: Blob | null) => void;
}) {
  const [etat, setEtat] = useState<Etat>(audioInitial ? { type: 'pret', url: audioInitial } : { type: 'repos' });
  const [secondes, setSecondes] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const minuteur = useRef<number | null>(null);
  const urlCree = useRef<string | null>(null);

  const nettoyer = () => {
    if (minuteur.current) window.clearInterval(minuteur.current);
    minuteur.current = null;
    flux.current?.getTracks().forEach((t) => t.stop());
    flux.current = null;
  };

  useEffect(
    () => () => {
      nettoyer();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      if (urlCree.current) URL.revokeObjectURL(urlCree.current);
    },
    [],
  );

  const demarrer = async () => {
    if (!enregistrementPossible()) {
      setEtat({ type: 'erreur', message: 'L’enregistrement vocal n’est pas disponible sur ce navigateur (une connexion sécurisée HTTPS est nécessaire).' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      flux.current = stream;
      const mime = choisirMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      morceaux.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && morceaux.current.push(e.data);
      rec.onstop = () => {
        nettoyer();
        const blob = new Blob(morceaux.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          setEtat({ type: 'erreur', message: 'Aucun son n’a été enregistré. Réessayez.' });
          onTermine(null);
          return;
        }
        if (urlCree.current) URL.revokeObjectURL(urlCree.current);
        const url = URL.createObjectURL(blob);
        urlCree.current = url;
        setEtat({ type: 'pret', url });
        onTermine(blob);
      };
      recorder.current = rec;
      rec.start(250);
      const debut = Date.now();
      setSecondes(0);
      setEtat({ type: 'enregistrement', debut });
      minuteur.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - debut) / 1000);
        setSecondes(s);
        if (s >= DUREE_MAX && rec.state === 'recording') rec.stop();
      }, 200);
    } catch (e) {
      nettoyer();
      const refus = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setEtat({
        type: 'erreur',
        message: refus
          ? 'L’accès au micro a été refusé. Autorisez le micro dans les réglages du navigateur, ou écrivez quelques mots.'
          : 'Impossible d’accéder au micro. Vérifiez qu’aucune autre application ne l’utilise.',
      });
    }
  };

  const arreter = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const supprimer = () => {
    setEtat({ type: 'repos' });
    setSecondes(0);
    onTermine(null);
  };

  const enCours = etat.type === 'enregistrement';
  const progression = Math.min(1, secondes / DUREE_MAX);
  const C = 2 * Math.PI * 62;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid h-44 w-44 place-items-center">
        <AnimatePresence>
          {enCours &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute inset-6 rounded-full bg-ochre"
                initial={{ scale: 1, opacity: 0.45 }}
                animate={{ scale: 1.7, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, delay: i * 0.6, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
        <svg aria-hidden viewBox="0 0 140 140" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="70" cy="70" r="62" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="6" />
          <motion.circle
            cx="70"
            cy="70"
            r="62"
            fill="none"
            stroke="#E0A21B"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - progression) }}
            transition={{ ease: 'linear', duration: 0.2 }}
          />
        </svg>
        <motion.button
          type="button"
          onClick={enCours ? arreter : demarrer}
          whileTap={{ scale: 0.92 }}
          aria-label={enCours ? 'Arrêter l’enregistrement' : etat.type === 'pret' ? 'Réenregistrer une note vocale' : 'Enregistrer une note vocale'}
          className={`relative grid h-28 w-28 place-items-center rounded-full shadow-cta transition-colors ${
            enCours ? 'bg-[#C8553D] text-white' : 'bg-ochre text-ink hover:bg-ochre-400'
          }`}
        >
          {enCours ? <Square size={38} fill="currentColor" aria-hidden /> : <Mic size={46} aria-hidden />}
        </motion.button>
      </div>

      <p className="mt-2 min-h-7 font-display text-lg font-bold" aria-live="polite">
        {enCours
          ? `Enregistrement… ${secondes} s / ${DUREE_MAX} s`
          : etat.type === 'pret'
            ? 'Note vocale prête. Écoutez-la avant d’envoyer.'
            : 'Appuyez et parlez (30 secondes max.)'}
      </p>

      {etat.type === 'pret' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 w-full max-w-sm">
          <audio controls src={etat.url} className="w-full" preload="metadata">
            Votre navigateur ne peut pas lire cet audio.
          </audio>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className={`${btn.base} ${btn.secondary}`} onClick={demarrer}>
              <RotateCcw size={18} aria-hidden /> Réenregistrer
            </button>
            <button type="button" className={`${btn.base} ${btn.ghost}`} onClick={supprimer}>
              <Trash2 size={18} aria-hidden /> Supprimer
            </button>
          </div>
        </motion.div>
      )}

      {etat.type === 'erreur' && (
        <p role="alert" className="mt-3 max-w-sm rounded-2xl bg-[#C8553D]/12 px-4 py-3 text-sm font-medium">
          {etat.message}
        </p>
      )}
    </div>
  );
}
