import {
  Plus,
  Minus,
  Divide,
  Equal,
  X as Times,
  Ruler,
} from "lucide-react";
import { useAppSettings } from "../../context/AppSettingsContext";
import { currentSubject } from "../../data/mockData";

const FloatingMath = () => {
  // Decorations on the END side (visually LEFT in RTL) — same side as the calculator
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 end-0 w-1/2 hidden sm:block"
    >
      <div className="absolute top-6 end-10 text-foreground/30 text-3xl font-extrabold rotate-[-8deg]">
        2 + 2 = 4
      </div>
      <div className="absolute top-24 end-44 text-foreground/20 text-2xl font-bold rotate-[6deg]">
        7
      </div>
      <div className="absolute bottom-10 end-6 text-foreground/25 text-4xl font-extrabold rotate-[-4deg]">
        5
      </div>

      <div className="absolute top-6 end-2 h-10 w-10 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center text-violet-500 soft-shadow rotate-6">
        <Plus size={20} strokeWidth={2.5} />
      </div>
      <div className="absolute bottom-16 end-44 h-12 w-12 rounded-2xl bg-amber-200 flex items-center justify-center text-amber-700 soft-shadow -rotate-6">
        <Minus size={22} strokeWidth={2.5} />
      </div>
      <div className="absolute top-1/2 end-24 -translate-y-1/2 h-11 w-11 rounded-2xl bg-emerald-200 flex items-center justify-center text-emerald-700 soft-shadow rotate-3">
        <Divide size={20} strokeWidth={2.5} />
      </div>
      <div className="absolute bottom-6 end-1/2 h-11 w-11 rounded-2xl bg-pink-200 flex items-center justify-center text-pink-700 soft-shadow -rotate-12">
        <Equal size={20} strokeWidth={2.5} />
      </div>
      <div className="absolute top-1/3 end-2 h-9 w-9 rounded-xl bg-sky-200 flex items-center justify-center text-sky-700 soft-shadow rotate-12">
        <Times size={18} strokeWidth={2.5} />
      </div>
    </div>
  );
};

const CalcIllustration = () => (
  <div
    aria-hidden
    className="absolute -bottom-6 -end-6 w-44 h-44 hidden md:flex items-center justify-center"
  >
    <div className="relative h-40 w-32 rounded-3xl bg-white/95 soft-shadow-lg rotate-12 p-3 flex flex-col gap-2">
      <div
        className="h-9 rounded-xl"
        style={{ backgroundColor: "hsl(var(--primary) / 0.15)" }}
      />
      <div className="grid grid-cols-3 gap-1.5 flex-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg bg-secondary/80 flex items-center justify-center text-foreground/70 text-xs font-bold"
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CurrentSubjectCard = () => {
  const { settings } = useAppSettings();

  return (
    <section
      data-testid="current-subject-card"
      className="relative overflow-hidden rounded-[28px] subject-hero-bg soft-shadow-lg min-h-[300px] border border-white"
    >
      {/* Ruler badge (top-start = top-right in RTL, near the title) */}
      <div className="absolute top-6 start-6 h-10 px-3 rounded-2xl bg-white/70 backdrop-blur-md hidden md:flex items-center gap-2 text-foreground/70 soft-shadow">
        <Ruler size={16} />
        <span className="text-xs font-bold">قياس</span>
      </div>

      <FloatingMath />
      <CalcIllustration />

      {/* Content (anchored to the start side = right in RTL) */}
      <div className="relative z-10 p-8 sm:p-12 flex flex-col items-end text-end gap-5 min-h-[300px] justify-center">
        <h2
          data-testid="current-subject-name"
          className="font-extrabold leading-none"
          style={{
            color: settings.primaryColor,
            fontSize: "clamp(2.75rem, 6vw, 5rem)",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}
        >
          {currentSubject.name}
        </h2>

        <div className="flex flex-col items-end gap-2 mt-2">
          <span
            className="px-6 py-2.5 rounded-full text-white font-bold text-sm soft-shadow"
            style={{ backgroundColor: settings.primaryColor }}
            data-testid="subject-period-pill"
          >
            {currentSubject.period}
          </span>
          <span className="px-4 py-1.5 rounded-full bg-white/85 backdrop-blur text-foreground/75 font-semibold text-xs border border-white tabular-nums">
            {currentSubject.startTime} - {currentSubject.endTime}
          </span>
        </div>
      </div>
    </section>
  );
};

export default CurrentSubjectCard;
