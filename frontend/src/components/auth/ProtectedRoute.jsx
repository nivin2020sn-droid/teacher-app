import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requireRole }) {
  const { user } = useAuth();
  const location = useLocation();

  // Loading initial /auth/me check
  if (user === null) {
    return (
      <div
        data-testid="auth-loading"
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "hsl(var(--app-bg))" }}
      >
        <div className="text-foreground/50 text-sm">جارٍ التحقق...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole === "admin") {
    // Admin or admin-previewing-teacher MAY access admin pages — but a
    // teacher previewing themselves is just `teacher`, no admin access.
    const isAdminActor =
      user.role === "admin" || user.actor_role === "admin";
    if (!isAdminActor) {
      return <Navigate to="/" replace />;
    }
    // Block admin-previewing-teacher from admin-only routes (they need to
    // exit preview first).
    if (user.role === "teacher" && user.actor_role === "admin") {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
