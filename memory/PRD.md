# مسيطره — Teacher Dashboard (Full-Stack)

## Stack
- **Backend:** FastAPI + Motor (async MongoDB) + bcrypt + PyJWT (Bearer tokens)
- **Frontend:** React (CRA + craco) + Tailwind + shadcn/ui + axios
- **DB:** MongoDB (`DB_NAME` env)
- **Auth:** JWT in `Authorization: Bearer …` header, stored client-side in localStorage

## Architecture
- `backend/server.py` mounts auth/teachers/subjects/students/settings routers
- `backend/auth.py` — bcrypt hashing, JWT encode/decode, `get_current_user`,
  `require_admin` (real admin only, not admin-previewing-teacher)
- `backend/db.py` — Mongo connection, index ensure, idempotent admin seeding from `.env`
- Teacher-scoped resources use `teacher_id` from token; admin manages teachers' data
  via `POST /api/auth/preview/{id}` which mints a teacher-scoped token
- Frontend `lib/api.js` injects Bearer header on every request

## Implemented
- Auth: login (admin + teachers), `/auth/me`, preview-as-teacher, logout
- Teachers CRUD (admin): create/edit/toggle-active/reset-password/delete + cascade
- Subjects CRUD (teacher-scoped) with color + base64 background + `is_current` toggle
- Students CRUD (teacher-scoped) with unlimited embedded parents
  (name, relation, phone, email, address)
- App settings (admin write, all read): name, tagline, logo, icon, color, bg style
- SPA fallback (`public/_redirects` + `render.yaml`) so refresh on /admin/* works
- All previous UI design preserved (RTL, pastel violet, hero subject card, etc.)

## Files Added/Changed (latest milestone)
- backend/: `auth.py`, `db.py`, `routes/{auth_routes,teachers,subjects,students,settings}.py`,
  rewrote `server.py`, added `.env.example`
- frontend/: `lib/api.js`, rewrote `context/{AuthContext,SubjectsContext,AppSettingsContext}.jsx`,
  new `context/StudentsContext.jsx`, new `pages/StudentsPage.jsx`, refactored
  `Login.jsx` (async), `TeachersPage.jsx`, `SubjectsPage.jsx`, `Settings.jsx`,
  `Sidebar.jsx`, `TopBar.jsx`, `App.js`

## User Personas
- Admin (school admin): creates/manages teachers, sees system stats, edits app branding
- Teacher: manages her own students/subjects/etc; isolated from other teachers

## Security
- Passwords bcrypt-hashed; never returned in API responses (projection excludes password_hash)
- JWT signed with `JWT_SECRET` (random 64-char hex)
- Server-side role enforcement on every protected endpoint
- Data isolation: teacher-scoped queries always filter by `teacher_id` from token

## Test Credentials
- Admin: `bsn.1988` / `12abAB!?` (seeded automatically from `.env` on startup)

## Backlog
- **P1**: file upload to object storage (instead of base64 in Mongo)
- **P1**: attendance, grades, assignments full CRUD
- **P1**: deploy backend to Render (env vars in `backend/.env.example` ready)
- **P2**: notifications, weekly schedule editor, reports/charts, parent portal
