import { useRef, useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Upload,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Type,
  Lock,
} from "lucide-react";
import { useAppSettings } from "../context/AppSettingsContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#7c5cff",
  "#6366f1",
  "#22c55e",
  "#0ea5e9",
  "#f97316",
  "#ec4899",
  "#ef4444",
  "#0f172a",
];

const PRESET_BGS = [
  { id: "soft-violet", label: "بنفسجي ناعم", swatch: "#f3eefd" },
  { id: "warm-cream", label: "كريمي دافئ", swatch: "#fbf4e8" },
  { id: "mint", label: "نعناعي", swatch: "#ecf7f0" },
  { id: "blush", label: "وردي خفيف", swatch: "#fbeef3" },
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const { isAdmin } = useAuth();
  const [name, setName] = useState(settings.appName);
  const [tagline, setTagline] = useState(settings.appTagline);
  const logoInputRef = useRef(null);
  const iconInputRef = useRef(null);

  useEffect(() => {
    setName(settings.appName);
    setTagline(settings.appTagline);
  }, [settings.appName, settings.appTagline]);

  // Teacher view — read-only notice
  if (!isAdmin) {
    return (
      <div
        data-testid="settings-page"
        className="max-w-3xl mx-auto mt-6 rounded-3xl bg-white p-8 sm:p-12 soft-shadow border border-border/50 text-center space-y-4"
      >
        <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <Lock size={22} />
        </div>
        <h1
          className="text-2xl font-extrabold text-foreground"
          style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
        >
          إعدادات التطبيق
        </h1>
        <p className="text-foreground/65 leading-relaxed">
          إعدادات التطبيق العامة (الاسم، الشعار، الألوان، الخلفية) يديرها المدير.
          لتعديل بياناتك الشخصية تواصلي مع المدير.
        </p>
      </div>
    );
  }

  const handleSaveName = async () => {
    const res = await updateSettings({
      appName: name.trim() || "مسيطره",
      appTagline: tagline,
    });
    if (!res.ok) return toast.error(res.error || "تعذّر الحفظ");
    toast.success("تم حفظ اسم التطبيق");
  };

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("حجم الشعار كبير — اختاري أقل من 1.5MB");
      return;
    }
    const url = await fileToDataUrl(file);
    const res = await updateSettings({ logo: url });
    if (!res.ok) return toast.error(res.error || "تعذّر الرفع");
    toast.success("تم تحديث الشعار");
  };

  const handleIcon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("حجم الأيقونة كبير — اختاري أقل من 1.5MB");
      return;
    }
    const url = await fileToDataUrl(file);
    const res = await updateSettings({ icon: url });
    if (!res.ok) return toast.error(res.error || "تعذّر الرفع");
    toast.success("تم تحديث الأيقونة");
  };

  return (
    <div data-testid="settings-page" className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
          <SettingsIcon size={22} />
        </div>
        <div className="text-end">
          <h1
            className="text-2xl font-extrabold text-foreground"
            style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
          >
            الإعدادات
          </h1>
          <p className="text-sm text-foreground/60">
            خصّص اسم التطبيق، الشعار، الألوان، والخلفية
          </p>
        </div>
      </div>

      <section className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50 space-y-5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-base font-bold">اسم التطبيق</span>
          <Type size={18} style={{ color: settings.primaryColor }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="appName" className="text-end block">
              الاسم
            </Label>
            <Input
              id="appName"
              data-testid="settings-app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              dir="rtl"
              className="text-end"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appTagline" className="text-end block">
              الوصف الفرعي
            </Label>
            <Input
              id="appTagline"
              data-testid="settings-app-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              dir="rtl"
              className="text-end"
            />
          </div>
        </div>

        <div className="flex justify-start">
          <Button
            data-testid="settings-save-name"
            onClick={handleSaveName}
            style={{ backgroundColor: settings.primaryColor }}
            className="text-white hover:opacity-90 rounded-xl"
          >
            <Check size={16} className="me-1" />
            حفظ
          </Button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50 space-y-5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-base font-bold">الشعار والأيقونة</span>
          <ImageIcon size={18} style={{ color: settings.primaryColor }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-secondary/40">
            <div>
              <Button
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                data-testid="settings-upload-logo"
                className="rounded-xl"
              >
                <Upload size={16} className="me-1" />
                رفع الشعار
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogo}
              />
              <p className="text-xs text-foreground/60 mt-2">
                يُستخدم في الشريط الجانبي
              </p>
            </div>
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold"
              style={{ backgroundColor: settings.primaryColor }}
            >
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt="logo"
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                settings.appName.charAt(0)
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-secondary/40">
            <div>
              <Button
                variant="outline"
                onClick={() => iconInputRef.current?.click()}
                data-testid="settings-upload-icon"
                className="rounded-xl"
              >
                <Upload size={16} className="me-1" />
                رفع الأيقونة
              </Button>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIcon}
              />
              <p className="text-xs text-foreground/60 mt-2">أيقونة التطبيق</p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center">
              {settings.icon ? (
                <img
                  src={settings.icon}
                  alt="icon"
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <ImageIcon size={24} className="text-foreground/40" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50 space-y-5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-base font-bold">اللون الرئيسي</span>
          <Palette size={18} style={{ color: settings.primaryColor }} />
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`color-${c.replace("#", "")}`}
              onClick={async () => {
                const res = await updateSettings({ primaryColor: c });
                if (res.ok) toast.success("تم تغيير اللون");
              }}
              className={`h-11 w-11 rounded-2xl ring-2 transition-transform hover:scale-110 ${
                settings.primaryColor.toLowerCase() === c
                  ? "ring-foreground/40 scale-110"
                  : "ring-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`اللون ${c}`}
            />
          ))}
          <label
            className="h-11 w-11 rounded-2xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-secondary"
            title="لون مخصص"
          >
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) => updateSettings({ primaryColor: e.target.value })}
              className="opacity-0 absolute w-0 h-0"
              data-testid="color-custom-input"
            />
            <Palette size={18} className="text-foreground/50" />
          </label>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50 space-y-5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-base font-bold">الخلفية</span>
          <ImageIcon size={18} style={{ color: settings.primaryColor }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESET_BGS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              data-testid={`bg-${bg.id}`}
              onClick={async () => {
                const res = await updateSettings({ backgroundStyle: bg.id });
                if (res.ok) toast.success("تم تغيير الخلفية");
              }}
              className={`rounded-2xl p-4 border-2 transition-all ${
                settings.backgroundStyle === bg.id
                  ? "border-foreground/40"
                  : "border-transparent hover:border-border"
              }`}
              style={{ backgroundColor: bg.swatch }}
            >
              <div className="h-12 rounded-xl bg-white/60 mb-2" />
              <div className="text-xs font-bold text-foreground/80">
                {bg.label}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-start">
        <Button
          variant="outline"
          data-testid="settings-reset"
          onClick={async () => {
            await resetSettings();
            toast.success("تم استعادة الإعدادات الافتراضية");
          }}
          className="rounded-xl"
        >
          <RotateCcw size={16} className="me-1" />
          استعادة الافتراضي
        </Button>
      </div>
    </div>
  );
}
