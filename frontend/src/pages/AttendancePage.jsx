// Attendance — global, seatless, card-grid layout. Works on phone/tablet/desktop.
//
// Flow:
//   • Open page → GET /api/attendance?date=YYYY-MM-DD bootstraps every student
//     as "present" within work hours.
//   • Tap a card → opens a dialog with 4 status chips + excused + note.
//   • "الجميع حاضر" resets all to present.
//   • Alphabetical view (default) or manual (drag-and-drop, persisted to backend).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Save,
  Users,
  CheckCircle2,
  XCircle,
  AlarmClock,
  LogOut as LogOutIcon,
  ArrowDownAZ,
  GripVertical,
  Loader2,
} from "lucide-react";
import { api, extractError } from "../lib/api";
import { useStudents } from "../context/StudentsContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const STATUS = {
  present: {
    label: "حاضر",
    color: "#16a34a",
    soft: "bg-green-50 text-green-700 border-green-200",
    chip: "bg-green-500",
    Icon: CheckCircle2,
  },
  absent: {
    label: "غائب",
    color: "#dc2626",
    soft: "bg-red-50 text-red-700 border-red-200",
    chip: "bg-red-500",
    Icon: XCircle,
  },
  late: {
    label: "متأخر",
    color: "#ea580c",
    soft: "bg-orange-50 text-orange-700 border-orange-200",
    chip: "bg-orange-500",
    Icon: AlarmClock,
  },
  early_leave: {
    label: "خروج مبكر",
    color: "#2563eb",
    soft: "bg-blue-50 text-blue-700 border-blue-200",
    chip: "bg-blue-500",
    Icon: LogOutIcon,
  },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.present;
  const { Icon } = s;
  return (
    <span
      data-testid={`status-chip-${status}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${s.soft}`}
    >
      <Icon size={12} />
      {s.label}
    </span>
  );
}

function StudentCard({
  student,
  record,
  manualMode,
  onClick,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const status = record?.status || "present";
  const s = STATUS[status];
  return (
    <button
      type="button"
      data-testid={`attendance-card-${student.id}`}
      data-status={status}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group relative w-full rounded-2xl border-2 bg-white p-3 text-end soft-shadow transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-md ${s.soft} border-current/30`}
      style={{ borderColor: s.color + "55" }}
    >
      <span
        aria-hidden
        className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${s.chip}`}
      />
      {manualMode && (
        <span
          aria-hidden
          className="absolute top-2 left-2 text-foreground/30"
        >
          <GripVertical size={14} />
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-white font-extrabold text-base"
          style={{ backgroundColor: s.color }}
        >
          {student.name?.trim()?.charAt(0) || "؟"}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-extrabold text-[14px] text-foreground truncate text-end"
            title={student.name}
          >
            {student.name}
          </div>
          <div className="mt-1 flex items-center justify-end">
            <StatusChip status={status} />
          </div>
          {(record?.arrival_time || record?.departure_time) && (
            <div className="mt-1 text-[10px] text-foreground/55 flex items-center justify-end gap-2">
              {record.arrival_time && (
                <span>وصل: {record.arrival_time}</span>
              )}
              {record.departure_time && (
                <span>خرج: {record.departure_time}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function StatusEditor({ open, student, current, onClose, onSave }) {
  const [status, setStatus] = useState(current?.status || "present");
  const [excused, setExcused] = useState(!!current?.excused);
  const [note, setNote] = useState(current?.note || "");

  useEffect(() => {
    if (open) {
      setStatus(current?.status || "present");
      setExcused(!!current?.excused);
      setNote(current?.note || "");
    }
  }, [open, current]);

  if (!student) return null;
  const needsExcuse = status !== "present";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        dir="rtl"
        data-testid="attendance-editor-dialog"
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-end">{student.name}</DialogTitle>
          <DialogDescription className="text-end">
            اختاري حالة الحضور وأضيفي ملاحظة إن أردتِ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS).map(([k, v]) => {
              const active = status === k;
              const { Icon } = v;
              return (
                <button
                  key={k}
                  type="button"
                  data-testid={`pick-status-${k}`}
                  onClick={() => setStatus(k)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                    active
                      ? "text-white border-transparent"
                      : "bg-white text-foreground border-border hover:border-foreground/30"
                  }`}
                  style={active ? { backgroundColor: v.color } : undefined}
                >
                  <Icon size={16} />
                  {v.label}
                </button>
              );
            })}
          </div>

          {needsExcuse && (
            <div className="flex items-center justify-end gap-3 rounded-2xl bg-secondary/40 px-4 py-3">
              <Label
                htmlFor="excused"
                className="text-sm font-bold cursor-pointer select-none"
              >
                {excused ? "بعذر" : "بدون عذر"}
              </Label>
              <input
                id="excused"
                data-testid="attendance-excused-toggle"
                type="checkbox"
                className="h-5 w-5 accent-violet-600"
                checked={excused}
                onChange={(e) => setExcused(e.target.checked)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-end block text-sm">ملاحظة (اختياري)</Label>
            <Textarea
              data-testid="attendance-note"
              dir="rtl"
              className="text-end min-h-[70px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: راجعت الأمر مع ولي الأمر"
            />
          </div>

          <div className="flex gap-2 justify-start pt-1">
            <Button
              data-testid="attendance-editor-save"
              className="rounded-xl text-white"
              style={{ backgroundColor: STATUS[status].color }}
              onClick={() =>
                onSave({ status, excused: needsExcuse ? excused : false, note })
              }
            >
              حفظ
            </Button>
            <Button
              data-testid="attendance-editor-cancel"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AttendancePage() {
  const { students, loading: studentsLoading } = useStudents();
  const [date, setDate] = useState(todayISO());
  const [settings, setSettings] = useState({
    day_start: "07:00",
    day_end: "13:00",
    student_order: [],
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("alpha"); // "alpha" | "manual"
  const [editing, setEditing] = useState(null); // {student, record}
  const [dragId, setDragId] = useState(null);

  const recordsByStudent = useMemo(() => {
    const m = {};
    for (const r of records) m[r.student_id] = r;
    return m;
  }, [records]);

  const orderedStudents = useMemo(() => {
    if (view === "manual") {
      const orderIds = settings.student_order || [];
      const known = new Set(students.map((s) => s.id));
      const ordered = orderIds.filter((id) => known.has(id)).map((id) =>
        students.find((s) => s.id === id),
      );
      const rest = students.filter((s) => !orderIds.includes(s.id));
      return [...ordered, ...rest];
    }
    return [...students].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "ar"),
    );
  }, [students, settings.student_order, view]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, early_leave: 0 };
    for (const s of students) {
      const st = recordsByStudent[s.id]?.status || "present";
      if (c[st] !== undefined) c[st] += 1;
    }
    return c;
  }, [students, recordsByStudent]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance?date=${date}`);
      setSettings(res.data.settings);
      setRecords(res.data.records || []);
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveSetting = async (patch) => {
    try {
      const res = await api.patch("/attendance/settings", patch);
      setSettings(res.data);
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const setStudentStatus = async (studentId, payload) => {
    try {
      const res = await api.put(
        `/attendance/${studentId}?date=${date}`,
        payload,
      );
      setRecords((prev) => {
        const others = prev.filter((r) => r.student_id !== studentId);
        return [...others, res.data];
      });
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const markAllPresent = async () => {
    try {
      const res = await api.post(`/attendance/mark-all-present?date=${date}`);
      setRecords(res.data.records || []);
      toast.success("تم تعليم جميع الطلاب كحاضرين");
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const persistOrder = async (newOrder) => {
    setSettings((s) => ({ ...s, student_order: newOrder }));
    await saveSetting({ student_order: newOrder });
  };

  // --- Drag and drop (manual view only) ----------------------------------
  const onDragStart = (id) => (e) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (targetId) => (e) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const currentOrder = orderedStudents.map((s) => s.id);
    const from = currentOrder.indexOf(dragId);
    const to = currentOrder.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...currentOrder];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setDragId(null);
    persistOrder(next);
  };

  return (
    <div data-testid="attendance-page" className="space-y-5">
      {/* Toolbar */}
      <div className="rounded-3xl bg-white p-4 sm:p-6 soft-shadow border border-border/50">
        <div className="flex flex-wrap items-end justify-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-end block text-xs">
              <CalendarDays size={12} className="inline me-1" />
              التاريخ
            </Label>
            <Input
              data-testid="attendance-date"
              type="date"
              dir="ltr"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-center w-[160px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-end block text-xs">
              <Clock size={12} className="inline me-1" />
              بداية الدوام
            </Label>
            <Input
              data-testid="attendance-day-start"
              type="time"
              dir="ltr"
              value={settings.day_start}
              onChange={(e) =>
                setSettings((s) => ({ ...s, day_start: e.target.value }))
              }
              onBlur={(e) => saveSetting({ day_start: e.target.value })}
              className="text-center w-[140px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-end block text-xs">
              <Clock size={12} className="inline me-1" />
              نهاية الدوام
            </Label>
            <Input
              data-testid="attendance-day-end"
              type="time"
              dir="ltr"
              value={settings.day_end}
              onChange={(e) =>
                setSettings((s) => ({ ...s, day_end: e.target.value }))
              }
              onBlur={(e) => saveSetting({ day_end: e.target.value })}
              className="text-center w-[140px]"
            />
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              data-testid="attendance-toggle-view"
              className="rounded-xl"
              onClick={() => setView((v) => (v === "alpha" ? "manual" : "alpha"))}
            >
              {view === "alpha" ? (
                <>
                  <ArrowDownAZ size={16} className="me-1" /> ترتيب أبجدي
                </>
              ) : (
                <>
                  <GripVertical size={16} className="me-1" /> ترتيب يدوي
                </>
              )}
            </Button>
            <Button
              variant="outline"
              data-testid="attendance-mark-all"
              className="rounded-xl"
              onClick={markAllPresent}
            >
              <CheckCircle2 size={16} className="me-1" /> الجميع حاضر
            </Button>
            <Button
              data-testid="attendance-save"
              className="rounded-xl text-white bg-violet-600 hover:bg-violet-700"
              onClick={() => {
                toast.success("تم حفظ الحضور");
              }}
            >
              <Save size={16} className="me-1" /> حفظ الحضور
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "present", icon: CheckCircle2 },
          { key: "absent", icon: XCircle },
          { key: "late", icon: AlarmClock },
          { key: "early_leave", icon: LogOutIcon },
        ].map(({ key, icon: Icon }) => {
          const s = STATUS[key];
          return (
            <div
              key={key}
              data-testid={`summary-${key}`}
              className="rounded-2xl bg-white p-4 border border-border/60 flex items-center justify-between"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: s.color }}
              >
                <Icon size={20} />
              </div>
              <div className="text-end">
                <div className="text-xs font-bold text-foreground/60">
                  {s.label}
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {counts[key]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      {studentsLoading || loading ? (
        <div className="flex justify-center py-16 text-foreground/60">
          <Loader2 className="animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div
          data-testid="attendance-empty"
          className="rounded-3xl bg-white p-12 text-center border border-border/60"
        >
          <Users size={36} className="mx-auto text-foreground/30" />
          <p className="mt-3 text-foreground/70 font-bold">
            لا يوجد طلاب مضافون بعد
          </p>
        </div>
      ) : (
        <div
          data-testid="attendance-grid"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
        >
          {orderedStudents.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              record={recordsByStudent[s.id]}
              manualMode={view === "manual"}
              draggable={view === "manual"}
              onDragStart={onDragStart(s.id)}
              onDragOver={onDragOver}
              onDrop={onDrop(s.id)}
              onClick={() =>
                setEditing({ student: s, record: recordsByStudent[s.id] })
              }
            />
          ))}
        </div>
      )}

      <StatusEditor
        open={!!editing}
        student={editing?.student}
        current={editing?.record}
        onClose={() => setEditing(null)}
        onSave={async (payload) => {
          await setStudentStatus(editing.student.id, payload);
          setEditing(null);
        }}
      />
    </div>
  );
}
