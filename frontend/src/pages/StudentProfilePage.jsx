// Student profile — 7 tabs aggregating data the app already collects.
// Tabs with no backing data yet (grades, assignments, behavior, activities)
// render a graceful empty-state, per the spec's "no demo data" rule.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  User as UserIcon,
  CalendarCheck,
  Star,
  ClipboardList,
  AlertTriangle,
  Activity,
  FileText,
  Printer,
  Phone,
  Mail,
  MapPin,
  Cake,
  StickyNote,
  Loader2,
  CheckCircle2,
  XCircle,
  AlarmClock,
  LogOut as LogOutIcon,
} from "lucide-react";
import { api, extractError } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const ATT_STATUS = {
  present: { label: "حاضر", color: "#16a34a", Icon: CheckCircle2 },
  absent: { label: "غائب", color: "#dc2626", Icon: XCircle },
  late: { label: "متأخر", color: "#ea580c", Icon: AlarmClock },
  early_leave: { label: "خروج مبكر", color: "#2563eb", Icon: LogOutIcon },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="rounded-3xl bg-white p-12 text-center border border-border/60 space-y-2">
      <Icon size={36} className="mx-auto text-foreground/30" />
      <p className="font-bold text-foreground/75">{title}</p>
      {hint && <p className="text-xs text-foreground/55">{hint}</p>}
    </div>
  );
}

function SmartBadge({ status }) {
  if (!status) return null;
  return (
    <span
      data-testid={`smart-badge-${status.key}`}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-white"
      style={{ backgroundColor: status.color }}
    >
      <AlertTriangle size={12} />
      {status.label}
    </span>
  );
}

function CountTile({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl bg-white p-4 border border-border/60 flex items-center justify-between">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
      >
        <Icon size={18} />
      </div>
      <div className="text-end">
        <div className="text-[11px] font-bold text-foreground/60">{label}</div>
        <div className="text-2xl font-extrabold text-foreground">{value}</div>
      </div>
    </div>
  );
}

// ---------- Profile tab ----------
function ProfileTab({ student }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-6 border border-border/60 space-y-4">
        <h3 className="font-extrabold text-end">البيانات الأساسية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-end">
          <Row icon={UserIcon} label="الاسم" value={student.name} />
          <Row icon={Cake} label="تاريخ الميلاد" value={student.birth_date} />
          <Row icon={MapPin} label="العنوان" value={student.address} className="sm:col-span-2" />
          <Row icon={StickyNote} label="ملاحظات" value={student.notes} className="sm:col-span-2" />
        </div>
      </section>
      <section className="rounded-3xl bg-white p-6 border border-border/60 space-y-3">
        <h3 className="font-extrabold text-end">أولياء الأمور</h3>
        {(!student.parents || student.parents.length === 0) ? (
          <p className="text-sm text-foreground/55 text-end">
            لم يُضف ولي أمر بعد.
          </p>
        ) : (
          <div className="space-y-3">
            {student.parents.map((p) => (
              <div
                key={p.id}
                data-testid={`profile-parent-${p.id}`}
                className="rounded-2xl bg-violet-50 p-4 text-end"
              >
                <div className="font-extrabold">
                  {p.name}
                  {p.relation && (
                    <span className="text-foreground/55 font-normal mr-1">
                      — {p.relation}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-foreground/70">
                  {p.phone && (
                    <span className="flex items-center gap-1">
                      <span dir="ltr">{p.phone}</span>
                      <Phone size={11} />
                    </span>
                  )}
                  {p.email && (
                    <span className="flex items-center gap-1">
                      <span dir="ltr">{p.email}</span>
                      <Mail size={11} />
                    </span>
                  )}
                  {p.address && (
                    <span className="flex items-center gap-1">
                      <span>{p.address}</span>
                      <MapPin size={11} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
function Row({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={`flex items-start gap-2 justify-end ${className}`}>
      <div className="flex-1">
        <div className="text-[11px] text-foreground/55">{label}</div>
        <div className="font-bold text-foreground/90 break-words">
          {value || <span className="text-foreground/40">—</span>}
        </div>
      </div>
      <Icon size={16} className="text-foreground/40 mt-1" />
    </div>
  );
}

// ---------- Attendance tab ----------
function AttendanceTab({ studentId }) {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/reports/student/${studentId}/attendance?from=${from}&to=${to}`,
      );
      setData(res.data);
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setLoading(false);
    }
  }, [studentId, from, to]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 border border-border/60 flex flex-wrap items-end gap-3 justify-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-end block">من</Label>
          <Input
            data-testid="att-from"
            type="date"
            dir="ltr"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[160px] text-center"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-end block">إلى</Label>
          <Input
            data-testid="att-to"
            type="date"
            dir="ltr"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px] text-center"
          />
        </div>
        {data?.smart_status && <SmartBadge status={data.smart_status} />}
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-8 text-foreground/50">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CountTile icon={CheckCircle2} label="حاضر" value={data.counts.present} color="#16a34a" />
            <CountTile icon={XCircle} label="غائب" value={data.counts.absent} color="#dc2626" />
            <CountTile icon={AlarmClock} label="متأخر" value={data.counts.late} color="#ea580c" />
            <CountTile icon={LogOutIcon} label="خروج مبكر" value={data.counts.early_leave} color="#2563eb" />
          </div>

          <div className="rounded-3xl bg-white border border-border/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between text-sm">
              <span className="text-foreground/60">
                نسبة الحضور: <b className="text-foreground">{data.attendance_rate}%</b>
                <span className="mx-3">|</span>
                إجمالي: <b className="text-foreground">{data.total_days}</b>
                <span className="mx-3">|</span>
                بعذر: <b className="text-foreground">{data.excused_count}</b>
              </span>
              <h4 className="font-extrabold text-end">سجل الأيام</h4>
            </div>
            {data.records.length === 0 ? (
              <div className="p-8 text-center text-foreground/55 text-sm">
                لا توجد سجلات في هذه الفترة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-end text-sm" dir="rtl">
                  <thead className="bg-secondary/40 text-foreground/65">
                    <tr>
                      <th className="px-4 py-2 font-bold">التاريخ</th>
                      <th className="px-4 py-2 font-bold">الحالة</th>
                      <th className="px-4 py-2 font-bold">وقت الوصول</th>
                      <th className="px-4 py-2 font-bold">خروج مبكر</th>
                      <th className="px-4 py-2 font-bold">العذر</th>
                      <th className="px-4 py-2 font-bold">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((r) => {
                      const st = ATT_STATUS[r.status] || ATT_STATUS.present;
                      return (
                        <tr
                          key={r.id}
                          data-testid={`att-row-${r.id}`}
                          className="border-t border-border/40 hover:bg-secondary/30"
                        >
                          <td className="px-4 py-2 font-mono text-xs">{r.date}</td>
                          <td className="px-4 py-2">
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                              style={{ backgroundColor: st.color }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">{r.arrival_time || "—"}</td>
                          <td className="px-4 py-2 font-mono text-xs">{r.departure_time || "—"}</td>
                          <td className="px-4 py-2 text-xs">
                            {r.status === "present"
                              ? "—"
                              : r.excused
                                ? "بعذر"
                                : "بدون عذر"}
                          </td>
                          <td className="px-4 py-2 text-xs text-foreground/70">{r.note || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Reports tab (per-student print view) ----------
function ReportsTab({ student, profile }) {
  const att = profile?.attendance_30d;
  return (
    <div className="space-y-5">
      <div className="flex justify-end print:hidden">
        <Button
          data-testid="print-student-report"
          onClick={() => window.print()}
          className="rounded-xl text-white bg-violet-600 hover:bg-violet-700"
        >
          <Printer size={16} className="me-1" /> طباعة / تصدير PDF
        </Button>
      </div>

      <section
        id="printable-area"
        data-testid="student-report"
        className="rounded-3xl bg-white p-8 border border-border/60 space-y-5 print:border-0 print:p-0"
      >
        <header className="text-end space-y-1 border-b border-border/40 pb-4">
          <h2 className="text-2xl font-extrabold">تقرير الطالب الشامل</h2>
          <div className="text-sm text-foreground/60">
            {student.name}
            {student.birth_date && (
              <span className="mx-2">| تاريخ الميلاد: {student.birth_date}</span>
            )}
          </div>
          <div className="text-xs text-foreground/45">
            تاريخ التقرير: {new Date().toLocaleDateString("ar-EG")}
          </div>
        </header>

        <section className="space-y-2 text-end">
          <h3 className="font-extrabold">الانضباط بالدوام — آخر 30 يومًا</h3>
          {!att ? (
            <p className="text-foreground/50 text-sm">جارٍ التحميل…</p>
          ) : (
            <>
              <div className="flex items-center justify-end gap-3 flex-wrap">
                <SmartBadge status={att.smart_status} />
                <span className="text-sm">
                  نسبة الحضور: <b>{att.attendance_rate}%</b>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                <CountTile icon={CheckCircle2} label="حاضر" value={att.counts.present} color="#16a34a" />
                <CountTile icon={XCircle} label="غائب" value={att.counts.absent} color="#dc2626" />
                <CountTile icon={AlarmClock} label="متأخر" value={att.counts.late} color="#ea580c" />
                <CountTile icon={LogOutIcon} label="خروج مبكر" value={att.counts.early_leave} color="#2563eb" />
              </div>
            </>
          )}
        </section>

        <section className="space-y-2 text-end">
          <h3 className="font-extrabold">العلامات</h3>
          <p className="text-sm text-foreground/55">
            ميزة العلامات قيد الإضافة. سيتم احتساب المعدّلات تلقائيًا من قاعدة البيانات.
          </p>
        </section>

        <section className="space-y-2 text-end">
          <h3 className="font-extrabold">الواجبات</h3>
          <p className="text-sm text-foreground/55">
            ميزة الواجبات قيد الإضافة.
          </p>
        </section>

        <section className="space-y-2 text-end">
          <h3 className="font-extrabold">السلوك والمشاركة</h3>
          <p className="text-sm text-foreground/55">
            بانتظار تفعيل وحدتَي السلوك والنشاطات.
          </p>
        </section>
      </section>
    </div>
  );
}

// ---------- Page ----------
export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/reports/student/${id}/profile`)
      .then((res) => !cancelled && setProfile(res.data))
      .catch((e) => {
        toast.error(extractError(e));
        navigate("/students", { replace: true });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const tabs = useMemo(
    () => [
      { key: "profile", label: "الملف الشخصي", icon: UserIcon },
      { key: "attendance", label: "الانضباط بالدوام", icon: CalendarCheck },
      { key: "grades", label: "العلامات", icon: Star },
      { key: "assignments", label: "الواجبات", icon: ClipboardList },
      { key: "behavior", label: "السلوك والمشكلات", icon: AlertTriangle },
      { key: "activities", label: "النشاطات والمشاركة", icon: Activity },
      { key: "reports", label: "التقارير", icon: FileText },
    ],
    [],
  );

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-16 text-foreground/50">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  const { student } = profile;

  return (
    <div data-testid="student-profile-page" className="space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/students" data-testid="back-to-students">
            <ArrowRight size={16} className="me-1" /> رجوع للطلاب
          </Link>
        </Button>
        <div className="flex items-center gap-3 text-end">
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            >
              {student.name}
            </h1>
            <p className="text-sm text-foreground/60">الملف الشامل للطالب</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center font-extrabold text-lg">
            {student.name.charAt(0)}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-5" dir="rtl">
        <TabsList
          data-testid="profile-tabs"
          className="flex flex-wrap h-auto bg-white border border-border/60 rounded-2xl p-1.5 gap-1 print:hidden"
        >
          {tabs.map(({ key, label, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              data-testid={`tab-${key}`}
              className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white text-sm font-bold px-3"
            >
              <Icon size={14} className="me-1" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab student={student} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab studentId={student.id} />
        </TabsContent>
        <TabsContent value="grades">
          <EmptyState
            icon={Star}
            title="العلامات قيد الإضافة"
            hint="ستظهر هنا تلقائيًا بمجرد تفعيل وحدة العلامات."
          />
        </TabsContent>
        <TabsContent value="assignments">
          <EmptyState
            icon={ClipboardList}
            title="الواجبات قيد الإضافة"
            hint="ستظهر هنا واجبات الطالب ومستوى إنجازها."
          />
        </TabsContent>
        <TabsContent value="behavior">
          <EmptyState
            icon={AlertTriangle}
            title="السلوك والمشكلات قيد الإضافة"
            hint="ستظهر هنا الملاحظات السلوكية والإجراءات."
          />
        </TabsContent>
        <TabsContent value="activities">
          <EmptyState
            icon={Activity}
            title="النشاطات والمشاركة قيد الإضافة"
            hint="ستظهر هنا الأنشطة الصفية واللامنهجية."
          />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab student={student} profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
