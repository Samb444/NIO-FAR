/**
 * Mini-couche IndexedDB sans dépendance.
 * - « file_attente » : signalements créés hors-ligne, en attente d'envoi.
 * - « simulation »   : persistance locale du faux service de données (étape 2 uniquement).
 */
const DB_NOM = 'niofar';
const DB_VERSION = 1;
export type NomStore = 'file_attente' | 'simulation';

let dbPromise: Promise<IDBDatabase> | null = null;

function ouvrir(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible sur cet appareil.'));
      return;
    }
    const req = indexedDB.open(DB_NOM, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('file_attente')) db.createObjectStore('file_attente', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('simulation')) db.createObjectStore('simulation', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Ouverture d’IndexedDB impossible.'));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function requete<T>(store: NomStore, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return ouvrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = action(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Erreur IndexedDB.'));
      }),
  );
}

export function idbToutLire<T>(store: NomStore): Promise<T[]> {
  return requete<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbLire<T>(store: NomStore, id: string): Promise<T | undefined> {
  return requete<T | undefined>(store, 'readonly', (s) => s.get(id) as IDBRequest<T | undefined>);
}

export function idbEcrire<T extends { id: string }>(store: NomStore, valeur: T): Promise<void> {
  return requete<IDBValidKey>(store, 'readwrite', (s) => s.put(valeur)).then(() => undefined);
}

export function idbSupprimer(store: NomStore, id: string): Promise<void> {
  return requete<undefined>(store, 'readwrite', (s) => s.delete(id)).then(() => undefined);
}
