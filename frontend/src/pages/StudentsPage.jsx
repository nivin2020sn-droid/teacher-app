import { useState } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Cake,
  StickyNote,
  Check,
  X,
} from "lucide-react";
import { useStudents } from "../context/StudentsContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { toast } from "sonner";

const EMPTY_PARENT = {
  name: "",
  relation: "",
  phone: "",
  email: "",
  address: "",
};

const EMPTY_STUDENT = {
  name: "",
  birth_date: "",
  address: "",
  notes: "",
  parents: [],
};

const ParentEditor = ({ value, onChange, onRemove, index }) => (
  <div
    className="rounded-2xl bg-secondary/40 p-4 space-y-3 border border-border/50"
    data-testid={`parent-row-${index}`}
  >
    <div className="flex items-center justify-between">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRemove}
        className="rounded-xl text-rose-600 hover:bg-rose-50"
      >
        <Trash2 size={14} className="me-1" /> إزالة
      </Button>
      <div className="text-end font-bold text-foreground/80 text-sm">
        ولي أمر #{index + 1}
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-end block text-xs">اسم ولي الأمر</Label>
        <Input
          dir="rtl"
          className="text-end"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="مثال: سليمان نصر"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-end block text-xs">صلة القرابة</Label>
        <Input
          dir="rtl"
          className="text-end"
          value={value.relation}
          onChange={(e) => onChange({ relation: e.target.value })}
          placeholder="مثال: الأب"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-end block text-xs">رقم الهاتف / الموبايل</Label>
        <Input
          dir="ltr"
          className="text-start"
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+966 5x xxx xxxx"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-end block text-xs">البريد الإلكتروني</Label>
        <Input
          dir="ltr"
          type="email"
          className="text-start"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="email@example.com"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-end block text-xs">العنوان</Label>
        <Input
          dir="rtl"
          className="text-end"
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="المدينة، الحي، الشارع..."
        />
      </div>
    </div>
  </div>
);

const StudentForm = ({ value, onChange }) => {
  const updateParent = (idx, patch) => {
    const parents = value.parents.map((p, i) =>
      i === idx ? { ...p, ...patch } : p,
    );
    onChange({ parents });
  };
  const addParent = () =>
    onChange({ parents: [...value.parents, { ...EMPTY_PARENT }] });
  const removeParent = (idx) =>
    onChange({ parents: value.parents.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-end block">اسم الطالب الكامل</Label>
          <Input
            data-testid="student-form-name"
            dir="rtl"
            className="text-end"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="مثال: أحمد نصر"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-end block">تاريخ الميلاد</Label>
          <Input
            data-testid="student-form-birth"
            type="date"
            dir="ltr"
            value={value.birth_date}
            onChange={(e) => onChange({ birth_date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-end block">العنوان</Label>
          <Input
            data-testid="student-form-address"
            dir="rtl"
            className="text-end"
            value={value.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="المدينة، الحي، الشارع..."
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-end block">ملاحظات (اختياري)</Label>
          <Textarea
            data-testid="student-form-notes"
            dir="rtl"
            className="text-end min-h-[80px]"
            value={value.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="ملاحظات تربوية، صحية، اجتماعية..."
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={addParent}
            data-testid="add-parent"
            className="rounded-xl"
          >
            <UserPlus size={14} className="me-1" /> إضافة ولي أمر
          </Button>
          <div className="text-end font-bold text-foreground/80">
            أولياء الأمور
            <span className="text-xs text-foreground/55 mr-2">
              ({value.parents.length})
            </span>
          </div>
        </div>

        {value.parents.length === 0 ? (
          <div className="rounded-2xl bg-secondary/40 p-6 text-center text-foreground/55 text-sm">
            لم تتم إضافة ولي أمر بعد — اضغطي "إضافة ولي أمر".
          </div>
        ) : (
          <div className="space-y-3">
            {value.parents.map((p, i) => (
              <ParentEditor
                key={i}
                index={i}
                value={p}
                onChange={(patch) => updateParent(i, patch)}
                onRemove={() => removeParent(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function StudentsPage() {
  const { students, createStudent, updateStudent, deleteStudent, loading } =
    useStudents();
  const { isPreviewing } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(EMPTY_STUDENT);

  const openCreate = () => {
    setForm({ ...EMPTY_STUDENT, parents: [] });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("اسم الطالب مطلوب");
      return;
    }
    const res = await createStudent(form);
    if (!res.ok) return toast.error(res.error || "تعذّر الإضافة");
    toast.success("تمت إضافة الطالب");
    setCreateOpen(false);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      birth_date: s.birth_date || "",
      address: s.address || "",
      notes: s.notes || "",
      parents: s.parents || [],
    });
  };

  const handleEdit = async () => {
    if (!form.name.trim()) {
      toast.error("اسم الطالب مطلوب");
      return;
    }
    const res = await updateStudent(editing.id, form);
    if (!res.ok) return toast.error(res.error || "تعذّر التحديث");
    toast.success("تم تحديث الطالب");
    setEditing(null);
  };

  const handleDelete = async () => {
    const res = await deleteStudent(deletingId);
    if (!res.ok) return toast.error(res.error || "تعذّر الحذف");
    toast.success("تم حذف الطالب");
    setDeletingId(null);
  };

  return (
    <div data-testid="students-page" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={openCreate}
          data-testid="open-create-student"
          className="rounded-xl text-white"
          style={{ backgroundColor: "#7c5cff" }}
        >
          <Plus size={16} className="me-1" /> إضافة طالب
        </Button>
        <div className="flex items-center gap-3 text-end">
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            >
              الطلاب
            </h1>
            <p className="text-sm text-foreground/60">
              {students.length} طالب
              {isPreviewing && " — وضع المعاينة"}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-foreground/55 py-12">جارٍ التحميل...</div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 soft-shadow border border-border/50 text-center">
          <Users size={36} className="mx-auto text-foreground/30 mb-3" />
          <p className="text-foreground/60">
            لا يوجد طلاب بعد — اضغطي "إضافة طالب".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((s) => (
            <div
              key={s.id}
              data-testid={`student-card-${s.id}`}
              className="rounded-3xl bg-white p-5 soft-shadow border border-border/50 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center font-extrabold">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 text-end">
                  <div className="font-extrabold text-foreground">{s.name}</div>
                  {s.birth_date && (
                    <div className="text-xs text-foreground/55 mt-0.5 flex items-center justify-end gap-1">
                      <span>{s.birth_date}</span>
                      <Cake size={12} />
                    </div>
                  )}
                  {s.address && (
                    <div className="text-xs text-foreground/55 mt-0.5 flex items-center justify-end gap-1">
                      <span>{s.address}</span>
                      <MapPin size={12} />
                    </div>
                  )}
                </div>
              </div>

              {s.notes && (
                <div className="text-xs text-foreground/65 bg-secondary/40 rounded-xl p-2.5 flex gap-2 text-end">
                  <span className="flex-1">{s.notes}</span>
                  <StickyNote size={14} className="text-foreground/40 shrink-0" />
                </div>
              )}

              {s.parents && s.parents.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-foreground/55 text-end">
                    أولياء الأمور ({s.parents.length})
                  </div>
                  {s.parents.map((p) => (
                    <div
                      key={p.id}
                      className="text-xs bg-violet-50 rounded-xl p-2.5 text-end"
                    >
                      <div className="font-bold text-foreground">
                        {p.name}
                        {p.relation && (
                          <span className="text-foreground/55 font-normal mr-1">
                            — {p.relation}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 mt-1 text-foreground/65">
                        {p.phone && (
                          <span className="flex items-center gap-1">
                            <span dir="ltr">{p.phone}</span>
                            <Phone size={11} />
                          </span>
                        )}
                        {p.email && (
                          <span className="flex items-center gap-1">
                            <span dir="ltr">{p.email}</span>
                            <Mail size={11} />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(s)}
                  data-testid={`edit-student-${s.id}`}
                  className="rounded-xl"
                >
                  <Pencil size={14} className="me-1" /> تعديل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeletingId(s.id)}
                  data-testid={`delete-student-${s.id}`}
                  className="rounded-xl text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={14} className="me-1" /> حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader className="text-end">
            <DialogTitle>إضافة طالب جديد</DialogTitle>
            <DialogDescription>
              املئي بيانات الطالب وأضيفي أولياء الأمور.
            </DialogDescription>
          </DialogHeader>
          <StudentForm value={form} onChange={(p) => setForm({ ...form, ...p })} />
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleCreate}
              data-testid="create-student-submit"
              className="text-white rounded-xl"
              style={{ backgroundColor: "#7c5cff" }}
            >
              <Check size={16} className="me-1" /> حفظ
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

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent
          dir="rtl"
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader className="text-end">
            <DialogTitle>تعديل بيانات الطالب</DialogTitle>
          </DialogHeader>
          <StudentForm value={form} onChange={(p) => setForm({ ...form, ...p })} />
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleEdit}
              data-testid="edit-student-submit"
              className="text-white rounded-xl"
              style={{ backgroundColor: "#7c5cff" }}
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

      <Dialog
        open={!!deletingId}
        onOpenChange={(v) => !v && setDeletingId(null)}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-end">
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              حذف الطالب وكل أولياء أمره. لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse">
            <Button
              onClick={handleDelete}
              data-testid="confirm-delete-student"
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
