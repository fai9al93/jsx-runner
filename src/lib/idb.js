/**
 * idb.js — minimal Promise-based IndexedDB wrapper.
 *
 * Three object stores:
 *   • presentations  (keyPath: 'id')   → { id, name, code, notes, updatedAt, createdAt }
 *   • versions       (keyPath: 'id')   → { id, presentationId, code, notes, createdAt, label }
 *                                          + index 'presentationId' for fast lookup
 *   • meta                              → arbitrary key/value (e.g., currentId)
 *
 * Why IndexedDB instead of localStorage?
 *   • localStorage is sync (blocks the UI thread) and capped around 5–10 MB
 *     across all keys. Once you stack history snapshots for several
 *     presentations, you bump the ceiling fast.
 *   • IndexedDB is async, has practically no size limit (browser-managed),
 *     and supports indexed lookups — perfect for "all versions of X".
 */

const DB_NAME = 'jsx-runner';
const DB_VERSION = 1;

export const STORE_PRESENTATIONS = 'presentations';
export const STORE_VERSIONS = 'versions';
export const STORE_META = 'meta';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PRESENTATIONS)) {
        db.createObjectStore(STORE_PRESENTATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
        const store = db.createObjectStore(STORE_VERSIONS, { keyPath: 'id' });
        store.createIndex('presentationId', 'presentationId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function p(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Run a transaction. `mode` is 'readonly' or 'readwrite'. */
export async function tx(stores, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, mode);
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('aborted'));
    Promise.resolve(fn(transaction)).then((r) => { result = r; }).catch(reject);
  });
}

// ─── High-level helpers ───

export async function dbGet(store, key) {
  return tx([store], 'readonly', (t) => p(t.objectStore(store).get(key)));
}

export async function dbGetAll(store) {
  return tx([store], 'readonly', (t) => p(t.objectStore(store).getAll()));
}

export async function dbPut(store, value, key) {
  return tx([store], 'readwrite', (t) =>
    p(key === undefined ? t.objectStore(store).put(value) : t.objectStore(store).put(value, key))
  );
}

export async function dbDelete(store, key) {
  return tx([store], 'readwrite', (t) => p(t.objectStore(store).delete(key)));
}

export async function dbClear(store) {
  return tx([store], 'readwrite', (t) => p(t.objectStore(store).clear()));
}

/** Get all rows in `store` whose `indexName` equals `value`. */
export async function dbGetByIndex(store, indexName, value) {
  return tx([store], 'readonly', (t) => p(t.objectStore(store).index(indexName).getAll(value)));
}

/** Bulk delete by index match — used when removing all versions of a presentation. */
export async function dbDeleteByIndex(store, indexName, value) {
  return tx([store], 'readwrite', async (t) => {
    const items = await p(t.objectStore(store).index(indexName).getAllKeys(value));
    for (const key of items) await p(t.objectStore(store).delete(key));
    return items.length;
  });
}
