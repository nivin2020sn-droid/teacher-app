import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AuthProvider } from "./context/AuthContext";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { SubjectsProvider } from "./context/SubjectsContext";
import { StudentsProvider } from "./context/StudentsContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Placeholder from "./pages/Placeholder";
import StudentsPage from "./pages/StudentsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersPage from "./pages/admin/TeachersPage";
import SubjectsPage from "./pages/admin/SubjectsPage";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <SubjectsProvider>
          <StudentsProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/subjects" element={<SubjectsPage />} />

                  <Route
                    path="/attendance"
                    element={
                      <Placeholder
                        title="الحضور"
                        description="تسجيل حضور وغياب الطلاب يوميًا."
                      />
                    }
                  />
                  <Route
                    path="/grades"
                    element={
                      <Placeholder
                        title="العلامات"
                        description="إدارة درجات الطلاب في الاختبارات والواجبات."
                      />
                    }
                  />
                  <Route
                    path="/assignments"
                    element={
                      <Placeholder
                        title="الواجبات"
                        description="إضافة ومتابعة الواجبات المنزلية."
                      />
                    }
                  />
                  <Route
                    path="/schedule"
                    element={
                      <Placeholder
                        title="الجدول الأسبوعي"
                        description="عرض الجدول الكامل للحصص الأسبوعية."
                      />
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <Placeholder
                        title="التقارير"
                        description="تقارير شاملة عن أداء الطلاب وتقدّمهم."
                      />
                    }
                  />

                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireRole="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/teachers"
                    element={
                      <ProtectedRoute requireRole="admin">
                        <TeachersPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster position="top-center" richColors />
          </StudentsProvider>
        </SubjectsProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );
}

export default App;
