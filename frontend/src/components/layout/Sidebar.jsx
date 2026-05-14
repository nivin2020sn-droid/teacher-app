import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  CalendarCheck,
  Star,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  GraduationCap,
  ShieldCheck,
  BookCopy,
  ArrowLeftRight,
} from "lucide-react";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useAuth } from "../../context/AuthContext";

const TEACHER_NAV = [
  { to: "/", label: "الرئيسية", icon: Home, end: true },
  { to: "/students", label: "الطلاب", icon: Users },
  { to: "/attendance", label: "الحضور", icon: CalendarCheck },
  { to: "/grades", label: "العلامات", icon: Star },
  { to: "/assignments", label: "الواجبات", icon: ClipboardList },
  { to: "/schedule", label: "الجدول الأسبوعي", icon: CalendarDays },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: SettingsIcon },
];

const ADMIN_NAV = [
  { to: "/admin", label: "لوحة المدير", icon: ShieldCheck, end: true },
  { to: "/admin/teachers", label: "إدارة المعلمات", icon: Users },
  { to: "/admin/subjects", label: "إدارة المواد", icon: BookCopy },
  { to: "/settings", label: "إعدادات التطبيق", icon: SettingsIcon },
  { to: "/", label: "معاينة واجهة المعلمة", icon: Home },
];

export const Sidebar = ({ onNavigate }) => {
  const { settings } = useAppSettings();
  const { user, logout, exitPreview } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";
  const isPreviewing = user?._previewBy === "admin";
  const nav = isAdmin ? ADMIN_NAV : TEACHER_NAV;

  const handleLogout = () => {
    logout();
    onNavigate?.();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      data-testid="app-sidebar"
      className="flex flex-col h-full w-[260px] shrink-0 bg-white border-l border-border/60"
    >
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div
            data-testid="brand-logo"
            className="h-11 w-11 rounded-2xl flex items-center justify-center text-white soft-shadow"
            style={{ backgroundColor: settings.primaryColor }}
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="logo"
                className="h-11 w-11 rounded-2xl object-cover"
              />
            ) : (
              <GraduationCap size={22} strokeWidth={2.2} />
            )}
          </div>
          <div className="leading-tight">
            <div
              data-testid="brand-name"
              className="font-extrabold text-[19px] text-foreground"
            >
              {settings.appName}
            </div>
            <div className="text-xs text-muted-foreground">
              {isAdmin ? "وضع المدير" : settings.appTagline}
            </div>
          </div>
        </div>

        {isPreviewing && (
          <button
            type="button"
            onClick={() => {
              exitPreview();
              navigate("/admin");
            }}
            data-testid="exit-preview-btn"
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors"
          >
            <ArrowLeftRight size={14} />
            <span>خروج من المعاينة</span>
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto scrollbar-hide">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
            end={end}
            onClick={onNavigate}
            data-testid={`nav-${label}`}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-all duration-200",
                isActive
                  ? "text-white soft-shadow"
                  : "text-foreground/75 hover:bg-secondary hover:text-foreground",
              ].join(" ")
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: settings.primaryColor } : undefined
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  strokeWidth={2}
                  className={
                    isActive
                      ? "text-white"
                      : "text-foreground/55 group-hover:text-foreground"
                  }
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <button
          type="button"
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-white text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors font-medium"
        >
          <LogOut size={18} />
          <span>تسجيل خروج</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
