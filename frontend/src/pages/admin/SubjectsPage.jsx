import { useRef, useState } from "react";
import {
  BookCopy,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Check,
  X,
  Star,
  ImageOff,
} from "lucide-react";
import { useSubjects } from "../../context/SubjectsContext";
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

const COLOR_PRESETS = [
  "#7c5cff",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#ec4899",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const SubjectForm = ({ value, onChange }) => {
  const fileRef = useRef(null);
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة كبير — اختاري أقل من 2MB");
      return;
    }
    onChange({ background: await fileToDataUrl(f) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-end block">اسم المادة</Label>
        <Input
          data-testid="subject-form-name"
          dir="rtl"
          className="text-end"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="مثال: الفيزياء"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-end block">اللون المميّز</Label>
        <div className="flex flex-wrap gap-2 justify-end">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`subj-color-${c.replace("#", "")}`}
              onClick={() => onChange({ color: c })}
              className={`h-9 w-9 rounded-xl ring-2 transition-transform hover:scale-110 ${
                value.color?.toLowerCase() === c
                  ? "ring-foreground/40 scale-110"
                  : "ring-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
          <label
            className="h-9 w-9 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-secondary"
            title="لون مخصّص"
          >
            <input
              type="color"
              value={value.color || "#7c5cff"}
              onChange={(e) => onChange({ color: e.target.value })}
              className="opacity-0 w-0 h-0"
            />
            <span className="text-xs text-foreground/50">+</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-end block">خلفية المادة (اختياري)</Label>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/40">
          <div className="h-20 w-32 rounded-xl bg-white border border-border overflow-hidden flex items-center justify-center shrink-0">
            {value.background ? (
              <img
                src={value.background}
                alt="bg"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageOff size={20} className="text-foreground/30" />
            )}
          </div>
          <div className="flex-1 text-end space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              data-testid="subject-form-upload-bg"
              className="rounded-xl"
            >
              <Upload size={14} className="me-1" /> رفع خلفية
            </Button>
            {value.background && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange({ background: null })}
                className="rounded-xl me-2 text-rose-600 hover:bg-rose-50"
              >
                إزالة
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <p className="text-xs text-foreground/55">
              تُستخدم في بطاقة المادة الحالية على الداشبورد
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const EMPTY = { name: "", color: "#7c5cff", background: null };

export default function SubjectsPage() {
  const { subjects, createSubject, updateSubject, deleteSubject, setCurrent } =
    useSubjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => {
    setForm(EMPTY);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("اسم المادة مطلوب");
      return;
    }
    const res = await createSubject(form);
    if (!res.ok) {
      toast.error(res.error || "تعذّر إضافة المادة");
      return;
    }
    toast.success("تمت إضافة المادة");
    setCreateOpen(false);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, color: s.color, background: s.background });
  };

  const handleEdit = async () => {
    if (!form.name.trim()) {
      toast.error("اسم المادة مطلوب");
      return;
    }
    const res = await updateSubject(editing.id, form);
    if (!res.ok) {
      toast.error(res.error || "تعذّر تحديث المادة");
      return;
    }
    toast.success("تم تحديث المادة");
    setEditing(null);
  };

  const handleDelete = async () => {
    const res = await deleteSubject(deletingId);
    if (!res.ok) {
      toast.error(res.error || "تعذّر الحذف");
      return;
    }
    toast.success("تم حذف المادة");
    setDeletingId(null);
  };

  return (
    <div data-testid="admin-subjects-page" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={openCreate}
          data-testid="open-create-subject"
          className="rounded-xl text-white"
          style={{ backgroundColor: "#7c5cff" }}
        >
          <Plus size={16} className="me-1" /> إضافة مادة
        </Button>
        <div className="flex items-center gap-3 text-end">
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            >
              إدارة المواد
            </h1>
            <p className="text-sm text-foreground/60">
              {subjects.length} مادة · المادة الحالية تظهر في الداشبورد
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <BookCopy size={22} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <div
            key={s.id}
            data-testid={`subject-card-${s.id}`}
            className="rounded-3xl bg-white soft-shadow border border-border/50 overflow-hidden flex flex-col"
          >
            <div
              className="h-32 relative flex items-center justify-center"
              style={{
                backgroundColor: s.color + "22",
                backgroundImage: s.background ? `url(${s.background})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!s.background && (
                <span
                  className="text-3xl font-extrabold opacity-70"
                  style={{ color: s.color }}
                >
                  {s.name.charAt(0)}
                </span>
              )}
              {s.is_current && (
                <span className="absolute top-2 end-2 px-2 py-1 rounded-full bg-white/90 text-[11px] font-bold flex items-center gap-1 text-amber-600 soft-shadow">
                  <Star size={12} fill="currentColor" /> الحالية
                </span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="h-6 w-6 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <div className="font-extrabold text-foreground text-end">
                  {s.name}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40 mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(s)}
                  data-testid={`edit-subject-${s.id}`}
                  className="rounded-xl"
                >
                  <Pencil size={14} className="me-1" /> تعديل
                </Button>
                {!s.is_current && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCurrent(s.id);
                      toast.success("تم تعيينها كالمادة الحالية");
                    }}
                    data-testid={`set-current-${s.id}`}
                    className="rounded-xl"
                  >
                    <Star size={14} className="me-1" /> اجعليها الحالية
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeletingId(s.id)}
                  data-testid={`delete-subject-${s.id}`}
                  className="rounded-xl text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={14} className="me-1" /> حذف
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader className="text-end">
            <DialogTitle>إضافة مادة جديدة</DialogTitle>
          </DialogHeader>
          <SubjectForm value={form} onChange={(p) => setForm({ ...form, ...p })} />
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleCreate}
              data-testid="create-subject-submit"
              className="text-white rounded-xl"
              style={{ backgroundColor: form.color }}
            >
              <Check size={16} className="me-1" /> إضافة
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

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader className="text-end">
            <DialogTitle>تعديل المادة</DialogTitle>
          </DialogHeader>
          <SubjectForm value={form} onChange={(p) => setForm({ ...form, ...p })} />
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleEdit}
              data-testid="edit-subject-submit"
              className="text-white rounded-xl"
              style={{ backgroundColor: form.color }}
            >
              حفظ
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

      {/* Delete */}
      <Dialog
        open={!!deletingId}
        onOpenChange={(v) => !v && setDeletingId(null)}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-end">
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل تريدين حذف هذه المادة نهائيًا؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleDelete}
              data-testid="confirm-delete-subject"
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
            >
              <Trash2 size={16} className="me-1" /> حذف
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
