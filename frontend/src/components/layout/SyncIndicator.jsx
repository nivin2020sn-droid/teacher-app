// Tiny persistent connection-state indicator for the top bar.
// Green = online + synced, Red = offline, Blue = syncing.
// Hover/click shows a small popover with status text and pending count.
import { useState, useRef, useEffect } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function SyncIndicator() {
  const { online, pending, syncStage } = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click.
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  let kind, label, dot;
  if (!online) {
    kind = "offline";
    label = "غير متصل، التغييرات محفوظة محليًا.";
    dot = "bg-rose-500";
  } else if (syncStage === "syncing" || (pending > 0 && online)) {
    kind = "syncing";
    label =
      syncStage === "syncing"
        ? "جاري مزامنة البيانات…"
        : `بانتظار رفع ${pending} تعديل.`;
    dot = "bg-sky-500";
  } else {
    kind = "online";
    label = "متصل وتمت المزامنة.";
    dot = "bg-emerald-500";
  }

  return (
    <div ref={ref} className="relative print:hidden">
      <button
        type="button"
        data-testid={`sync-indicator-${kind}`}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary transition-colors"
      >
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${dot} ${
            kind === "syncing" ? "animate-pulse" : ""
          } ring-2 ring-white shadow`}
        />
        {pending > 0 && (
          <span
            data-testid="sync-pending-count"
            className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center"
          >
            {pending > 99 ? "99+" : pending}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="sync-popover"
          dir="rtl"
          className="absolute end-0 top-12 min-w-[240px] rounded-2xl bg-white border border-border/60 shadow-lg p-3 z-50"
        >
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-bold text-foreground/80">
              حالة الاتصال والمزامنة
            </span>
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`}
            />
          </div>
          <p className="text-xs text-foreground/70 mt-2 text-end">{label}</p>
          {pending > 0 && (
            <p className="text-[11px] text-amber-700 mt-1 text-end">
              {pending} تعديل بانتظار المزامنة.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
