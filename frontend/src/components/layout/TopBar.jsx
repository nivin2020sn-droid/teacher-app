import { useNavigate } from "react-router-dom";
import { Bell, Menu, LogOut, ShieldCheck } from "lucide-react";
import {
  useAppSettings,
  DEFAULT_TEACHER_AVATAR,
} from "../../context/AppSettingsContext";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";

export const TopBar = ({ onMenuClick }) => {
  const { settings } = useAppSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  // For teachers: prefer their own name/avatar; fall back to settings/defaults.
  const displayName = isAdmin
    ? "المدير العام"
    : user?.name || settings.teacherName?.trim() || "مرحباً، المعلمة";
  const displaySubtitle = isAdmin
    ? "إدارة النظام"
    : user?.subtitle ||
      settings.teacherSubtitle?.trim() ||
      "أهلاً بك في يومك التعليمي";
  const displayAvatar = isAdmin
    ? null
    : user?.avatar || settings.teacherAvatar || DEFAULT_TEACHER_AVATAR;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      data-testid="app-topbar"
      className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-white/70 backdrop-blur-md border-b border-border/50 sticky top-0 z-30"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="sidebar-toggle"
          onClick={onMenuClick}
          className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-muted transition-colors"
          aria-label="فتح القائمة"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: settings.primaryColor }}
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="logo"
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              <span className="font-extrabold text-base">
                {settings.appName.charAt(0)}
              </span>
            )}
          </div>
          <div className="leading-tight hidden sm:block">
            <div
              data-testid="topbar-app-name"
              className="font-extrabold text-foreground text-[17px]"
            >
              {settings.appName}
            </div>
            <div className="text-xs text-muted-foreground">
              {settings.appTagline}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {!isAdmin && (
          <button
            type="button"
            data-testid="notifications-btn"
            className="relative h-10 w-10 rounded-xl bg-secondary hover:bg-muted text-foreground/75 hover:text-foreground flex items-center justify-center transition-colors"
            aria-label="الإشعارات"
          >
            <Bell size={20} />
            <span
              className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full ring-2 ring-white"
              style={{ backgroundColor: settings.primaryColor }}
            />
          </button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          data-testid="topbar-logout"
          className="rounded-xl hidden sm:flex"
        >
          <LogOut size={16} className="me-1" />
          <span>خروج</span>
        </Button>

        <div className="flex items-center gap-3 ps-2 sm:ps-3 border-s border-border/60">
          <div className="text-end hidden sm:block">
            <div
              data-testid="topbar-teacher-greeting"
              className="text-sm font-bold text-foreground leading-tight"
            >
              {displayName}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {displaySubtitle}
            </div>
          </div>
          {isAdmin ? (
            <div
              data-testid="topbar-admin-badge"
              className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center ring-2 ring-white soft-shadow"
            >
              <ShieldCheck size={22} />
            </div>
          ) : (
            <img
              data-testid="topbar-avatar"
              src={displayAvatar}
              alt="avatar"
              className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white soft-shadow"
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
