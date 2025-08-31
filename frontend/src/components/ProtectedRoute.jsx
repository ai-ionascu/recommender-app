import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ role, roles }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth) return <Navigate to="/login" replace />;

  const { token, user, loading } = auth;

  if (loading) return null;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;

  const required = Array.isArray(roles)
    ? roles
    : (roles ? [roles] : (role ? [role] : []));
    
  const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
  if (required.length && !required.some(r => userRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}