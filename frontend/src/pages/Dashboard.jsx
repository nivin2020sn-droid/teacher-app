import { Calendar } from "lucide-react";
import { useAppSettings } from "../context/AppSettingsContext";
import { todayDate } from "../data/mockData";
import CurrentSubjectCard from "../components/dashboard/CurrentSubjectCard";
import {
  TodayTopicCard,
  ImportantPointsCard,
} from "../components/dashboard/TopicAndPoints";
import QuickTools from "../components/dashboard/QuickTools";
import TodaySummary from "../components/dashboard/TodaySummary";
import TodaySchedule from "../components/dashboard/TodaySchedule";

export default function Dashboard() {
  const { settings } = useAppSettings();

  return (
    <div data-testid="dashboard-page" className="max-w-[1500px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-bold soft-shadow"
          data-testid="current-subject-pill"
          style={{ backgroundColor: settings.primaryColor }}
        >
          المادة الحالية
        </div>

        <div
          data-testid="today-date"
          className="flex items-center gap-2 text-foreground/70 text-sm font-semibold"
        >
          <Calendar size={16} />
          <span>
            {todayDate.weekday} {todayDate.day} {todayDate.month} {todayDate.year}
          </span>
        </div>
      </div>

      {/* Main grid: middle (main) + left column (stats + schedule)
          In RTL flow, the first column visually appears on the right. We want:
          right → main content, left → summary column. So column order:
          [main content][summary column] which renders right-to-left correctly. */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main content */}
        <div className="space-y-6 min-w-0">
          <CurrentSubjectCard />
          <TodayTopicCard />
          <ImportantPointsCard />
          <QuickTools />
        </div>

        {/* Summary / schedule (visually on the left in RTL) */}
        <aside className="space-y-6">
          <TodaySummary />
          <TodaySchedule />
        </aside>
      </div>
    </div>
  );
}
