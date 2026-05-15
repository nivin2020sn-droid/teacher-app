// Online/offline + sync-state hook. Reads navigator.onLine and listens for
// the `mosaytra:sync` events dispatched by offlineApi.
import { useEffect, useState } from "react";
import { queueSize, readQueue } from "../lib/offlineDb";
import { drainQueue } from "../lib/offlineApi";

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pending, setPending] = useState(0);
  // 'idle' | 'syncing' | 'synced' | 'error'
  const [syncStage, setSyncStage] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const n = await queueSize();
      if (!cancelled) setPending(n);
    };
    refresh();

    const onOnline = () => {
      setOnline(true);
      // The lib already attaches a global online listener that drains the
      // queue; we mirror state here.
      drainQueue().then(refresh);
    };
    const onOffline = () => setOnline(false);
    const onSync = (e) => {
      setSyncStage(e.detail?.kind || "idle");
      refresh();
      if (e.detail?.kind === "synced") {
        // Auto-clear the "synced" banner after a short delay.
        setTimeout(() => setSyncStage("idle"), 2500);
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("mosaytra:sync", onSync);
    // On mount, if there's a backlog, try to drain.
    if (navigator.onLine) {
      readQueue().then((q) => {
        if (q.length) drainQueue().then(refresh);
      });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("mosaytra:sync", onSync);
    };
  }, []);

  return { online, pending, syncStage };
}
