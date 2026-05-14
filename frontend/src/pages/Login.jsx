import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, User, Lock, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const { login, user } = useAuth();
  const { settings } = useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in → redirect immediately
  if (user) {
    const dest = user.role === "admin" ? "/admin" : "/";
    return null || (window.location.replace(dest), null);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // tiny delay so the button shows feedback
    setTimeout(() => {
      const res = login(username, password);
      setLoading(false);
      if (!res.ok) {
        setError(res.error || "حدث خطأ");
        return;
      }
      const from = location.state?.from?.pathname;
      const dest =
        res.role === "admin" ? "/admin" : from && from !== "/login" ? from : "/";
      navigate(dest, { replace: true });
    }, 200);
  };

  return (
    <div
      data-testid="login-page"
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: "hsl(var(--app-bg))" }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="absolute -top-32 -end-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ backgroundColor: settings.primaryColor }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -start-40 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl bg-pink-300"
      />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="h-16 w-16 rounded-3xl flex items-center justify-center text-white soft-shadow-lg"
            style={{ backgroundColor: settings.primaryColor }}
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="logo"
                className="h-16 w-16 rounded-3xl object-cover"
              />
            ) : (
              <GraduationCap size={28} strokeWidth={2.2} />
            )}
          </div>
          <div className="text-center">
            <h1
              className="text-3xl font-extrabold text-foreground"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            >
              {settings.appName}
            </h1>
            <p className="text-sm text-foreground/60 mt-1">
              {settings.appTagline}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-7 sm:p-9 soft-shadow-lg border border-border/50 space-y-5"
        >
          <div className="text-end">
            <h2 className="text-xl font-extrabold text-foreground">
              تسجيل الدخول
            </h2>
            <p className="text-sm text-foreground/60 mt-1">
              أدخلي بياناتك للدخول إلى لوحة التحكم
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-end block font-semibold">
              اسم المستخدم
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 end-3 flex items-center text-foreground/40">
                <User size={18} />
              </span>
              <Input
                id="username"
                data-testid="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                dir="rtl"
                className="text-end pe-10"
                placeholder="اسم المستخدم"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-end block font-semibold">
              كلمة المرور
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 end-3 flex items-center text-foreground/40">
                <Lock size={18} />
              </span>
              <Input
                id="password"
                data-testid="login-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="rtl"
                className="text-end pe-10 ps-10"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                data-testid="login-toggle-password"
                className="absolute inset-y-0 start-3 flex items-center text-foreground/40 hover:text-foreground"
                aria-label={showPw ? "إخفاء" : "إظهار"}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              data-testid="login-error"
              className="text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-end"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            data-testid="login-submit"
            disabled={loading || !username || !password}
            className="w-full h-12 rounded-2xl text-white text-base font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: settings.primaryColor }}
          >
            <LogIn size={18} className="me-2" />
            {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </Button>

          <p className="text-center text-xs text-foreground/55 pt-2">
            تواصلي مع المدير إذا واجهتِ أي مشكلة في الدخول
          </p>
        </form>
      </div>
    </div>
  );
}
