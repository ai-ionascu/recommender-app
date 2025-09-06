import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Guard based on auth token and optional role(s)
export default function ProtectedRoute({ role, roles, children }) {
  const { token, user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return <div className="py-16 text-center">Loading…</div>;
  }

  if (!token) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace state={{ from: loc }} />;
  }

  const required = Array.isArray(roles) ? roles : (role ? [role] : []);
  const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
  if (required.length && !required.some(r => userRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  // Works both as wrapper Route element (Outlet) and direct children
  return children ?? <Outlet />;
}