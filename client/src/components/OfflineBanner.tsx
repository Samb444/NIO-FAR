import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useHorsLigne } from '../lib/offline';

/** Bandeau « Hors-ligne » + état de synchronisation de la file d'attente. */
export function OfflineBanner() {
  const { enLigne, enAttente, synchroEnCours } = useHorsLigne();
  const visible = !enLigne || synchroEnCours;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`fixed inset-x-0 top-0 z-[55] flex min-h-9 items-center justify-center gap-2 px-4 text-center text-sm font-semibold ${
            enLigne ? 'bg-forest text-sand' : 'bg-ink text-sand'
          }`}
        >
          {enLigne ? (
            <>
              <RefreshCw size={16} className="animate-spin" aria-hidden /> Synchronisation des signalements en attente…
            </>
          ) : (
            <>
              <CloudOff size={16} aria-hidden /> Hors-ligne — vos signalements seront envoyés au retour du réseau
              {enAttente.length > 0 && ` (${enAttente.length} en attente)`}.
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
