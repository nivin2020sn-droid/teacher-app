// Compact banner shown when offline / syncing / sync error.
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const { online, pending, syncStage } = useOnlineStatus();

  // Decide what to show. Priority: offline > syncing > error > synced toast.
  let kind = null;
  if (!online) kind = "offline";
  else if (syncStage === "syncing") kind = "syncing";
  else if (syncStage === "error" || (pending > 0 && online)) kind = "error";
  else if (syncStage === "synced") kind = "synced";

  if (!kind) return null;

  const palette = {
    offline: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      Icon: WifiOff,
      label: "غير متصل — التعديلات تُحفظ محليًا وستتم المزامنة عند عودة الإنترنت.",
    },
    syncing: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      Icon: RefreshCw,
      label: `جارٍ المزامنة${pending ? ` (${pending} تعديل بانتظار الرفع)` : ""}…`,
      spin: true,
    },
    error: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      Icon: AlertCircle,
      label: `تعذّرت المزامنة الكاملة — ${pending} تعديل بانتظار إعادة المحاولة.`,
    },
    synced: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      Icon: CheckCircle2,
      label: "تمت المزامنة بنجاح.",
    },
  };
  const p = palette[kind];
  const Icon = p.Icon;

  return (
    <div
      data-testid={`offline-banner-${kind}`}
      className={`flex items-center justify-end gap-2 px-4 py-2 text-xs font-bold border-b ${p.bg} ${p.text} ${p.border} print:hidden`}
      dir="rtl"
    >
      <span>{p.label}</span>
      <Icon size={14} className={p.spin ? "animate-spin" : ""} />
    </div>
  );
}
