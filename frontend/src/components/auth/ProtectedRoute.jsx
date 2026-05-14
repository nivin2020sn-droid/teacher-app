import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requireRole }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user.role !== requireRole) {
    // Send admins to /admin if they hit a teacher-only page is unwanted;
    // teachers attempting admin routes get redirected to dashboard.
    return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
  }

  return children;
}
