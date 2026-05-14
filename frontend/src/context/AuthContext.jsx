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
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setUser(false);
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

  const login = async (username, password) => {
    try {
      const res = await api.post("/auth/login", { username, password });
      setToken(res.data.token);
      setUser(res.data.user);
      setAdminToken(null);
      return { ok: true, role: res.data.user.role };
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
