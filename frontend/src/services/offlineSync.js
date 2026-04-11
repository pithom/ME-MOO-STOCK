import { openDB } from 'idb';
import toast from 'react-hot-toast';

const DB_NAME = 'memoo-sync-db';
const DB_VERSION = 1;
const QUEUE_STORE = 'sync-queue';
const CACHE_STORE = 'api-cache';
const CONFLICT_STORE = 'sync-conflicts';

const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 5 * 60 * 1000;

let apiRef = null;
let isSyncing = false;
let listenersAttached = false;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(QUEUE_STORE)) {
      const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('nextRetryAt', 'nextRetryAt');
    }
    if (!db.objectStoreNames.contains(CACHE_STORE)) {
      db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
    }
    if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
      const store = db.createObjectStore(CONFLICT_STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('createdAt', 'createdAt');
    }
  },
});

export function initOfflineSync(apiInstance) {
  apiRef = apiInstance;
}

export async function syncGet(key, requestFn) {
  if (navigator.onLine) {
    try {
      const response = await requestFn();
      await setCache(key, response.data);
      return response;
    } catch {
      const cached = await getCache(key);
      if (cached != null) return { data: cached };
      throw new Error('Request failed and no cache available');
    }
  }
  const cached = await getCache(key);
  if (cached != null) return { data: cached };
  throw new Error('Offline and no cached data');
}

export async function runOrQueueMutation({
  method,
  url,
  data,
  operationType,
  successMessage,
  queuedMessage,
}) {
  const requestConfig = { method, url, data };

  if (!navigator.onLine) {
    await enqueueOperation({ operationType, requestConfig });
    if (queuedMessage) toast.success(queuedMessage);
    return { data: { queued: true } };
  }

  try {
    const response = await apiRef.request(requestConfig);
    if (successMessage) toast.success(successMessage);
    return response;
  } catch (err) {
    const noNetwork = !err.response;
    if (noNetwork) {
      await enqueueOperation({ operationType, requestConfig });
      if (queuedMessage) toast.success(queuedMessage);
      return { data: { queued: true } };
    }
    throw err;
  }
}

export async function enqueueOperation({ operationType, requestConfig }) {
  const db = await dbPromise;
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  await tx.store.add({
    operationType,
    requestConfig,
    attempts: 0,
    lastError: '',
    nextRetryAt: Date.now(),
    createdAt: Date.now(),
  });
  await tx.done;
}

export async function processSyncQueue() {
  if (!navigator.onLine || !apiRef || isSyncing) return;
  isSyncing = true;

  try {
    const db = await dbPromise;
    const tx = db.transaction([QUEUE_STORE, CONFLICT_STORE], 'readwrite');
    const queueStore = tx.objectStore(QUEUE_STORE);
    const conflictStore = tx.objectStore(CONFLICT_STORE);
    const entries = await queueStore.getAll();
    const now = Date.now();

    let synced = 0;
    let conflicts = 0;

    for (const entry of entries) {
      if (entry.nextRetryAt > now) continue;

      try {
        await apiRef.request(entry.requestConfig);
        await queueStore.delete(entry.id);
        synced += 1;
      } catch (err) {
        const status = err.response?.status;
        const isConflict = status === 409 || status === 412;

        if (isConflict) {
          await conflictStore.add({
            operationType: entry.operationType,
            requestConfig: entry.requestConfig,
            serverData: err.response?.data || null,
            createdAt: Date.now(),
          });
          await queueStore.delete(entry.id);
          conflicts += 1;
          continue;
        }

        const attempts = (entry.attempts || 0) + 1;
        const delay = Math.min(RETRY_BASE_MS * (2 ** Math.min(attempts, 8)), RETRY_MAX_MS);
        entry.attempts = attempts;
        entry.lastError = err.response?.data?.message || err.message || 'Unknown sync error';
        entry.nextRetryAt = Date.now() + delay;
        await queueStore.put(entry);
      }
    }

    await tx.done;
    if (synced > 0) toast.success(`Synced ${synced} queued change(s).`);
    if (conflicts > 0) toast.error(`${conflicts} sync conflict(s) need review.`);
  } finally {
    isSyncing = false;
  }
}

export function attachOfflineSyncListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  window.addEventListener('online', () => {
    processSyncQueue();
  });
}

export async function getQueueSummary() {
  const db = await dbPromise;
  const [queued, conflicts] = await Promise.all([
    db.count(QUEUE_STORE),
    db.count(CONFLICT_STORE),
  ]);
  return { queued, conflicts };
}

async function setCache(key, value) {
  const db = await dbPromise;
  const tx = db.transaction(CACHE_STORE, 'readwrite');
  await tx.store.put({ key, value, updatedAt: Date.now() });
  await tx.done;
}

async function getCache(key) {
  const db = await dbPromise;
  const item = await db.get(CACHE_STORE, key);
  return item?.value ?? null;
}
