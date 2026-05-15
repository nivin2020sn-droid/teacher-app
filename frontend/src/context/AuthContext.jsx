import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, getToken, setToken, extractError } from "../lib/api";
import {
  storeCredential,
  verifyCredential,
  getCredential,
  refreshCredentialUser,
  deleteCredential,
} from "../lib/offlineAuth";

const LAST_USER_KEY = "mosaytra:lastUsername";
const safeSetLast = (u) => {
  try {
    if (u) localStorage.setItem(LAST_USER_KEY, u);
    else localStorage.removeItem(LAST_USER_KEY);
  } catch {
    /* ignore */
  }
};
const safeGetLast = () => {
  try {
    return localStorage.getItem(LAST_USER_KEY);
  } catch {
    return null;
  }
};

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
        if (!cancelled) {
          setUser(res.data);
          // Keep the cached offline user object fresh so role/permission
          // changes propagate next time the user logs in offline.
          const u = safeGetLast();
          if (u) refreshCredentialUser(u, res.data).catch(() => {});
        }
      })
      .catch(async (err) => {
        if (cancelled) return;
        const code = err?.response?.status;
        if (code === 401 || code === 403) {
          // Account disabled or password rotated server-side. Burn the offline
          // credential too — force a fresh online login.
          const u = safeGetLast();
          if (u) await deleteCredential(u).catch(() => {});
          safeSetLast(null);
          setToken(null);
          setUser(false);
        } else {
          // Network / server down: keep the token, synthesise a minimal user
          // from local storage so the SPA can still render protected pages.
          // If we have a cached credential for the last user, prefer its real
          // user object so the topbar shows the proper name/avatar.
          const u = safeGetLast();
          const cached = u ? await getCredential(u) : null;
          if (cached?.user) {
            setUser({ ...cached.user, _offline: true });
          } else {
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

  // Whenever we are in an "offline session" (either bootstrapped from cache
  // or logged in offline via stored credential), re-verify with the server
  // as soon as we come back online (or any sync drain finishes). This is the
  // mechanism that flips offline → online seamlessly AND enforces admin-side
  // account changes (disabled account / role change / password rotation).
  useEffect(() => {
    if (!(user?._offline || user?._offline_login)) return;
    const tryRefetch = () => {
      if (!navigator.onLine) return;
      api
        .get("/auth/me")
        .then(async (res) => {
          setUser(res.data);
          const u = safeGetLast() || res.data?.username;
          if (u) await refreshCredentialUser(u, res.data).catch(() => {});
        })
        .catch(async (err) => {
          const code = err?.response?.status;
          if (code === 401 || code === 403) {
            const u = safeGetLast();
            if (u) await deleteCredential(u).catch(() => {});
            safeSetLast(null);
            setToken(null);
            setUser(false);
          }
          /* keep offline session on plain network failures */
        });
    };
    const onSync = (e) => {
      if (e.detail?.kind === "synced") tryRefetch();
    };
    window.addEventListener("online", tryRefetch);
    window.addEventListener("mosaytra:sync", onSync);
    tryRefetch();
    return () => {
      window.removeEventListener("online", tryRefetch);
      window.removeEventListener("mosaytra:sync", onSync);
    };
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
      safeSetLast(username);
      // Persist offline credential for future no-internet logins on this
      // device. Best-effort — never blocks login.
      storeCredential({
        username,
        password,
        user: data.user,
        token: data.token,
      }).catch(() => {});
      return { ok: true, role: data.user.role };
    } catch (e) {
      // Online login failed. If it's a network failure (not a 4xx from the
      // server), try the offline credential cache so the teacher can keep
      // working on a flight / spotty connection.
      const isNetworkError = e?.code === "ERR_NETWORK" || !e?.response;
      if (isNetworkError) {
        const rec = await verifyCredential(username, password);
        if (rec) {
          setToken(rec.token);
          setUser({ ...rec.user, _offline_login: true });
          setAdminToken(null);
          safeSetLast(username);
          return { ok: true, role: rec.user.role, offline: true };
        }
        // Differentiate the two "no offline access" cases for a clearer UX.
        const exists = await getCredential(username);
        return {
          ok: false,
          error: exists
            ? "كلمة المرور غير صحيحة."
            : "يجب تسجيل الدخول مرة واحدة عبر الإنترنت قبل استخدام التطبيق بدون اتصال.",
        };
      }
      return { ok: false, error: extractError(e) };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(false);
    setAdminToken(null);
    // Forget which user was last active, but KEEP the offline credential
    // (so the teacher can re-enter password offline tomorrow on this device).
    safeSetLast(null);
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
