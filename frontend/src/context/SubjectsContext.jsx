import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { extractError } from "../lib/api";
import { offlineGet, offlineMutate } from "../lib/offlineApi";
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
      const res = await offlineGet("/subjects");
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

  useEffect(() => {
    const h = (e) => {
      if (e.detail?.kind === "synced") refresh();
    };
    window.addEventListener("mosaytra:sync", h);
    return () => window.removeEventListener("mosaytra:sync", h);
  }, [refresh]);

  const createSubject = async (data) => {
    try {
      const res = await offlineMutate("POST", "/subjects", data);
      setSubjects((prev) => [...prev, res.data]);
      return { ok: true, subject: res.data, queued: res.queued };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const updateSubject = async (id, patch) => {
    try {
      const res = await offlineMutate("PATCH", `/subjects/${id}`, patch);
      setSubjects((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...res.data } : s)),
      );
      if (patch.is_current === true) await refresh();
      return { ok: true, queued: res.queued };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const deleteSubject = async (id) => {
    try {
      const res = await offlineMutate("DELETE", `/subjects/${id}`);
      await refresh();
      return { ok: true, queued: res.queued };
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
