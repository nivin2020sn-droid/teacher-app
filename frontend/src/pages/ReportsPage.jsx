// Reports — class-wide & individual reports. Powered exclusively by data the
// app already collects (attendance + students for now). Modules not yet built
// (grades, assignments, behaviour, activities) show a clear "coming soon"
// state instead of fabricating numbers.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CalendarCheck,
  Star,
  ClipboardList,
  AlertTriangle,
  Activity,
  Users,
  Printer,
  Loader2,
  CheckCircle2,
  XCircle,
  AlarmClock,
  LogOut as LogOutIcon,
  FileText,
} from "lucide-react";
import { api, extractError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const REPORT_KINDS = [
  { key: "class_attendance", label: "تقرير الحضور والانضباط", icon: CalendarCheck, ready: true },
  { key: "student_individual", label: "تقرير الطالب الفردي", icon: FileText, ready: true, link: "/students" },
  { key: "class_grades", label: "تقرير العلامات", icon: Star, ready: false },
  { key: "class_assignments", label: "تقرير الواجبات", icon: ClipboardList, ready: false },
  { key: "class_behavior", label: "تقرير السلوك", icon: AlertTriangle, ready: false },
  { key: "class_activities", label: "تقرير النشاطات", icon: Activity, ready: false },
  { key: "class_overview", label: "تقرير الصف الكامل", icon: Users, ready: true },
];

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

function ClassAttendanceReport() {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/class/attendance?from=${from}&to=${to}`);
      setData(res.data);
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div data-testid="report-class-attendance" className="space-y-5">
      <div className="rounded-3xl bg-white p-5 border border-border/60 flex flex-wrap items-end gap-3 justify-end print:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs text-end block">من</Label>
          <Input
            data-testid="report-from"
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
            data-testid="report-to"
            type="date"
            dir="ltr"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px] text-center"
          />
        </div>
        <Button
          data-testid="report-print"
          onClick={() => window.print()}
          className="rounded-xl text-white bg-violet-600 hover:bg-violet-700"
        >
          <Printer size={16} className="me-1" /> طباعة / تصدير PDF
        </Button>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-12 text-foreground/50">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div id="printable-area" className="space-y-5">
          <header className="rounded-3xl bg-white p-6 border border-border/60 text-end">
            <h2 className="text-2xl font-extrabold">تقرير الحضور والانضباط</h2>
            <p className="text-sm text-foreground/60 mt-1">
              الفترة: {data.from} ← {data.to}
              <span className="mx-3">|</span>
              عدد الطلاب: <b>{data.total_students}</b>
              <span className="mx-3">|</span>
              يحتاج متابعة: <b className="text-rose-600">{data.needs_followup_count}</b>
            </p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CountTile icon={CheckCircle2} label="حاضر" value={data.totals.present} color="#16a34a" />
            <CountTile icon={XCircle} label="غائب" value={data.totals.absent} color="#dc2626" />
            <CountTile icon={AlarmClock} label="متأخر" value={data.totals.late} color="#ea580c" />
            <CountTile icon={LogOutIcon} label="خروج مبكر" value={data.totals.early_leave} color="#2563eb" />
          </div>

          <div className="rounded-3xl bg-white border border-border/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 text-end">
              <h4 className="font-extrabold">بيان الطلاب</h4>
            </div>
            {data.rows.length === 0 ? (
              <div className="p-8 text-center text-foreground/55 text-sm">
                لا يوجد طلاب لعرضهم.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-end text-sm" dir="rtl">
                  <thead className="bg-secondary/40 text-foreground/65">
                    <tr>
                      <th className="px-4 py-2 font-bold">الطالب</th>
                      <th className="px-4 py-2 font-bold">حاضر</th>
                      <th className="px-4 py-2 font-bold">غائب</th>
                      <th className="px-4 py-2 font-bold">متأخر</th>
                      <th className="px-4 py-2 font-bold">خروج مبكر</th>
                      <th className="px-4 py-2 font-bold">نسبة الحضور</th>
                      <th className="px-4 py-2 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr
                        key={r.student_id}
                        data-testid={`report-row-${r.student_id}`}
                        className="border-t border-border/40 hover:bg-secondary/30"
                      >
                        <td className="px-4 py-2 font-bold">
                          <Link
                            to={`/students/${r.student_id}`}
                            className="hover:underline text-violet-700 print:text-foreground print:no-underline"
                          >
                            {r.student_name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-green-700 font-bold">{r.counts.present}</td>
                        <td className="px-4 py-2 text-red-700 font-bold">{r.counts.absent}</td>
                        <td className="px-4 py-2 text-orange-700 font-bold">{r.counts.late}</td>
                        <td className="px-4 py-2 text-blue-700 font-bold">{r.counts.early_leave}</td>
                        <td className="px-4 py-2">{r.attendance_rate}%</td>
                        <td className="px-4 py-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                            style={{ backgroundColor: r.smart_status.color }}
                          >
                            {r.smart_status.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ComingSoonReport({ label }) {
  return (
    <div
      data-testid="report-coming-soon"
      className="rounded-3xl bg-white p-12 text-center border border-border/60 space-y-2"
    >
      <BarChart3 size={36} className="mx-auto text-foreground/30" />
      <p className="font-bold text-foreground/75">{label} — قيد الإضافة</p>
      <p className="text-xs text-foreground/55">
        سيُحتسب تلقائيًا من قاعدة البيانات بمجرد تفعيل الوحدة المسؤولة.
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const [active, setActive] = useState("class_attendance");
  const activeKind = REPORT_KINDS.find((k) => k.key === active);

  return (
    <div data-testid="reports-page" className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div />
        <div className="flex items-center gap-3 text-end">
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            >
              التقارير
            </h1>
            <p className="text-sm text-foreground/60">
              تقارير مبنية على بيانات التطبيق الفعلية
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <BarChart3 size={22} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 print:hidden">
        {REPORT_KINDS.map(({ key, label, icon: Icon, ready, link }) => {
          const isActive = active === key;
          const card = (
            <button
              type="button"
              data-testid={`report-card-${key}`}
              onClick={() => !link && setActive(key)}
              className={`w-full rounded-2xl p-4 border-2 text-end transition-all ${
                isActive
                  ? "border-violet-500 bg-violet-50"
                  : "border-border/60 bg-white hover:border-foreground/30"
              } ${!ready ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  size={20}
                  className={isActive ? "text-violet-600" : "text-foreground/55"}
                />
                {!ready && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                    قريبًا
                  </span>
                )}
                {ready && link && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">
                    عبر ملف الطالب
                  </span>
                )}
              </div>
              <div className="mt-2 font-extrabold text-sm">{label}</div>
            </button>
          );
          return link ? (
            <Link key={key} to={link} className="block">
              {card}
            </Link>
          ) : (
            <div key={key}>{card}</div>
          );
        })}
      </div>

      {active === "class_attendance" || active === "class_overview" ? (
        <ClassAttendanceReport />
      ) : activeKind ? (
        <ComingSoonReport label={activeKind.label} />
      ) : null}
    </div>
  );
}
