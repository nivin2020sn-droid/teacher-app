import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { AuthProvider } from "./context/AuthContext";
import { SubjectsProvider } from "./context/SubjectsContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Placeholder from "./pages/Placeholder";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersPage from "./pages/admin/TeachersPage";
import SubjectsPage from "./pages/admin/SubjectsPage";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <SubjectsProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Authenticated app */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Shared (admin can preview teacher views) */}
                <Route index element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />

                {/* Teacher-only pages (admin can still access for preview) */}
                <Route
                  path="/students"
                  element={
                    <Placeholder
                      title="الطلاب"
                      description="إدارة بيانات الطلاب وملفاتهم الشخصية — سيتم تفعيلها لاحقًا."
                    />
                  }
                />
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

                {/* Admin-only */}
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
                <Route
                  path="/admin/subjects"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <SubjectsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </SubjectsProvider>
      </AuthProvider>
    </AppSettingsProvider>
  );
}

export default App;
