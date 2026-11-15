import { useCallback, useEffect, useRef, useState } from 'react';
import { messageErreur } from './utils';

const TITRE_DEFAUT = 'NIO FAR — Les problèmes de votre quartier, enfin suivis.';

export function useTitre(titre: string) {
  useEffect(() => {
    document.title = `${titre} — NIO FAR`;
    return () => {
      document.title = TITRE_DEFAUT;
    };
  }, [titre]);
}

export type EtatAsync<T> =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'ok'; donnees: T };

/** Charge une ressource asynchrone avec états chargement / erreur / succès. */
export function useChargement<T>(charger: () => Promise<T>, deps: unknown[]) {
  const [etat, setEtat] = useState<EtatAsync<T>>({ etat: 'chargement' });
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(charger, deps);

  const recharger = useCallback(
    (silencieux = false) => {
      const n = ++seq.current;
      if (!silencieux) setEtat({ etat: 'chargement' });
      fn().then(
        (donnees) => n === seq.current && setEtat({ etat: 'ok', donnees }),
        (e: unknown) => n === seq.current && setEtat({ etat: 'erreur', message: messageErreur(e) }),
      );
    },
    [fn],
  );

  useEffect(() => {
    recharger();
  }, [recharger]);

  const remplacer = useCallback((donnees: T) => setEtat({ etat: 'ok', donnees }), []);
  return { etat, recharger, remplacer };
}
