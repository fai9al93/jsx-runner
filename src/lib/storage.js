/**
 * storage.js — async presentation library on top of IndexedDB.
 *
 * Public API (all async):
 *   getLibrary()                        → { presentations, currentId }
 *   getCurrent()                        → presentation | null
 *   setCurrentId(id)
 *   upsertPresentation(p)               → saved entry
 *   renamePresentation(id, name)
 *   deletePresentation(id)              → new currentId
 *   createFromFile(name, code)          → new entry, marked current
 *   touchCurrent({code, notes})         → debounced save into current entry
 *
 *   getVersions(presentationId)         → version[]   (newest first)
 *   saveSnapshot(presentationId, label) → new version (also evicts oldest beyond MAX_VERSIONS)
 *   restoreVersion(versionId)           → presentation (creates a snapshot of current state first)
 *   deleteVersion(versionId)
 *
 *   exportLibrary()                     → object you can JSON.stringify
 *   importLibrary(data, mode)           → { added, replaced }
 *                                          mode: 'merge' (keep existing, add new) | 'replace'
 *
 * One-time migration runs on first call: if the old localStorage keys
 * ('jsx-runner:library:v1' or 'jsx-runner:code'/'jsx-runner:notes')
 * exist, their contents are copied into IndexedDB and the old keys cleared.
 */

import {
  STORE_PRESENTATIONS,
  STORE_VERSIONS,
  STORE_META,
  dbGet,
  dbGetAll,
  dbPut,
  dbDelete,
  dbGetByIndex,
  dbDeleteByIndex,
  tx,
} from './idb.js';

const META_CURRENT_ID = 'currentId';
const MAX_VERSIONS = 30;
const SAVE_DEBOUNCE_MS = 500;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── One-time migration from localStorage ───
let migrationDone = false;
async function migrateIfNeeded() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const existing = await dbGetAll(STORE_PRESENTATIONS);
    if (existing.length > 0) return; // already populated

    // a) New-format library
    const v1 = localStorage.getItem('jsx-runner:library:v1');
    if (v1) {
      try {
        const parsed = JSON.parse(v1);
        for (const p of parsed.presentations || []) {
          const entry = {
            id: p.id || uid(),
            name: p.name || 'بدون عنوان',
            code: p.code || '',
            notes: p.notes || '',
            createdAt: p.createdAt || p.updatedAt || Date.now(),
            updatedAt: p.updatedAt || Date.now(),
          };
          await dbPut(STORE_PRESENTATIONS, entry);
        }
        if (parsed.currentId) await dbPut(STORE_META, parsed.currentId, META_CURRENT_ID);
        localStorage.removeItem('jsx-runner:library:v1');
        return;
      } catch (e) { /* fall through */ }
    }

    // b) Original single-buffer format
    const oldCode = localStorage.getItem('jsx-runner:code');
    const oldNotes = localStorage.getItem('jsx-runner:notes') || '';
    if (oldCode && oldCode.trim()) {
      const id = uid();
      await dbPut(STORE_PRESENTATIONS, {
        id, name: 'العرض المحفوظ', code: oldCode, notes: oldNotes,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      await dbPut(STORE_META, id, META_CURRENT_ID);
      localStorage.removeItem('jsx-runner:code');
      localStorage.removeItem('jsx-runner:notes');
    }
  } catch (e) {
    console.warn('migration failed:', e);
  }
}

// ─── Presentations ───

export async function getLibrary() {
  await migrateIfNeeded();
  const [presentations, currentId] = await Promise.all([
    dbGetAll(STORE_PRESENTATIONS),
    dbGet(STORE_META, META_CURRENT_ID),
  ]);
  return { presentations, currentId: currentId || null };
}

export async function getCurrent() {
  const lib = await getLibrary();
  if (!lib.currentId) return null;
  return lib.presentations.find((p) => p.id === lib.currentId) || null;
}

export async function setCurrentId(id) {
  await dbPut(STORE_META, id, META_CURRENT_ID);
}

export async function upsertPresentation(entry) {
  await migrateIfNeeded();
  const existing = entry.id ? await dbGet(STORE_PRESENTATIONS, entry.id) : null;
  const now = Date.now();
  const merged = {
    id: entry.id || uid(),
    name: entry.name ?? existing?.name ?? 'بدون عنوان',
    code: entry.code ?? existing?.code ?? '',
    notes: entry.notes ?? existing?.notes ?? '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await dbPut(STORE_PRESENTATIONS, merged);
  return merged;
}

export async function renamePresentation(id, name) {
  const existing = await dbGet(STORE_PRESENTATIONS, id);
  if (!existing) return null;
  const updated = { ...existing, name, updatedAt: Date.now() };
  await dbPut(STORE_PRESENTATIONS, updated);
  return updated;
}

export async function deletePresentation(id) {
  await dbDelete(STORE_PRESENTATIONS, id);
  await dbDeleteByIndex(STORE_VERSIONS, 'presentationId', id);
  const currentId = await dbGet(STORE_META, META_CURRENT_ID);
  if (currentId === id) {
    const remaining = await dbGetAll(STORE_PRESENTATIONS);
    const newId = remaining[0]?.id || null;
    if (newId) await dbPut(STORE_META, newId, META_CURRENT_ID);
    else await dbDelete(STORE_META, META_CURRENT_ID);
    return newId;
  }
  return currentId;
}

export async function createFromFile(name, code) {
  const entry = await upsertPresentation({ name: name || 'بدون عنوان', code, notes: '' });
  await setCurrentId(entry.id);
  // Seed a first-version snapshot so the user can always roll back to "as-uploaded".
  await saveSnapshot(entry.id, 'النسخة الأصلية');
  return entry;
}

// ─── Debounced auto-save ───
let saveTimer = null;
let pendingResolvers = [];

/**
 * Schedules a save into the current presentation. Returns a promise
 * that resolves when *this* save (or a later one that supersedes it)
 * has been written. Useful for status indicators in the UI.
 */
export function touchCurrent({ code, notes }) {
  return new Promise((resolve, reject) => {
    pendingResolvers.push(resolve);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const resolvers = pendingResolvers;
      pendingResolvers = [];
      try {
        const cur = await getCurrent();
        if (!cur) { resolvers.forEach((r) => r(null)); return; }
        const updated = await upsertPresentation({
          id: cur.id,
          name: cur.name,
          code: code !== undefined ? code : cur.code,
          notes: notes !== undefined ? notes : cur.notes,
        });
        resolvers.forEach((r) => r(updated));
      } catch (e) {
        resolvers.forEach((r) => r(null));
        reject(e);
      }
    }, SAVE_DEBOUNCE_MS);
  });
}

/** Force-flush any pending debounced save immediately. Returns when done. */
export async function flushPendingSave() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  const resolvers = pendingResolvers;
  pendingResolvers = [];
  try {
    const cur = await getCurrent();
    if (cur) {
      // Re-save with whatever current state already holds (no new code/notes provided)
      await upsertPresentation({ id: cur.id, name: cur.name, code: cur.code, notes: cur.notes });
    }
  } finally {
    resolvers.forEach((r) => r(null));
  }
}

// ─── Version history ───

export async function getVersions(presentationId) {
  const rows = await dbGetByIndex(STORE_VERSIONS, 'presentationId', presentationId);
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function saveSnapshot(presentationId, label) {
  const cur = await dbGet(STORE_PRESENTATIONS, presentationId);
  if (!cur) return null;
  const snapshot = {
    id: uid(),
    presentationId,
    code: cur.code,
    notes: cur.notes,
    createdAt: Date.now(),
    label: label || '',
  };
  await dbPut(STORE_VERSIONS, snapshot);

  // Evict oldest beyond MAX_VERSIONS.
  const versions = await getVersions(presentationId);
  if (versions.length > MAX_VERSIONS) {
    const toRemove = versions.slice(MAX_VERSIONS);
    for (const v of toRemove) await dbDelete(STORE_VERSIONS, v.id);
  }
  return snapshot;
}

/**
 * Restores a version into its presentation. Before overwriting, takes a
 * snapshot of the current state labeled "Before restore" so the operation
 * is itself undoable.
 */
export async function restoreVersion(versionId) {
  const v = await dbGet(STORE_VERSIONS, versionId);
  if (!v) return null;
  await saveSnapshot(v.presentationId, 'قبل الاستعادة');
  const updated = await upsertPresentation({
    id: v.presentationId,
    code: v.code,
    notes: v.notes,
  });
  return updated;
}

export async function deleteVersion(versionId) {
  await dbDelete(STORE_VERSIONS, versionId);
}

// ─── Export / Import ───

export async function exportLibrary() {
  const [presentations, versions, currentId] = await Promise.all([
    dbGetAll(STORE_PRESENTATIONS),
    dbGetAll(STORE_VERSIONS),
    dbGet(STORE_META, META_CURRENT_ID),
  ]);
  return {
    schema: 'jsx-runner-library',
    version: 1,
    exportedAt: new Date().toISOString(),
    currentId: currentId || null,
    presentations,
    versions,
  };
}

/**
 * @param {object} data — same shape produced by exportLibrary
 * @param {'merge'|'replace'} mode
 */
export async function importLibrary(data, mode = 'merge') {
  if (!data || data.schema !== 'jsx-runner-library') {
    throw new Error('ملف غير صالح — التنسيق المتوقع jsx-runner-library');
  }

  if (mode === 'replace') {
    await tx([STORE_PRESENTATIONS, STORE_VERSIONS, STORE_META], 'readwrite', async (t) => {
      await new Promise((res, rej) => {
        const r = t.objectStore(STORE_PRESENTATIONS).clear(); r.onsuccess = res; r.onerror = () => rej(r.error);
      });
      await new Promise((res, rej) => {
        const r = t.objectStore(STORE_VERSIONS).clear(); r.onsuccess = res; r.onerror = () => rej(r.error);
      });
      await new Promise((res, rej) => {
        const r = t.objectStore(STORE_META).clear(); r.onsuccess = res; r.onerror = () => rej(r.error);
      });
    });
  }

  let added = 0;
  // For merge mode, regenerate IDs to avoid collisions with existing entries.
  // For replace, keep original IDs so currentId still points correctly.
  const idMap = {};
  for (const pres of data.presentations || []) {
    const newId = mode === 'replace' ? pres.id : uid();
    idMap[pres.id] = newId;
    await dbPut(STORE_PRESENTATIONS, { ...pres, id: newId });
    added += 1;
  }
  for (const ver of data.versions || []) {
    const newPresId = idMap[ver.presentationId];
    if (!newPresId) continue;
    await dbPut(STORE_VERSIONS, { ...ver, id: uid(), presentationId: newPresId });
  }
  if (mode === 'replace' && data.currentId) {
    await dbPut(STORE_META, data.currentId, META_CURRENT_ID);
  } else if (mode === 'merge' && !(await dbGet(STORE_META, META_CURRENT_ID))) {
    // If nothing was current, point at the first imported presentation.
    const firstId = Object.values(idMap)[0];
    if (firstId) await dbPut(STORE_META, firstId, META_CURRENT_ID);
  }

  return { added, mode };
}
