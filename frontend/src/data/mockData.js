// Mock demo data — used to populate the UI. No backend wired up.

export const teacher = {
  name: "أ. سارة المالكي",
  greeting: "مرحباً، المعلمة",
  subtitle: "أهلاً بك في يومك التعليمي",
  avatar:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces",
};

export const todayDate = {
  weekday: "الثلاثاء",
  day: 21,
  month: "مايو",
  year: 2026,
};

export const currentSubject = {
  name: "الرياضيات",
  period: "الحصة الأولى",
  startTime: "08:00",
  endTime: "08:45",
  totalMinutes: 45,
  remainingSeconds: 27 * 60 + 45, // 27:45 remaining
  topic: "الجمع مع الاحتفاظ",
  points: [
    "أتعرّف على مفهوم الجمع مع الاحتفاظ.",
    "أستطيع إجراء عملية الجمع مع الاحتفاظ بشكل صحيح.",
    "أحلّ مسائل تطبيقية على الجمع مع الاحتفاظ.",
    "أتحقّق من صحة النتائج.",
  ],
};

export const nextSubject = {
  name: "اللغة العربية",
  startTime: "09:15",
  endTime: "10:00",
};

export const stats = {
  studentsCount: 30,
  absentCount: 2,
};

export const todaySchedule = [
  {
    id: 1,
    name: "الرياضيات",
    start: "08:00",
    end: "08:45",
    color: "violet",
    active: true,
  },
  {
    id: 2,
    name: "اللغة العربية",
    start: "09:00",
    end: "09:45",
    color: "amber",
  },
  { id: 3, name: "العلوم", start: "10:00", end: "10:45", color: "emerald" },
  {
    id: 4,
    name: "الاجتماعيات",
    start: "11:00",
    end: "11:45",
    color: "sky",
  },
  {
    id: 5,
    name: "اللغة الإنجليزية",
    start: "12:00",
    end: "12:45",
    color: "pink",
  },
];

export const quickTools = [
  {
    id: "attendance",
    title: "تسجيل الغياب",
    icon: "ClipboardCheck",
    palette: "red",
  },
  {
    id: "note",
    title: "ملاحظة سريعة",
    icon: "NotebookPen",
    palette: "green",
  },
  {
    id: "homework",
    title: "إضافة واجب",
    icon: "BookPlus",
    palette: "yellow",
  },
  {
    id: "quiz",
    title: "اختبار سريع",
    icon: "FileText",
    palette: "blue",
  },
  {
    id: "follow",
    title: "طلاب يحتاجون متابعة",
    icon: "UsersRound",
    palette: "violet",
  },
];
