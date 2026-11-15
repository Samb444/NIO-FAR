import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ErreurReseau } from './api';
import { idbEcrire, idbSupprimer, idbToutLire } from './idb';
import type { NouveauSignalement, SignalementPublic } from './types';
import { messageErreur } from './utils';

/* ------------------------------------------------------------------ */
/* Mémoire locale de l'appareil (aucune donnée personnelle)            */
/* ------------------------------------------------------------------ */

export type MonSignalement = { id: string; code: string; categorie: NouveauSignalement['categorie']; date: string };

function lireJSON<T>(cle: string, defaut: T): T {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}
function ecrireJSON(cle: string, valeur: unknown): void {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage plein ou indisponible */
  }
}

export const memoireAppareil = {
  mesSignalements: (): MonSignalement[] => lireJSON<MonSignalement[]>('niofar-mes-signalements', []),
  retenir(s: MonSignalement): void {
    const liste = memoireAppareil.mesSignalements().filter((x) => x.id !== s.id);
    ecrireJSON('niofar-mes-signalements', [s, ...liste].slice(0, 50));
  },
  aConfirme: (id: string): boolean => lireJSON<string[]>('niofar-confirmes', []).includes(id),
  marquerConfirme(id: string): void {
    ecrireJSON('niofar-confirmes', [...new Set([...lireJSON<string[]>('niofar-confirmes', []), id])]);
  },
  aVerifie: (id: string): boolean => lireJSON<string[]>('niofar-verifies', []).includes(id),
  marquerVerifie(id: string): void {
    ecrireJSON('niofar-verifies', [...new Set([...lireJSON<string[]>('niofar-verifies', []), id])]);
  },
};

/* ------------------------------------------------------------------ */
/* File d'attente hors-ligne (IndexedDB) + synchronisation automatique  */
/* ------------------------------------------------------------------ */

export type ElementEnAttente = NouveauSignalement & { tentatives: number; derniereErreur: string | null };

type ContexteHorsLigne = {
  enLigne: boolean;
  enAttente: ElementEnAttente[];
  synchroEnCours: boolean;
  erreurStockage: string | null;
  mettreEnAttente: (d: NouveauSignalement) => Promise<void>;
  synchroniser: () => Promise<void>;
};

const Ctx = createContext<ContexteHorsLigne | null>(null);

export function HorsLigneProvider({ children }: { children: ReactNode }) {
  const [enLigne, setEnLigne] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [enAttente, setEnAttente] = useState<ElementEnAttente[]>([]);
  const [synchroEnCours, setSynchroEnCours] = useState(false);
  const [erreurStockage, setErreurStockage] = useState<string | null>(null);
  const verrou = useRef(false);

  const recharger = useCallback(async () => {
    try {
      const liste = await idbToutLire<ElementEnAttente>('file_attente');
      setEnAttente(liste.sort((a, b) => a.dateCreation.localeCompare(b.dateCreation)));
      setErreurStockage(null);
    } catch (e) {
      setErreurStockage(messageErreur(e));
    }
  }, []);

  const synchroniser = useCallback(async () => {
    if (verrou.current || !navigator.onLine) return;
    verrou.current = true;
    setSynchroEnCours(true);
    try {
      const liste = await idbToutLire<ElementEnAttente>('file_attente');
      for (const el of liste) {
        try {
          const { tentatives: _t, derniereErreur: _e, ...donnees } = el;
          void _t;
          void _e;
          // Idempotent grâce à l'UUID : un renvoi après coupure ne crée pas de doublon.
          const cree: SignalementPublic = await api.creerSignalement(donnees);
          memoireAppareil.retenir({ id: cree.id, code: cree.code, categorie: cree.categorie, date: cree.dateCreation });
          await idbSupprimer('file_attente', el.id);
        } catch (e) {
          if (e instanceof ErreurReseau) break;
          await idbEcrire('file_attente', { ...el, tentatives: el.tentatives + 1, derniereErreur: messageErreur(e) });
        }
      }
    } catch (e) {
      setErreurStockage(messageErreur(e));
    } finally {
      verrou.current = false;
      setSynchroEnCours(false);
      await recharger();
    }
  }, [recharger]);

  const mettreEnAttente = useCallback(
    async (d: NouveauSignalement) => {
      await idbEcrire<ElementEnAttente>('file_attente', { ...d, tentatives: 0, derniereErreur: null });
      memoireAppareil.retenir({ id: d.id, code: d.code, categorie: d.categorie, date: d.dateCreation });
      await recharger();
    },
    [recharger],
  );

  useEffect(() => {
    void recharger().then(() => {
      if (navigator.onLine) void synchroniser();
    });
    const enLigneH = () => {
      setEnLigne(true);
      void synchroniser();
    };
    const horsLigneH = () => setEnLigne(false);
    window.addEventListener('online', enLigneH);
    window.addEventListener('offline', horsLigneH);
    return () => {
      window.removeEventListener('online', enLigneH);
      window.removeEventListener('offline', horsLigneH);
    };
  }, [recharger, synchroniser]);

  return (
    <Ctx.Provider value={{ enLigne, enAttente, synchroEnCours, erreurStockage, mettreEnAttente, synchroniser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHorsLigne(): ContexteHorsLigne {
  const c = useContext(Ctx);
  if (!c) throw new Error('useHorsLigne doit être utilisé dans <HorsLigneProvider>');
  return c;
}
