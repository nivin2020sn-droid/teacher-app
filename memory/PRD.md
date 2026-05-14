# مسيطره — Teacher Dashboard (UI-only)

## Original Problem Statement
بناء **واجهة رئيسية فقط** (Dashboard UI Only) لتطبيق ويب عربي 100% باسم قابل للتغيير من
الإعدادات لاحقًا. لا قاعدة بيانات، لا backend، لا authentication. يجب أن يكون التصميم مطابقًا
للصورة المرجعية: ألوان باستيل + بنفسجي، بطاقات بحواف دائرية، RTL كامل، خط عربي عصري.
اسم التطبيق المختار: **مسيطره**.

## Architecture
- **Frontend only** (React + TailwindCSS + shadcn/ui + lucide-react + sonner).
- Settings persisted via `localStorage` through `AppSettingsContext`.
- No backend / no MongoDB use in this milestone (server.py left untouched).

## Implemented (Feb 2026)
- RTL global layout, Tajawal + Cairo Arabic fonts.
- Theme system with dynamic primary color + background style applied via CSS variables.
- **Layout**: sticky top bar + right sidebar (desktop) + sheet sidebar (mobile).
- **Dashboard**:
  - Header pill (المادة الحالية) + dated header.
  - Current subject hero card (الرياضيات) with violet gradient, floating math
    decorations, mini calculator illustration, period & time pills.
  - موضوع اليوم card (الجمع مع الاحتفاظ).
  - النقاط المهمة list with checkmarks.
  - أدوات سريعة — 5 pastel quick-tool cards.
  - Left column: 4 stat cards (students, absentees, live countdown timer, next class)
    + today's schedule list (active slot highlighted in violet).
- **Settings page** (`/settings`): change app name + tagline, upload logo, upload icon,
  pick primary color (8 presets + custom), pick background preset (4 options),
  reset to defaults. All changes persist via localStorage and re-render UI live.
- **Placeholder pages** for: الطلاب، الحضور، العلامات، الواجبات، الجدول الأسبوعي، التقارير.
- All interactive elements include `data-testid`.

## User Persona
- Female school teacher needing a calm, beautiful daily dashboard in Arabic.

## Backlog
- **P0**
  - Wire up real data for students / attendance / grades / assignments.
  - Persist settings to backend per-user (after auth).
- **P1**
  - Build out the placeholder pages with full CRUD.
  - Add weekly schedule editor.
  - Reports & charts.
  - Notifications panel + real notifications.
- **P2**
  - Multiple class/grade selector.
  - Export reports to PDF.
  - Dark mode toggle.

## Notes
- All app branding (name, logo, icon, color, background) is dynamic and editable
  from `/settings` and applied globally via the theme provider.
- Mock data lives in `frontend/src/data/mockData.js` and can be replaced with API
  calls later without changing UI components.
