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

const StudentsContext = createContext(null);

export function StudentsProvider({ children }) {
  const { isTeacher, user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isTeacher) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await offlineGet("/students");
      setStudents(res.data);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    refresh();
  }, [refresh, user]);

  // Also refresh whenever a queued mutation finishes syncing.
  useEffect(() => {
    const h = (e) => {
      if (e.detail?.kind === "synced") refresh();
    };
    window.addEventListener("mosaytra:sync", h);
    return () => window.removeEventListener("mosaytra:sync", h);
  }, [refresh]);

  const createStudent = async (data) => {
    try {
      const res = await offlineMutate("POST", "/students", data);
      setStudents((prev) => [...prev, res.data]);
      return { ok: true, queued: res.queued };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const updateStudent = async (id, patch) => {
    try {
      const res = await offlineMutate("PATCH", `/students/${id}`, patch);
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...res.data } : s)),
      );
      return { ok: true, queued: res.queued };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const deleteStudent = async (id) => {
    try {
      const res = await offlineMutate("DELETE", `/students/${id}`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      return { ok: true, queued: res.queued };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const value = useMemo(
    () => ({
      students,
      loading,
      createStudent,
      updateStudent,
      deleteStudent,
      refresh,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, loading],
  );

  return (
    <StudentsContext.Provider value={value}>
      {children}
    </StudentsContext.Provider>
  );
}

export function useStudents() {
  return useContext(StudentsContext);
}
