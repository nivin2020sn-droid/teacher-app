import { useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  Upload,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Type,
} from "lucide-react";
import { useAppSettings } from "../context/AppSettingsContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#7c5cff", // violet (default)
  "#6366f1", // indigo
  "#22c55e", // green
  "#0ea5e9", // sky
  "#f97316", // orange
  "#ec4899", // pink
  "#ef4444", // red
  "#0f172a", // slate
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
  const [name, setName] = useState(settings.appName);
  const [tagline, setTagline] = useState(settings.appTagline);
  const logoInputRef = useRef(null);
  const iconInputRef = useRef(null);

  const handleSaveName = () => {
    updateSettings({ appName: name.trim() || "مسيطره", appTagline: tagline });
    toast.success("تم حفظ اسم التطبيق");
  };

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    updateSettings({ logo: url });
    toast.success("تم تحديث الشعار");
  };

  const handleIcon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    updateSettings({ icon: url });
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

      {/* App name */}
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

      {/* Logo & Icon */}
      <section className="rounded-3xl bg-white p-6 sm:p-8 soft-shadow border border-border/50 space-y-5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-base font-bold">الشعار والأيقونة</span>
          <ImageIcon size={18} style={{ color: settings.primaryColor }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Logo */}
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

          {/* Icon */}
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

      {/* Primary color */}
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
              onClick={() => {
                updateSettings({ primaryColor: c });
                toast.success("تم تغيير اللون");
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
              onChange={(e) =>
                updateSettings({ primaryColor: e.target.value })
              }
              className="opacity-0 absolute w-0 h-0"
              data-testid="color-custom-input"
            />
            <Palette size={18} className="text-foreground/50" />
          </label>
        </div>
      </section>

      {/* Background */}
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
              onClick={() => {
                updateSettings({ backgroundStyle: bg.id });
                toast.success("تم تغيير الخلفية");
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

      {/* Reset */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          data-testid="settings-reset"
          onClick={() => {
            resetSettings();
            setName("مسيطره");
            setTagline("لوحة تحكم المعلمة");
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
