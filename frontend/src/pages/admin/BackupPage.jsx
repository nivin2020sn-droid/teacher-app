// Admin-only Backup & Restore center.
// Powered by /api/admin/backups (Mongo-backed snapshots).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DatabaseBackup,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Plus,
  Clock,
  ShieldCheck,
  ScrollText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api, API_BASE, extractError, getToken } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";

function fmtBytes(n) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return s;
  }
}
const TYPE_LABEL = {
  auto: { label: "تلقائي", color: "bg-violet-100 text-violet-700" },
  manual: { label: "يدوي", color: "bg-emerald-100 text-emerald-700" },
  before_restore: { label: "قبل استرجاع", color: "bg-amber-100 text-amber-700" },
  import: { label: "مستورد", color: "bg-sky-100 text-sky-700" },
};

const COLLECTION_LABELS = {
  teachers: "المعلمات",
  students: "الطلاب",
  subjects: "المواد",
  guardians: "أولياء الأمور",
  attendance: "الحضور",
  grades: "العلامات",
  assignments: "الواجبات",
  behavior: "السلوك",
  activities: "النشاطات",
  reports: "التقارير",
  app_settings: "إعدادات التطبيق",
};

function CountChips({ counts }) {
  if (!counts) return null;
  return (
    <div className="flex flex-wrap gap-1 justify-end mt-1">
      {Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => (
          <span
            key={k}
            className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/70"
          >
            {COLLECTION_LABELS[k] || k}: {v}
          </span>
        ))}
    </div>
  );
}

export default function BackupPage() {
  const [data, setData] = useState({
    items: [],
    total: 0,
    auto_count: 0,
    max_auto: 365,
    last_backup_at: null,
  });
  const [log, setLog] = useState([]);
  const [settings, setSettings] = useState({ backup_hour: "02:00" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, lg, st] = await Promise.all([
        api.get("/admin/backups"),
        api.get("/admin/backups/log"),
        api.get("/admin/backups/settings"),
      ]);
      setData(list.data);
      setLog(lg.data.items || []);
      setSettings(st.data);
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveSchedule = async () => {
    try {
      const res = await api.patch("/admin/backups/settings", settings);
      setSettings(res.data);
      toast.success("تم حفظ موعد النسخ التلقائي");
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const createNow = async () => {
    setBusy(true);
    try {
      await api.post("/admin/backups", {});
      toast.success("تم إنشاء نسخة احتياطية");
      await refresh();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  const downloadOne = async (b) => {
    try {
      const res = await fetch(`${API_BASE}/admin/backups/${b.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${b.name}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("تعذّر تنزيل النسخة");
    }
  };

  const deleteOne = async (b) => {
    if (!window.confirm(`حذف النسخة "${b.name}"؟`)) return;
    try {
      await api.delete(`/admin/backups/${b.id}`);
      toast.success("تم الحذف");
      await refresh();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const onImportFile = async (evt) => {
    const file = evt.target.files?.[0];
    evt.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      // Accept either the raw `data` blob or a full snapshot doc.
      const payload = json.data ? json : { data: json };
      await api.post("/admin/backups/import", {
        name: `import_${file.name.replace(/\.json$/i, "")}`,
        data: payload,
      });
      toast.success("تم استيراد النسخة");
      await refresh();
    } catch (e) {
      toast.error("ملف غير صالح: " + extractError(e));
    } finally {
      setBusy(false);
    }
  };

  const performRestore = async () => {
    if (!restoreTarget) return;
    setBusy(true);
    try {
      const res = await api.post(
        `/admin/backups/${restoreTarget.id}/restore`,
        { confirm: true },
      );
      toast.success(
        `تم الاسترجاع. حُفظت نسخة أمان: ${res.data.safety_backup.name}`,
      );
      setRestoreTarget(null);
      await refresh();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="backup-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3 text-end">
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            >
              النسخ الاحتياطي والاسترجاع
            </h1>
            <p className="text-sm text-foreground/60">
              نسخة يومية تلقائية تُحفظ في قاعدة البيانات لمدّة عام
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <DatabaseBackup size={22} />
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile
          icon={Clock}
          label="آخر نسخة"
          value={fmtDate(data.last_backup_at)}
          color="#7c5cff"
        />
        <Tile
          icon={DatabaseBackup}
          label="إجمالي النسخ"
          value={data.total}
          color="#16a34a"
        />
        <Tile
          icon={ShieldCheck}
          label="تلقائية محفوظة"
          value={`${data.auto_count}/${data.max_auto}`}
          color="#ea580c"
        />
        <Tile
          icon={ScrollText}
          label="عمليات مسجّلة"
          value={log.length}
          color="#2563eb"
        />
      </div>

      {/* Toolbar */}
      <div className="rounded-3xl bg-white border border-border/60 p-5 flex flex-wrap items-end gap-3 justify-end">
        <div className="space-y-1.5">
          <Label className="text-end block text-xs">
            موعد النسخ التلقائي (بتوقيت UTC)
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              data-testid="save-schedule"
              onClick={saveSchedule}
              className="rounded-xl"
            >
              حفظ الموعد
            </Button>
            <Input
              data-testid="schedule-hour"
              type="time"
              dir="ltr"
              value={settings.backup_hour}
              onChange={(e) =>
                setSettings((s) => ({ ...s, backup_hour: e.target.value }))
              }
              className="w-[140px] text-center"
            />
          </div>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="application/json"
            ref={fileRef}
            onChange={onImportFile}
            className="hidden"
            data-testid="import-file-input"
          />
          <Button
            data-testid="import-backup"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl"
            disabled={busy}
          >
            <Upload size={16} className="me-1" /> استيراد نسخة
          </Button>
          <Button
            data-testid="create-backup-now"
            onClick={createNow}
            disabled={busy}
            className="rounded-xl text-white bg-violet-600 hover:bg-violet-700"
          >
            <Plus size={16} className="me-1" /> إنشاء نسخة الآن
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl bg-white border border-border/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 text-end">
          <h4 className="font-extrabold">النسخ المحفوظة</h4>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center text-foreground/50">
            <Loader2 className="animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <div
            data-testid="backup-empty"
            className="p-10 text-center text-foreground/55 text-sm"
          >
            لا توجد نسخ احتياطية بعد. اضغطي "إنشاء نسخة الآن".
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {data.items.map((b) => {
              const t = TYPE_LABEL[b.type] || TYPE_LABEL.manual;
              return (
                <li
                  key={b.id}
                  data-testid={`backup-row-${b.id}`}
                  className="px-5 py-4 flex flex-wrap items-start gap-3"
                >
                  <div className="flex-1 min-w-[220px] text-end">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${t.color}`}
                      >
                        {t.label}
                      </span>
                      <span className="font-extrabold">{b.name}</span>
                    </div>
                    <div className="text-xs text-foreground/55 mt-0.5">
                      {fmtDate(b.created_at)} · {fmtBytes(b.size_bytes)}
                      {b.created_by_name && (
                        <span> · بواسطة {b.created_by_name}</span>
                      )}
                    </div>
                    <CountChips counts={b.counts} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`download-${b.id}`}
                      className="rounded-xl"
                      onClick={() => downloadOne(b)}
                    >
                      <Download size={14} className="me-1" /> تنزيل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`restore-${b.id}`}
                      className="rounded-xl text-amber-700 hover:bg-amber-50"
                      onClick={() => setRestoreTarget(b)}
                    >
                      <RotateCcw size={14} className="me-1" /> استرجاع
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`delete-${b.id}`}
                      className="rounded-xl text-rose-600 hover:bg-rose-50"
                      onClick={() => deleteOne(b)}
                    >
                      <Trash2 size={14} className="me-1" /> حذف
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Audit log */}
      <div className="rounded-3xl bg-white border border-border/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 text-end">
          <h4 className="font-extrabold">سجل العمليات</h4>
        </div>
        {log.length === 0 ? (
          <div className="p-6 text-center text-foreground/50 text-sm">
            لا توجد عمليات بعد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-end text-sm" dir="rtl">
              <thead className="bg-secondary/40 text-foreground/65">
                <tr>
                  <th className="px-4 py-2 font-bold">العملية</th>
                  <th className="px-4 py-2 font-bold">النسخة</th>
                  <th className="px-4 py-2 font-bold">التاريخ</th>
                  <th className="px-4 py-2 font-bold">المستخدم</th>
                  <th className="px-4 py-2 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {log.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-border/40"
                    data-testid={`log-row-${e.id}`}
                  >
                    <td className="px-4 py-2 font-bold">{e.op}</td>
                    <td className="px-4 py-2 text-xs">{e.backup_name || "—"}</td>
                    <td className="px-4 py-2 text-xs">{fmtDate(e.created_at)}</td>
                    <td className="px-4 py-2 text-xs">{e.user_name || "نظام"}</td>
                    <td className="px-4 py-2">
                      {e.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 size={12} /> نجحت
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-bold">
                          <XCircle size={12} /> فشلت
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore confirmation dialog */}
      <Dialog
        open={!!restoreTarget}
        onOpenChange={(v) => !v && setRestoreTarget(null)}
      >
        <DialogContent dir="rtl" data-testid="restore-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-end">تأكيد الاسترجاع</DialogTitle>
            <DialogDescription className="text-end">
              سيتمّ استبدال البيانات الحالية بالكامل ببيانات النسخة المختارة.
            </DialogDescription>
          </DialogHeader>
          {restoreTarget && (
            <div className="space-y-3 text-end">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div className="text-end">
                  سنُنشئ تلقائيًا نسخة احتياطية للحالة الحالية قبل تنفيذ الاسترجاع،
                  باسم <b>before_restore_*</b>، لضمان إمكانية التراجع.
                </div>
              </div>
              <div className="rounded-2xl bg-secondary/40 p-4 text-sm space-y-1">
                <div>
                  الاسم: <b>{restoreTarget.name}</b>
                </div>
                <div>التاريخ: {fmtDate(restoreTarget.created_at)}</div>
                <div>الحجم: {fmtBytes(restoreTarget.size_bytes)}</div>
                <CountChips counts={restoreTarget.counts} />
              </div>
              <div className="flex gap-2 justify-start pt-1">
                <Button
                  data-testid="restore-confirm"
                  className="rounded-xl text-white bg-amber-600 hover:bg-amber-700"
                  disabled={busy}
                  onClick={performRestore}
                >
                  {busy ? (
                    <Loader2 className="animate-spin me-1" size={14} />
                  ) : (
                    <RotateCcw className="me-1" size={14} />
                  )}
                  استرجاع الآن
                </Button>
                <Button
                  data-testid="restore-cancel"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setRestoreTarget(null)}
                  disabled={busy}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl bg-white p-4 border border-border/60 flex items-center justify-between">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: color }}
      >
        <Icon size={18} />
      </div>
      <div className="text-end min-w-0">
        <div className="text-[11px] font-bold text-foreground/60">{label}</div>
        <div className="text-base font-extrabold text-foreground truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
