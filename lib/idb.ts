/**
 * Tiny promise wrapper around IndexedDB for storing video MP4 blobs.
 * localStorage can't hold multi-MB videos; IndexedDB can (tens–hundreds of MB).
 */
const DB_NAME = "animestudio-ai";
const STORE = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export const idbSet = (key: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, key));
export const idbGet = (key: string) => tx<Blob | undefined>("readonly", (s) => s.get(key));
export const idbDel = (key: string) =>
  tx("readwrite", (s) => s.delete(key)).then(() => undefined);

/** IndexedDB key for a library video's MP4. */
export const videoBlobKey = (videoId: string) => `video:${videoId}`;
