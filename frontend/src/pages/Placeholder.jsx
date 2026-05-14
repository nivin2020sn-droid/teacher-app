import { Construction } from "lucide-react";

export default function Placeholder({ title, description }) {
  return (
    <div
      data-testid="placeholder-page"
      className="max-w-3xl mx-auto mt-10 rounded-3xl bg-white p-10 sm:p-14 soft-shadow border border-border/50 text-center"
    >
      <div className="mx-auto h-16 w-16 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mb-6">
        <Construction size={28} />
      </div>
      <h1
        data-testid="placeholder-title"
        className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3"
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        {title}
      </h1>
      <p className="text-foreground/65 leading-relaxed">
        {description ||
          "هذه الصفحة قيد التطوير. سيتم تفعيل الوظائف الكاملة قريبًا — حاليًا نركّز على واجهة الرئيسية فقط."}
      </p>
    </div>
  );
}
