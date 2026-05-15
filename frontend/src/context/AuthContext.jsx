import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, getToken, setToken, extractError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking; false = unauthenticated; object = user
  const [user, setUser] = useState(getToken() ? null : false);
  const [teachers, setTeachers] = useState([]);
  const [adminToken, setAdminToken] = useState(null); // for "exit preview"

  // Bootstrap: if we have a token, fetch /me to validate it.
  // Important for offline-first: a network failure must NOT log the user out;
  // only a real 401/403 from the server should clear the token. Otherwise
  // every offline app-open would kick the teacher to the login screen.
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setUser(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        if (!cancelled) setUser(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        const code = err?.response?.status;
        if (code === 401 || code === 403) {
          setToken(null);
          setUser(false);
        } else {
          // Network / server down: keep the token, synthesise a minimal user
          // from local storage so the SPA can still render protected pages.
          setUser({
            id: "offline",
            username: "offline",
            role: "teacher",
            actor_role: "teacher",
            name: "وضع غير متصل",
            subtitle: "سيتم تحديث بياناتك عند عودة الاتصال",
            avatar: null,
            active: true,
            _offline: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-load teachers list whenever the current user is admin.
  const refreshTeachers = useCallback(async () => {
    try {
      const res = await api.get("/teachers");
      setTeachers(res.data);
    } catch {
      setTeachers([]);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === "admin" && user.actor_role === "admin") {
      refreshTeachers();
    } else {
      setTeachers([]);
    }
  }, [user, refreshTeachers]);

  // If we synthesised an "offline user" because /auth/me failed during boot,
  // re-fetch the real one as soon as the browser comes back online so the
  // top-bar avatar/name update without requiring a manual reload.
  useEffect(() => {
    if (!user?._offline) return;
    const tryRefetch = () => {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {});
    };
    window.addEventListener("online", tryRefetch);
    if (navigator.onLine) tryRefetch();
    return () => window.removeEventListener("online", tryRefetch);
  }, [user]);

  const login = async (username, password) => {
    try {
      const res = await api.post("/auth/login", { username, password });
      const data = res?.data;
      // Defensive: backend must return { token, user: { role, ... } }.
      // If the response is malformed (e.g. wrong REACT_APP_BACKEND_URL routing
      // returned HTML/empty), surface a clear, localized error instead of
      // crashing with "Cannot read properties of undefined".
      if (!data || !data.token || !data.user || !data.user.role) {
        return {
          ok: false,
          error:
            "تعذّر تسجيل الدخول: استجابة غير متوقّعة من الخادم. تأكدي من إعداد REACT_APP_BACKEND_URL.",
        };
      }
      setToken(data.token);
      setUser(data.user);
      setAdminToken(null);
      return { ok: true, role: data.user.role };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(false);
    setAdminToken(null);
  };

  // Admin previewing teacher
  const previewAsTeacher = async (teacherId) => {
    try {
      const currentToken = getToken();
      const res = await api.post(`/auth/preview/${teacherId}`);
      setAdminToken(currentToken);
      setToken(res.data.token);
      setUser(res.data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const exitPreview = async () => {
    if (!adminToken) return;
    setToken(adminToken);
    setAdminToken(null);
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      logout();
    }
  };

  // Teacher CRUD (admin only)
  const createTeacher = async (data) => {
    try {
      await api.post("/teachers", data);
      await refreshTeachers();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const updateTeacher = async (id, patch) => {
    try {
      await api.patch(`/teachers/${id}`, patch);
      await refreshTeachers();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const toggleTeacher = async (id) => {
    const t = teachers.find((x) => x.id === id);
    if (!t) return;
    await updateTeacher(id, { active: !t.active });
  };

  const resetPassword = async (id, newPassword) => {
    try {
      await api.post(`/teachers/${id}/reset-password`, { password: newPassword });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const deleteTeacher = async (id) => {
    try {
      await api.delete(`/teachers/${id}`);
      await refreshTeachers();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAdmin: user && user.role === "admin" && user.actor_role === "admin",
      isTeacher: user && user.role === "teacher",
      isPreviewing: !!adminToken,
      teachers,
      login,
      logout,
      previewAsTeacher,
      exitPreview,
      createTeacher,
      updateTeacher,
      toggleTeacher,
      resetPassword,
      deleteTeacher,
      refreshTeachers,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, teachers, adminToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
