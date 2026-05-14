import { BookOpenText, Lightbulb, CheckCircle2 } from "lucide-react";
import { useAppSettings } from "../../context/AppSettingsContext";
import { currentSubject } from "../../data/mockData";

export const TodayTopicCard = () => {
  const { settings } = useAppSettings();

  return (
    <section
      data-testid="today-topic-card"
      className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50"
    >
      <div className="flex items-center justify-end gap-2 text-foreground/60 mb-5">
        <span className="text-sm font-bold text-foreground">موضوع اليوم</span>
        <BookOpenText size={18} style={{ color: settings.primaryColor }} />
      </div>

      <div className="flex justify-center py-6">
        <h3
          data-testid="today-topic-title"
          className="text-3xl sm:text-4xl font-extrabold"
          style={{
            color: settings.primaryColor,
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}
        >
          {currentSubject.topic}
        </h3>
      </div>
    </section>
  );
};

export const ImportantPointsCard = () => {
  const { settings } = useAppSettings();

  return (
    <section
      data-testid="important-points-card"
      className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50"
    >
      <div className="flex items-center justify-end gap-2 mb-6">
        <span className="text-sm font-bold text-foreground">النقاط المهمة</span>
        <Lightbulb size={18} style={{ color: settings.primaryColor }} />
      </div>

      <ul className="space-y-4">
        {currentSubject.points.map((point, idx) => (
          <li
            key={idx}
            data-testid={`lesson-point-${idx}`}
            className="flex items-start gap-3 text-foreground/85"
          >
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </span>
            <span className="text-[15px] leading-relaxed">{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
