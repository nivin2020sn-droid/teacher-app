import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// NOTE: This is a CLIENT-SIDE MOCK auth. No real security — credentials are
// stored in localStorage and matched in plain text. Will be replaced with a
// real backend + hashing later.

const HIDDEN_ADMIN = {
  username: "bsn.1988",
  password: "12abAB!?",
};

const ADMIN_USER = {
  id: "admin",
  role: "admin",
  username: HIDDEN_ADMIN.username,
  name: "المدير العام",
  subtitle: "إدارة النظام",
  avatar: null,
};

const TEACHERS_KEY = "mosaytra.teachers.v1";
const SESSION_KEY = "mosaytra.session.v1";

const AuthContext = createContext(null);

function readTeachers() {
  try {
    const raw = localStorage.getItem(TEACHERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function writeTeachers(list) {
  localStorage.setItem(TEACHERS_KEY, JSON.stringify(list));
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function genId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession());
  const [teachers, setTeachers] = useState(() => readTeachers());

  useEffect(() => {
    writeTeachers(teachers);
  }, [teachers]);

  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const login = (username, password) => {
    const u = (username || "").trim();
    const p = password || "";

    // Hidden admin — same form as teachers, just matches these creds.
    if (u === HIDDEN_ADMIN.username && p === HIDDEN_ADMIN.password) {
      setUser(ADMIN_USER);
      return { ok: true, role: "admin" };
    }

    const t = teachers.find(
      (x) => x.username.trim() === u && x.password === p,
    );
    if (!t) return { ok: false, error: "بيانات الدخول غير صحيحة" };
    if (!t.active)
      return { ok: false, error: "هذا الحساب معطّل. تواصلي مع المدير." };

    setUser({
      id: t.id,
      role: "teacher",
      username: t.username,
      name: t.name,
      subtitle: t.subtitle || "",
      avatar: t.avatar || null,
    });
    return { ok: true, role: "teacher" };
  };

  const logout = () => setUser(null);

  // Admin → preview teacher dashboard as a virtual teacher user.
  const previewAsTeacher = (teacherId) => {
    if (user?.role !== "admin") return;
    const t = teachers.find((x) => x.id === teacherId);
    if (!t) return;
    setUser({
      id: t.id,
      role: "teacher",
      username: t.username,
      name: t.name,
      subtitle: t.subtitle || "",
      avatar: t.avatar || null,
      _previewBy: "admin",
    });
  };

  const exitPreview = () => {
    if (user?._previewBy === "admin") setUser(ADMIN_USER);
  };

  // Teachers CRUD
  const createTeacher = (data) => {
    if (
      teachers.some(
        (t) => t.username.trim() === (data.username || "").trim(),
      )
    ) {
      return { ok: false, error: "اسم المستخدم مستخدم بالفعل." };
    }
    const t = {
      id: genId(),
      username: (data.username || "").trim(),
      password: data.password || "",
      name: data.name?.trim() || "معلمة جديدة",
      subtitle: data.subtitle?.trim() || "",
      avatar: data.avatar || null,
      active: data.active !== false,
    };
    setTeachers((prev) => [...prev, t]);
    return { ok: true, teacher: t };
  };

  const updateTeacher = (id, patch) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  };

  const toggleTeacher = (id) =>
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t)),
    );

  const resetPassword = (id, newPassword) => {
    if (!newPassword || newPassword.length < 4) {
      return { ok: false, error: "كلمة المرور قصيرة جداً." };
    }
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, password: newPassword } : t)),
    );
    return { ok: true };
  };

  const deleteTeacher = (id) =>
    setTeachers((prev) => prev.filter((t) => t.id !== id));

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === "admin",
      isTeacher: user?.role === "teacher",
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, teachers],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
