import {
  Zap,
  ClipboardCheck,
  NotebookPen,
  BookPlus,
  FileText,
  UsersRound,
} from "lucide-react";
import { useAppSettings } from "../../context/AppSettingsContext";
import { quickTools } from "../../data/mockData";

const ICONS = {
  ClipboardCheck,
  NotebookPen,
  BookPlus,
  FileText,
  UsersRound,
};

const PALETTES = {
  red: { bg: "bg-rose-50", fg: "text-rose-500", ring: "ring-rose-100" },
  green: {
    bg: "bg-emerald-50",
    fg: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  yellow: {
    bg: "bg-amber-50",
    fg: "text-amber-600",
    ring: "ring-amber-100",
  },
  blue: { bg: "bg-sky-50", fg: "text-sky-600", ring: "ring-sky-100" },
  violet: {
    bg: "bg-violet-50",
    fg: "text-violet-600",
    ring: "ring-violet-100",
  },
};

export const QuickTools = () => {
  const { settings } = useAppSettings();

  return (
    <section
      data-testid="quick-tools-card"
      className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50"
    >
      <div className="flex items-center justify-end gap-2 mb-6">
        <span className="text-sm font-bold text-foreground">أدوات سريعة</span>
        <Zap size={18} style={{ color: settings.primaryColor }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {quickTools.map((tool) => {
          const Icon = ICONS[tool.icon] || ClipboardCheck;
          const p = PALETTES[tool.palette];
          return (
            <button
              key={tool.id}
              type="button"
              data-testid={`quick-tool-${tool.id}`}
              className={`group flex flex-col items-center justify-center gap-3 py-5 px-3 rounded-2xl ${p.bg} ring-1 ${p.ring} hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}
            >
              <span
                className={`h-12 w-12 rounded-2xl bg-white flex items-center justify-center ${p.fg} group-hover:scale-105 transition-transform`}
              >
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <span className="text-[13px] font-bold text-foreground/85 text-center leading-tight">
                {tool.title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickTools;
