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

const SubjectsContext = createContext(null);

export function SubjectsProvider({ children }) {
  const { user, isTeacher } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isTeacher) {
      setSubjects([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/subjects");
      setSubjects(res.data);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    refresh();
  }, [refresh, user]);

  const createSubject = async (data) => {
    try {
      const res = await api.post("/subjects", data);
      setSubjects((prev) => [...prev, res.data]);
      return { ok: true, subject: res.data };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const updateSubject = async (id, patch) => {
    try {
      const res = await api.patch(`/subjects/${id}`, patch);
      setSubjects((prev) =>
        prev.map((s) => (s.id === id ? res.data : s.id === res.data.id ? res.data : s)),
      );
      // If is_current toggled, refresh to clear others
      if (patch.is_current === true) await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const deleteSubject = async (id) => {
    try {
      await api.delete(`/subjects/${id}`);
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const setCurrent = async (id) => updateSubject(id, { is_current: true });

  const currentSubject =
    subjects.find((s) => s.is_current) || subjects[0] || null;

  const value = useMemo(
    () => ({
      subjects,
      currentSubject,
      loading,
      createSubject,
      updateSubject,
      deleteSubject,
      setCurrent,
      refresh,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjects, loading],
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
