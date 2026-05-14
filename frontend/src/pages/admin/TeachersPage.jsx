import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Power,
  KeyRound,
  Upload,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import { toast } from "sonner";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMPTY = {
  name: "",
  username: "",
  password: "",
  subtitle: "",
  avatar: null,
  active: true,
};

const TeacherForm = ({ value, onChange, isEdit }) => {
  const fileRef = useRef(null);
  const [showPw, setShowPw] = useState(false);
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onChange({ avatar: await fileToDataUrl(f) });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/50">
        <img
          src={
            value.avatar ||
            "https://api.dicebear.com/7.x/initials/svg?backgroundColor=ddd6fe&seed=teacher"
          }
          alt=""
          className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white"
        />
        <div className="flex-1 text-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl"
            data-testid="teacher-form-upload"
          >
            <Upload size={14} className="me-1" /> رفع صورة (اختياري)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-end block">اسم المعلمة</Label>
          <Input
            data-testid="teacher-form-name"
            dir="rtl"
            className="text-end"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="مثال: أ. سارة المالكي"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-end block">اسم المستخدم</Label>
          <Input
            data-testid="teacher-form-username"
            dir="ltr"
            className="text-start"
            value={value.username}
            onChange={(e) => onChange({ username: e.target.value })}
            placeholder="sara.alm"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-end block">
            {isEdit ? "كلمة المرور" : "كلمة المرور"}
          </Label>
          <div className="relative">
            <Input
              data-testid="teacher-form-password"
              type={showPw ? "text" : "password"}
              dir="ltr"
              className="text-start pe-10"
              value={value.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder={
                isEdit ? "اتركها فارغة لعدم التغيير" : "كلمة مرور قوية"
              }
              autoComplete="new-password"
              required={!isEdit}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 end-2 flex items-center text-foreground/40 hover:text-foreground"
              aria-label={showPw ? "إخفاء" : "إظهار"}
              tabIndex={-1}
            >
              {showPw ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          {isEdit && (
            <p className="text-[11px] text-foreground/55 text-end">
              لتغيير كلمة المرور اكتبي الجديدة. الحقل لا يعرض كلمة المرور
              الحالية.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-end block">الوصف الفرعي (اختياري)</Label>
          <Input
            data-testid="teacher-form-subtitle"
            dir="rtl"
            className="text-end"
            value={value.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="مثال: معلمة الرياضيات"
          />
        </div>
      </div>
    </div>
  );
};

export default function TeachersPage() {
  const navigate = useNavigate();
  const {
    teachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    toggleTeacher,
    resetPassword,
    previewAsTeacher,
  } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null); // teacher obj or null
  const [resetting, setResetting] = useState(null); // teacher obj
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [newPw, setNewPw] = useState("");

  const openCreate = () => {
    setForm(EMPTY);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password) {
      toast.error("يرجى إدخال الاسم واسم المستخدم وكلمة المرور");
      return;
    }
    const res = await createTeacher(form);
    if (!res.ok) return toast.error(res.error);
    toast.success("تم إنشاء حساب المعلمة");
    setCreateOpen(false);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name,
      username: t.username,
      password: "", // never pre-fill — we don't expose the real password
      subtitle: t.subtitle || "",
      avatar: t.avatar || null,
      active: t.active,
    });
  };

  const handleEdit = async () => {
    if (!form.name || !form.username) {
      toast.error("الاسم واسم المستخدم مطلوبان");
      return;
    }
    const patch = {
      name: form.name,
      username: form.username,
      subtitle: form.subtitle,
      avatar: form.avatar,
    };
    if (form.password && form.password.length > 0) {
      patch.password = form.password;
    }
    const res = await updateTeacher(editing.id, patch);
    if (!res.ok) return toast.error(res.error);
    toast.success(
      form.password
        ? "تم تحديث بيانات المعلمة وكلمة المرور"
        : "تم تحديث بيانات المعلمة",
    );
    setEditing(null);
  };

  const handleResetPassword = async () => {
    const res = await resetPassword(resetting.id, newPw);
    if (!res.ok) return toast.error(res.error);
    toast.success("تم إعادة تعيين كلمة المرور");
    setResetting(null);
    setNewPw("");
  };

  const handleDelete = async () => {
    const res = await deleteTeacher(deletingId);
    if (!res.ok) return toast.error(res.error);
    toast.success("تم حذف الحساب");
    setDeletingId(null);
  };

  return (
    <div data-testid="admin-teachers-page" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={openCreate}
          data-testid="open-create-teacher"
          className="rounded-xl text-white"
          style={{ backgroundColor: "#7c5cff" }}
        >
          <Plus size={16} className="me-1" /> إضافة معلمة
        </Button>
        <div className="flex items-center gap-3 text-end">
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            >
              إدارة المعلمات
            </h1>
            <p className="text-sm text-foreground/60">
              {teachers.length} حساب · {teachers.filter((t) => t.active).length}{" "}
              فعّال
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Teacher list */}
      {teachers.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 soft-shadow border border-border/50 text-center">
          <Users size={36} className="mx-auto text-foreground/30 mb-3" />
          <p className="text-foreground/60">
            لا توجد حسابات معلمات بعد — اضغطي "إضافة معلمة" لإنشاء أول حساب.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teachers.map((t) => (
            <div
              key={t.id}
              data-testid={`teacher-card-${t.id}`}
              className="rounded-3xl bg-white p-5 soft-shadow border border-border/50 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <img
                  src={
                    t.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?backgroundColor=ddd6fe&seed=${encodeURIComponent(t.name)}`
                  }
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white"
                />
                <div className="flex-1 text-end">
                  <div className="font-extrabold text-foreground">{t.name}</div>
                  <div className="text-xs text-foreground/55 mt-0.5" dir="ltr">
                    @{t.username}
                  </div>
                  {t.subtitle && (
                    <div className="text-xs text-foreground/65 mt-1">
                      {t.subtitle}
                    </div>
                  )}
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    t.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {t.active ? "فعّال" : "معطّل"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(t)}
                  data-testid={`edit-teacher-${t.id}`}
                  className="rounded-xl"
                >
                  <Pencil size={14} className="me-1" /> تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleTeacher(t.id)}
                  data-testid={`toggle-teacher-${t.id}`}
                  className="rounded-xl"
                >
                  <Power size={14} className="me-1" />{" "}
                  {t.active ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResetting(t);
                    setNewPw("");
                  }}
                  data-testid={`reset-pw-${t.id}`}
                  className="rounded-xl"
                >
                  <KeyRound size={14} className="me-1" /> كلمة المرور
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const r = await previewAsTeacher(t.id);
                    if (!r.ok) {
                      toast.error(r.error || "تعذّرت المعاينة");
                      return;
                    }
                    navigate("/");
                  }}
                  data-testid={`preview-teacher-${t.id}`}
                  className="rounded-xl"
                >
                  <Eye size={14} className="me-1" /> معاينة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingId(t.id)}
                  data-testid={`delete-teacher-${t.id}`}
                  className="rounded-xl text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={14} className="me-1" /> حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="max-w-xl">
          <DialogHeader className="text-end">
            <DialogTitle>إضافة معلمة جديدة</DialogTitle>
            <DialogDescription>
              املئي البيانات لإنشاء حساب معلمة جديد.
            </DialogDescription>
          </DialogHeader>
          <TeacherForm value={form} onChange={(p) => setForm({ ...form, ...p })} />
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleCreate}
              data-testid="create-teacher-submit"
              className="text-white rounded-xl"
              style={{ backgroundColor: "#7c5cff" }}
            >
              <Check size={16} className="me-1" /> إنشاء الحساب
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl"
            >
              <X size={16} className="me-1" /> إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-xl">
          <DialogHeader className="text-end">
            <DialogTitle>تعديل بيانات المعلمة</DialogTitle>
          </DialogHeader>
          <TeacherForm
            value={form}
            onChange={(p) => setForm({ ...form, ...p })}
            isEdit
          />
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleEdit}
              data-testid="edit-teacher-submit"
              className="text-white rounded-xl"
              style={{ backgroundColor: "#7c5cff" }}
            >
              <Check size={16} className="me-1" /> حفظ
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={!!resetting}
        onOpenChange={(v) => !v && setResetting(null)}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-end">
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
            <DialogDescription>
              {resetting?.name && `للحساب: ${resetting.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-end block">كلمة المرور الجديدة</Label>
            <Input
              data-testid="reset-pw-input"
              type="text"
              dir="ltr"
              className="text-start"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="كلمة مرور جديدة"
            />
          </div>
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleResetPassword}
              data-testid="reset-pw-submit"
              className="text-white rounded-xl"
              style={{ backgroundColor: "#7c5cff" }}
              disabled={!newPw}
            >
              تأكيد
            </Button>
            <Button
              variant="outline"
              onClick={() => setResetting(null)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deletingId}
        onOpenChange={(v) => !v && setDeletingId(null)}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-end">
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنتِ متأكدة من حذف هذا الحساب؟ لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleDelete}
              data-testid="confirm-delete-teacher"
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
            >
              <Trash2 size={16} className="me-1" /> حذف نهائيًا
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              className="rounded-xl"
            >
              تراجع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
