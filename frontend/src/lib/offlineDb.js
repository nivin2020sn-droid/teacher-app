// Local IndexedDB store (via idb-keyval) for offline-first caching + sync queue.
// Two logical namespaces:
//   cache:<path>   → last server response for a GET path (used when offline)
//   queue          → array of pending mutations to replay when back online
import { get, set, del, keys, createStore } from "idb-keyval";

// Dedicated DB so we never collide with idb-keyval's default 'keyval-store'.
const STORE = createStore("mosaytra-offline", "kv");

const CACHE_PREFIX = "cache:";
const QUEUE_KEY = "queue";

// ---------- cache ----------
export async function readCache(path) {
  try {
    return (await get(CACHE_PREFIX + path, STORE)) || null;
  } catch {
    return null;
  }
}
export async function writeCache(path, data) {
  try {
    await set(CACHE_PREFIX + path, data, STORE);
  } catch {
    /* quota? ignore — we're offline-best-effort */
  }
}
export async function clearCacheByPrefix(prefix) {
  try {
    const allKeys = await keys(STORE);
    await Promise.all(
      allKeys
        .filter(
          (k) =>
            typeof k === "string" && k.startsWith(CACHE_PREFIX + prefix),
        )
        .map((k) => del(k, STORE)),
    );
  } catch {
    /* ignore */
  }
}

// ---------- sync queue ----------
// Each entry: { id, method, url, body, createdAt, retries, lastError? }
export async function readQueue() {
  return (await get(QUEUE_KEY, STORE)) || [];
}
export async function writeQueue(q) {
  await set(QUEUE_KEY, q, STORE);
}
export async function enqueue(entry) {
  const q = await readQueue();
  q.push(entry);
  await writeQueue(q);
}
export async function queueSize() {
  return (await readQueue()).length;
}
