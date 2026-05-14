import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, extractError } from "../lib/api";
import { useAuth } from "./AuthContext";

const DEFAULT_SETTINGS = {
  appName: "مسيطره",
  appTagline: "لوحة تحكم المعلمة",
  logo: null,
  icon: null,
  primaryColor: "#7c5cff",
  backgroundStyle: "soft-violet",
};

export const DEFAULT_TEACHER_AVATAR =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces";

const AppSettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  resetSettings: async () => {},
  loading: false,
});

// hex → "H S% L%"
function hexToHslTokens(hex) {
  const m = (hex || "").replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return "256 84% 68%";
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const BG_PRESETS = {
  "soft-violet": "252 35% 97%",
  "warm-cream": "36 60% 97%",
  mint: "152 40% 96%",
  blush: "340 60% 97%",
};

function applyToRoot(settings) {
  const root = document.documentElement;
  const primaryHsl = hexToHslTokens(settings.primaryColor);
  root.style.setProperty("--primary", primaryHsl);
  root.style.setProperty("--ring", primaryHsl);
  const [h] = primaryHsl.split(" ");
  root.style.setProperty("--primary-soft", `${h} 100% 95%`);
  root.style.setProperty(
    "--app-bg",
    BG_PRESETS[settings.backgroundStyle] || BG_PRESETS["soft-violet"],
  );
}

export function AppSettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      // Fall back to defaults until we have a session.
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/settings");
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    applyToRoot(settings);
  }, [settings]);

  const updateSettings = async (patch) => {
    try {
      const res = await api.put("/settings", patch);
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const resetSettings = async () => updateSettings(DEFAULT_SETTINGS);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, loading, refresh }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, loading],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

export { DEFAULT_SETTINGS };
