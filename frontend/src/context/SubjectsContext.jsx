import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "mosaytra.subjects.v1";

const DEFAULT_SUBJECTS = [
  {
    id: "subj_math",
    name: "الرياضيات",
    color: "#7c5cff",
    background: null,
    isCurrent: true,
  },
  {
    id: "subj_arabic",
    name: "اللغة العربية",
    color: "#f59e0b",
    background: null,
    isCurrent: false,
  },
  {
    id: "subj_science",
    name: "العلوم",
    color: "#10b981",
    background: null,
    isCurrent: false,
  },
  {
    id: "subj_social",
    name: "الاجتماعيات",
    color: "#0ea5e9",
    background: null,
    isCurrent: false,
  },
  {
    id: "subj_english",
    name: "اللغة الإنجليزية",
    color: "#ec4899",
    background: null,
    isCurrent: false,
  },
];

const SubjectsContext = createContext(null);

function readSubjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length) return list;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SUBJECTS;
}

function genId() {
  return `subj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function SubjectsProvider({ children }) {
  const [subjects, setSubjects] = useState(() => readSubjects());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    } catch {
      /* ignore (likely localStorage quota for big bg images) */
    }
  }, [subjects]);

  const createSubject = (data) => {
    const s = {
      id: genId(),
      name: data.name?.trim() || "مادة جديدة",
      color: data.color || "#7c5cff",
      background: data.background || null,
      isCurrent: false,
    };
    setSubjects((prev) => [...prev, s]);
    return s;
  };

  const updateSubject = (id, patch) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const deleteSubject = (id) => {
    setSubjects((prev) => {
      const next = prev.filter((s) => s.id !== id);
      // ensure at least one current subject remains
      if (!next.some((s) => s.isCurrent) && next.length) {
        next[0] = { ...next[0], isCurrent: true };
      }
      return next;
    });
  };

  const setCurrent = (id) => {
    setSubjects((prev) =>
      prev.map((s) => ({ ...s, isCurrent: s.id === id })),
    );
  };

  const currentSubject =
    subjects.find((s) => s.isCurrent) || subjects[0] || null;

  const value = useMemo(
    () => ({
      subjects,
      currentSubject,
      createSubject,
      updateSubject,
      deleteSubject,
      setCurrent,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjects],
  );

  return (
    <SubjectsContext.Provider value={value}>
      {children}
    </SubjectsContext.Provider>
  );
}

export function useSubjects() {
  return useContext(SubjectsContext);
}
