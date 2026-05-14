# Integrating `teacher_app` into kvd-backend

`teacher_app/` is fully self-contained. Nothing it does touches code outside
its folder or any database other than the one named `teacher_app`.

## Steps (in kvd-backend repo)

### 1. Copy the folder
Copy the entire `backend/teacher_app/` directory into kvd-backend's source
tree (e.g. next to your existing route packages).

### 2. Install its deps (already present in most FastAPI projects)
```
bcrypt==4.1.3
pyjwt>=2.10.1
motor>=3.3.1
pydantic>=2.6.4
```
Add any of the above that kvd-backend doesn't already pin.

### 3. Set environment variables
In your kvd-backend service env (Render dashboard or `.env`):
```
TEACHER_APP_JWT_SECRET=<64-hex string, generate via: python -c "import secrets;print(secrets.token_hex(32))">
TEACHER_APP_ADMIN_USERNAME=bsn.1988
TEACHER_APP_ADMIN_PASSWORD=12abAB!?
# Optional — defaults to "teacher_app":
# TEACHER_APP_DB_NAME=teacher_app
```
`MONGO_URL` is reused from kvd-backend — we just open a separate **database**
named `teacher_app` on the same Mongo cluster. **No KVD collections are
touched.**

### 4. Mount the router (the only code line you add)
In kvd-backend's main app file:
```python
from teacher_app import create_router as teacher_app_router
from teacher_app.app import on_startup as teacher_app_startup

app.include_router(teacher_app_router(), prefix="/api/teacher")

@app.on_event("startup")
async def _teacher_app_startup():
    await teacher_app_startup()  # creates indexes + seeds admin (idempotent)
```

That's it. After redeploy, all routes are live under `https://kvd-backend.../api/teacher/...`.

## Endpoints exposed (full list)

| Method | Path | Auth |
|---|---|---|
| POST | `/api/teacher/login` | public |
| GET  | `/api/teacher/me` | Bearer |
| POST | `/api/teacher/preview/{teacher_id}` | admin |
| GET/POST | `/api/teacher/teachers` | admin |
| PATCH/DELETE | `/api/teacher/teachers/{id}` | admin |
| POST | `/api/teacher/teachers/{id}/reset-password` | admin |
| GET/POST | `/api/teacher/subjects` | teacher |
| PATCH/DELETE | `/api/teacher/subjects/{id}` | teacher |
| GET/POST | `/api/teacher/students` | teacher |
| PATCH/DELETE | `/api/teacher/students/{id}` | teacher |
| GET | `/api/teacher/guardians` | teacher |
| GET/PUT | `/api/teacher/settings` | get=any auth, put=admin |
| GET | `/api/teacher/health` | public |

## Isolation guarantees
- All collections live inside the `teacher_app` database — different MongoDB
  database from KVD's. No name collisions even if KVD has `teachers` or
  `students` collections.
- JWT issuer claim (`iss`) is `teacher_app`; tokens from other auth systems
  will be rejected with 401.
- No global side effects: routes mount only when you call
  `create_router()`; the startup hook only seeds inside `teacher_app` DB.
