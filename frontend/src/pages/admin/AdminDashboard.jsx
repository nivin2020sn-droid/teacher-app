import { Link } from "react-router-dom";
import {
  Users,
  Settings as SettingsIcon,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Card = ({ to, icon: Icon, title, hint, color, testId }) => (
  <Link
    to={to}
    data-testid={testId}
    className="group rounded-3xl bg-white p-6 soft-shadow border border-border/50 flex items-center gap-4 hover:-translate-y-1 hover:soft-shadow-lg transition-all duration-200"
  >
    <div
      className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      <Icon size={24} />
    </div>
    <div className="flex-1 text-end">
      <div className="text-lg font-extrabold text-foreground">{title}</div>
      <div className="text-xs text-foreground/60 mt-1">{hint}</div>
    </div>
    <ArrowLeft
      size={18}
      className="text-foreground/30 group-hover:text-foreground transition-colors"
    />
  </Link>
);

export default function AdminDashboard() {
  const { teachers } = useAuth();
  const activeTeachers = teachers.filter((t) => t.active).length;

  return (
    <div data-testid="admin-dashboard-page" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-end gap-3">
        <div className="text-end">
          <h1
            className="text-2xl font-extrabold text-foreground"
            style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
          >
            لوحة المدير
          </h1>
          <p className="text-sm text-foreground/60">
            مرحبًا بك، يمكنك إدارة المعلمات والمواد وإعدادات النظام من هنا.
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
          <ShieldCheck size={22} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-indigo-50 p-5 soft-shadow border border-white/60">
          <div className="text-xs font-bold text-indigo-600">عدد المعلمات</div>
          <div
            data-testid="admin-stat-teachers"
            className="text-3xl font-extrabold text-foreground mt-1"
          >
            {teachers.length}
          </div>
        </div>
        <div className="rounded-3xl bg-emerald-50 p-5 soft-shadow border border-white/60">
          <div className="text-xs font-bold text-emerald-600">حسابات فعّالة</div>
          <div
            data-testid="admin-stat-active"
            className="text-3xl font-extrabold text-foreground mt-1"
          >
            {activeTeachers}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          to="/admin/teachers"
          icon={Users}
          title="إدارة المعلمات"
          hint="إنشاء وتعديل وحذف حسابات المعلمات + إدارة موادهنّ عبر المعاينة"
          color="#7c5cff"
          testId="admin-link-teachers"
        />
        <Card
          to="/settings"
          icon={SettingsIcon}
          title="إعدادات التطبيق العامة"
          hint="اسم التطبيق، الشعار، الألوان، الخلفية"
          color="#0ea5e9"
          testId="admin-link-settings"
        />
      </div>
    </div>
  );
}
