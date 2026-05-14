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
const SEED_FLAG = "mosaytra.seeded.v2";

const AuthContext = createContext(null);

// Demo/test teacher seeded once so login can be exercised end-to-end.
// Will only run if SEED_FLAG is absent (user can delete safely).
const SEED_TEACHERS = [
  {
    id: "seed_nivin",
    username: "nivin",
    password: "123456",
    name: "أ. نيفين",
    subtitle: "حساب تجريبي",
    avatar: null,
    active: true,
  },
];

// Normalize a username for comparisons (case-insensitive, trimmed,
// strips zero-width characters that some mobile keyboards insert).
function normalizeUsername(raw) {
  return (raw || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

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
  const [teachers, setTeachers] = useState(() => {
    let list = readTeachers();
    // One-time seed (skipped if user has explicitly cleared it).
    const seeded = localStorage.getItem(SEED_FLAG) === "1";
    if (!seeded) {
      const existing = new Set(list.map((t) => normalizeUsername(t.username)));
      const toAdd = SEED_TEACHERS.filter(
        (s) => !existing.has(normalizeUsername(s.username)),
      );
      if (toAdd.length) list = [...list, ...toAdd];
      try {
        localStorage.setItem(SEED_FLAG, "1");
      } catch {
        /* ignore */
      }
    }
    return list;
  });

  useEffect(() => {
    writeTeachers(teachers);
  }, [teachers]);

  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const login = (username, password) => {
    const uNorm = normalizeUsername(username);
    const p = password || "";

    // Hidden admin — exact-match username (case-sensitive) like the user spec.
    const uTrim = (username || "").trim();
    if (uTrim === HIDDEN_ADMIN.username && p === HIDDEN_ADMIN.password) {
      setUser(ADMIN_USER);
      return { ok: true, role: "admin" };
    }

    // First find by username (case-insensitive) — this lets us return
    // a more accurate error if the account exists but is inactive or the
    // password is wrong.
    const byName = teachers.find(
      (x) => normalizeUsername(x.username) === uNorm,
    );

    if (!byName) {
      return { ok: false, error: "اسم المستخدم غير موجود" };
    }
    if (!byName.active) {
      return { ok: false, error: "هذا الحساب معطّل. تواصلي مع المدير." };
    }
    if (byName.password !== p) {
      return { ok: false, error: "كلمة المرور غير صحيحة" };
    }

    setUser({
      id: byName.id,
      role: "teacher",
      username: byName.username,
      name: byName.name,
      subtitle: byName.subtitle || "",
      avatar: byName.avatar || null,
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
    const uNorm = normalizeUsername(data.username);
    if (!uNorm) {
      return { ok: false, error: "اسم المستخدم مطلوب." };
    }
    if (!data.password || !data.password.length) {
      return { ok: false, error: "كلمة المرور مطلوبة." };
    }
    if (teachers.some((t) => normalizeUsername(t.username) === uNorm)) {
      return { ok: false, error: "اسم المستخدم مستخدم بالفعل." };
    }
    const t = {
      id: genId(),
      username: (data.username || "").trim(),
      password: data.password,
      name: data.name?.trim() || "معلمة جديدة",
      subtitle: data.subtitle?.trim() || "",
      avatar: data.avatar || null,
      active: data.active !== false,
    };
    setTeachers((prev) => [...prev, t]);
    return { ok: true, teacher: t };
  };

  const updateTeacher = (id, patch) => {
    // Defensive: never overwrite password unless an explicit non-empty
    // string is provided. Prevents accidentally setting "" or a placeholder.
    setTeachers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t };
        if (typeof patch.name === "string") next.name = patch.name.trim();
        if (typeof patch.username === "string")
          next.username = patch.username.trim();
        if (typeof patch.subtitle === "string")
          next.subtitle = patch.subtitle.trim();
        if (typeof patch.avatar !== "undefined") next.avatar = patch.avatar;
        if (typeof patch.active === "boolean") next.active = patch.active;
        if (typeof patch.password === "string" && patch.password.length > 0) {
          next.password = patch.password;
        }
        return next;
      }),
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
