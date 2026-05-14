import { CalendarRange } from "lucide-react";
import { todaySchedule } from "../../data/mockData";

const DOT = {
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  pink: "bg-pink-500",
};

export const TodaySchedule = () => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2 text-foreground/70">
        <span className="text-sm font-bold text-foreground">جدول اليوم</span>
        <CalendarRange size={16} className="text-violet-500" />
      </div>

      <ul data-testid="today-schedule-list" className="space-y-2.5">
        {todaySchedule.map((slot) => (
          <li
            key={slot.id}
            data-testid={`schedule-item-${slot.id}`}
            className={[
              "flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-colors",
              slot.active
                ? "bg-violet-50 border-violet-200"
                : "bg-white border-border/60 hover:bg-secondary/60",
            ].join(" ")}
          >
            <span className="text-xs font-semibold text-foreground/60 tabular-nums">
              {slot.start} - {slot.end}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {slot.name}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${DOT[slot.color] || "bg-violet-500"}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodaySchedule;
