import { useEffect, useState } from "react";
import { Users, UserX, Clock, BookMarked, Sparkles } from "lucide-react";
import { stats, currentSubject, nextSubject } from "../../data/mockData";

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const StatCard = ({
  testId,
  label,
  value,
  hint,
  icon: Icon,
  bgClass,
  fgClass,
  iconBgClass,
}) => (
  <div
    data-testid={testId}
    className={`rounded-3xl ${bgClass} p-5 border border-white/60 soft-shadow flex items-center justify-between gap-3`}
  >
    <div
      className={`h-12 w-12 rounded-2xl ${iconBgClass} ${fgClass} flex items-center justify-center shrink-0`}
    >
      <Icon size={22} strokeWidth={2.2} />
    </div>
    <div className="text-end flex-1">
      <div className={`text-xs font-bold ${fgClass} mb-1`}>{label}</div>
      <div className="text-3xl font-extrabold text-foreground leading-none">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-foreground/60 mt-1.5">{hint}</div>
      )}
    </div>
  </div>
);

export const TodaySummary = () => {
  const [remaining, setRemaining] = useState(currentSubject.remainingSeconds);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 text-foreground/70 mb-1">
        <span className="text-sm font-bold text-foreground">ملخص اليوم</span>
        <Sparkles size={16} className="text-violet-500" />
      </div>

      <StatCard
        testId="stat-students-count"
        label="عدد الطلاب"
        value={stats.studentsCount}
        hint="طالب"
        icon={Users}
        bgClass="bg-indigo-50"
        fgClass="text-indigo-600"
        iconBgClass="bg-white"
      />

      <StatCard
        testId="stat-absent-count"
        label="الطلاب الغائبون"
        value={stats.absentCount}
        hint="طالب"
        icon={UserX}
        bgClass="bg-rose-50"
        fgClass="text-rose-500"
        iconBgClass="bg-white"
      />

      <StatCard
        testId="stat-timer"
        label="الوقت المتبقي للحصة"
        value={formatTime(remaining)}
        hint={`من ${currentSubject.totalMinutes} دقيقة`}
        icon={Clock}
        bgClass="bg-emerald-50"
        fgClass="text-emerald-600"
        iconBgClass="bg-white"
      />

      <div
        data-testid="stat-next-class"
        className="rounded-3xl bg-amber-50 p-5 border border-white/60 soft-shadow flex items-center gap-4"
      >
        <div className="h-12 w-12 rounded-2xl bg-white text-amber-600 flex items-center justify-center shrink-0">
          <BookMarked size={22} strokeWidth={2.2} />
        </div>
        <div className="text-end flex-1">
          <div className="text-xs font-bold text-amber-700 mb-1">
            الحصة التالية
          </div>
          <div className="text-lg font-extrabold text-foreground leading-none">
            {nextSubject.name}
          </div>
          <div className="text-[11px] text-foreground/60 mt-1.5 flex items-center justify-end gap-1">
            <Clock size={11} />
            <span>
              {nextSubject.startTime} - {nextSubject.endTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodaySummary;
