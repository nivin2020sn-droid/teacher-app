import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Placeholder from "./pages/Placeholder";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <AppSettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
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
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AppSettingsProvider>
  );
}

export default App;
