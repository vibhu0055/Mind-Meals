import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function SchoolRoute() {
  const { isAuthenticated, isSchool } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSchool) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function TeacherRoute() {
  const { isAuthenticated, isTeacher } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isTeacher) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
