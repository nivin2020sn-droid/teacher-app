import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { useAppSettings } from "../../context/AppSettingsContext";

const NAV = [
  { to: "/", label: "الرئيسية", icon: Home, end: true },
  { to: "/students", label: "الطلاب", icon: Users },
  { to: "/attendance", label: "الحضور", icon: CalendarCheck },
  { to: "/grades", label: "العلامات", icon: Star },
  { to: "/assignments", label: "الواجبات", icon: ClipboardList },
  { to: "/schedule", label: "الجدول الأسبوعي", icon: CalendarDays },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: SettingsIcon },
];

export const Sidebar = ({ onNavigate }) => {
  const { settings } = useAppSettings();

  return (
    <aside
      data-testid="app-sidebar"
      className="flex flex-col h-full w-[260px] shrink-0 bg-white border-l border-border/60"
    >
      {/* Brand */}
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
              {settings.appTagline}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto scrollbar-hide">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            data-testid={`nav-${to.replace("/", "") || "home"}`}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-all duration-200",
                isActive
                  ? "text-white soft-shadow"
                  : "text-foreground/75 hover:bg-secondary hover:text-foreground",
              ].join(" ")
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: settings.primaryColor }
                : undefined
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

      {/* Logout */}
      <div className="p-4">
        <button
          data-testid="logout-btn"
          type="button"
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
