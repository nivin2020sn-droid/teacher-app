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
      const res = await api.get("/students");
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

  const createStudent = async (data) => {
    try {
      const res = await api.post("/students", data);
      setStudents((prev) => [...prev, res.data]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const updateStudent = async (id, patch) => {
    try {
      const res = await api.patch(`/students/${id}`, patch);
      setStudents((prev) => prev.map((s) => (s.id === id ? res.data : s)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractError(e) };
    }
  };

  const deleteStudent = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      return { ok: true };
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
