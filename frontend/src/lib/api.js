// Shared axios client. Reads REACT_APP_BACKEND_URL at build time, adds the
// /api prefix, and attaches the Bearer token on every request.
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API_BASE = `${BACKEND_URL}/api`;

if (!BACKEND_URL && typeof window !== "undefined") {
  // Visible diagnostic — without this var, the SPA falls back to relative
  // /api/* calls that on Render's Static Site hit the SPA rewrite and return
  // index.html, which then breaks JSON parsing on the client side.
  // eslint-disable-next-line no-console
  console.warn(
    "[mosaytra] REACT_APP_BACKEND_URL is not set. Set it in your hosting provider's environment variables (e.g. Render → Static Site → Environment) and redeploy.",
  );
}

const TOKEN_KEY = "mosaytra.token.v1";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Centralised error → friendly message.
export function extractError(err) {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  if (d && typeof d.msg === "string") return d.msg;
  return err?.message || "حدث خطأ غير متوقع";
}
