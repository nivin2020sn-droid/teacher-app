import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Default settings — everything can be changed from /settings later.
const DEFAULT_SETTINGS = {
  appName: "مسيطره",
  appTagline: "لوحة تحكم المعلمة",
  logo: null, // data-url
  icon: null, // data-url
  primaryColor: "#7c5cff", // violet
  backgroundStyle: "soft-violet", // soft-violet | warm-cream | mint | blush
};

const STORAGE_KEY = "mosaytra.settings.v1";

const AppSettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

// Convert "#7c5cff" → "256 84% 68%"  (Tailwind/Shadcn HSL token format)
function hexToHslTokens(hex) {
  const m = hex.replace("#", "").match(/.{1,2}/g);
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
  // soft variant: same hue, very light
  const [h] = primaryHsl.split(" ");
  root.style.setProperty("--primary-soft", `${h} 100% 95%`);
  root.style.setProperty(
    "--app-bg",
    BG_PRESETS[settings.backgroundStyle] || BG_PRESETS["soft-violet"],
  );
}

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    applyToRoot(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
      resetSettings: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings],
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
