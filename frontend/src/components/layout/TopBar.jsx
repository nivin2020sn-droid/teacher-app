import { Bell, Menu } from "lucide-react";
import { useAppSettings } from "../../context/AppSettingsContext";
import { teacher } from "../../data/mockData";

export const TopBar = ({ onMenuClick }) => {
  const { settings } = useAppSettings();

  return (
    <header
      data-testid="app-topbar"
      className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-white/70 backdrop-blur-md border-b border-border/50 sticky top-0 z-30"
    >
      {/* Right side (Brand + mobile menu) */}
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

      {/* Left side (notifications + avatar) */}
      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-3 ps-3 border-s border-border/60">
          <div className="text-end hidden sm:block">
            <div
              data-testid="topbar-teacher-greeting"
              className="text-sm font-bold text-foreground leading-tight"
            >
              {teacher.greeting}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {teacher.subtitle}
            </div>
          </div>
          <img
            data-testid="topbar-avatar"
            src={teacher.avatar}
            alt="avatar"
            className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white soft-shadow"
          />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
