// Offline-first wrapper around the axios `api` client.
//
// • GETs: try network first; on success, cache the response; on failure or
//   when offline, return the last cached response (or empty default).
// • Mutations (POST/PATCH/PUT/DELETE):
//     - online → send through, then update cache optimistically.
//     - offline → optimistically update the cache, enqueue the mutation,
//       and return a synthetic response so the UI keeps working.
//
// Caches are keyed by URL path (without origin / without query string for
// GET-list endpoints we expose). The queue is drained by syncQueue.js.
import { api } from "./api";
import {
  readCache,
  writeCache,
  readQueue,
  writeQueue,
  enqueue,
} from "./offlineDb";

function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Re-emit a custom event so the UI banner can react to queue size changes.
function dispatchSyncEvent(detail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mosaytra:sync", { detail }));
  }
}

// ---------- GET ----------
export async function offlineGet(path) {
  if (isOnline()) {
    try {
      const res = await api.get(path);
      await writeCache(path, res.data);
      return { data: res.data, fromCache: false };
    } catch (e) {
      // Network blip → fall back to cache.
      const cached = await readCache(path);
      if (cached !== null) return { data: cached, fromCache: true };
      throw e;
    }
  }
  const cached = await readCache(path);
  if (cached === null) {
    const err = new Error("غير متصل ولا توجد نسخة محلية بعد");
    err.code = "ERR_OFFLINE_NO_CACHE";
    throw err;
  }
  return { data: cached, fromCache: true };
}

// ---------- generic mutate ----------
async function applyOptimisticCache(method, url, body) {
  // Heuristic: we don't try to mutate every cache key (too brittle). We just
  // patch the obvious list/detail caches we know about — students/subjects.
  const segs = url.split("?")[0].split("/").filter(Boolean);
  // /students, /students/{id}
  if (segs[0] === "students") {
    const list = (await readCache("/students")) || [];
    const updated = nowIso();
    if (segs.length === 1 && method === "POST") {
      const tempId = body?.id || `local_${uid()}`;
      const doc = {
        ...body,
        id: tempId,
        parents: body?.parents || [],
        _local: true,
        updatedAt: updated,
      };
      await writeCache("/students", [...list, doc]);
      return doc;
    }
    if (segs.length === 2) {
      const id = segs[1];
      if (method === "PATCH") {
        const next = list.map((s) =>
          s.id === id ? { ...s, ...body, _localPending: true, updatedAt: updated } : s,
        );
        await writeCache("/students", next);
        return next.find((s) => s.id === id);
      }
      if (method === "DELETE") {
        await writeCache(
          "/students",
          list.filter((s) => s.id !== id),
        );
        return { ok: true };
      }
    }
  }
  if (segs[0] === "subjects") {
    const list = (await readCache("/subjects")) || [];
    const updated = nowIso();
    if (segs.length === 1 && method === "POST") {
      const tempId = `local_${uid()}`;
      const doc = { ...body, id: tempId, _local: true, updatedAt: updated };
      await writeCache("/subjects", [...list, doc]);
      return doc;
    }
    if (segs.length === 2) {
      const id = segs[1];
      if (method === "PATCH") {
        const next = list.map((s) =>
          s.id === id ? { ...s, ...body, _localPending: true, updatedAt: updated } : s,
        );
        await writeCache("/subjects", next);
        return next.find((s) => s.id === id);
      }
      if (method === "DELETE") {
        await writeCache(
          "/subjects",
          list.filter((s) => s.id !== id),
        );
        return { ok: true };
      }
    }
  }
  // attendance state — keyed by /attendance?date=... — we DON'T cache mutates;
  // when offline the UI shows last GET. We still queue the mutation so it'll
  // replay against the server.
  return body || { ok: true };
}

export async function offlineMutate(method, url, body) {
  if (isOnline()) {
    try {
      const res = await api.request({ method, url, data: body });
      // Refresh known list caches in the background (fire-and-forget).
      const top = url.split("?")[0].split("/").filter(Boolean)[0];
      if (top === "students" || top === "subjects") {
        api
          .get(`/${top}`)
          .then((r) => writeCache(`/${top}`, r.data))
          .catch(() => {});
      }
      return { data: res.data, queued: false };
    } catch (e) {
      // If it's a network failure, queue. Otherwise re-throw (real 4xx/5xx).
      if (e?.code === "ERR_NETWORK" || !e?.response) {
        const data = await applyOptimisticCache(method, url, body);
        await enqueue({
          id: uid(),
          method,
          url,
          body,
          createdAt: nowIso(),
          retries: 0,
        });
        dispatchSyncEvent({ kind: "queued" });
        return { data, queued: true };
      }
      throw e;
    }
  }
  const data = await applyOptimisticCache(method, url, body);
  await enqueue({
    id: uid(),
    method,
    url,
    body,
    createdAt: nowIso(),
    retries: 0,
  });
  dispatchSyncEvent({ kind: "queued" });
  return { data, queued: true };
}

// ---------- queue drain ----------
let _draining = false;
export async function drainQueue() {
  if (_draining) return { ok: true, busy: true };
  if (!isOnline()) return { ok: false, offline: true };
  _draining = true;
  dispatchSyncEvent({ kind: "syncing" });
  try {
    let queue = await readQueue();
    while (queue.length) {
      const entry = queue[0];
      try {
        await api.request({
          method: entry.method,
          url: entry.url,
          data: entry.body,
        });
        // Pop on success.
        queue = queue.slice(1);
        await writeQueue(queue);
      } catch (e) {
        // Network failure → stop, retry later. Server 4xx → drop the entry
        // so a single bad mutation can't block forever.
        if (e?.code === "ERR_NETWORK" || !e?.response) {
          entry.retries = (entry.retries || 0) + 1;
          entry.lastError = e?.message || "network";
          await writeQueue(queue);
          dispatchSyncEvent({ kind: "error" });
          return { ok: false, partial: true };
        }
        // Permanent failure: drop & continue.
        queue = queue.slice(1);
        await writeQueue(queue);
      }
    }
    dispatchSyncEvent({ kind: "synced" });
    return { ok: true };
  } finally {
    _draining = false;
  }
}

// Drain when the browser comes back online or when the tab gains focus
// (covers iOS Safari which suspends background tabs).
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    drainQueue();
  });
  window.addEventListener("focus", () => {
    if (isOnline()) drainQueue();
  });
}
