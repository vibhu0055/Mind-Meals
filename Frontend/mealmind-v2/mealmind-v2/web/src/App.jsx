import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PrincipalLayout from './layouts/PrincipalLayout.jsx'
import TeacherLayout from './layouts/TeacherLayout.jsx'
import ParentLayout from './layouts/ParentLayout.jsx'

// Principal pages
import PrincipalDashboard from './pages/principal/Dashboard.jsx'
import PrincipalStudents from './pages/principal/Students.jsx'
import PrincipalCheckups from './pages/principal/Checkups.jsx'
import PrincipalMeals from './pages/principal/Meals.jsx'
import PrincipalReports from './pages/principal/Reports.jsx'
import PrincipalAlerts from './pages/principal/Alerts.jsx'
import PrincipalSettings from './pages/principal/Settings.jsx'

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard.jsx'

// Parent pages
import ParentDashboard from './pages/parent/Dashboard.jsx'

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const routes = { principal: '/principal/dashboard', teacher: '/teacher/dashboard', parent: '/parent/dashboard', admin: '/principal/dashboard' }
  return <Navigate to={routes[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Principal */}
          <Route path="/principal" element={
            <ProtectedRoute allowedRoles={['principal', 'admin']}>
              <PrincipalLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"        element={<PrincipalDashboard />} />
            <Route path="students"         element={<PrincipalStudents />} />
            <Route path="health-checkups"  element={<PrincipalCheckups />} />
            <Route path="meal-nutrition"   element={<PrincipalMeals />} />
            <Route path="reports"          element={<PrincipalReports />} />
            <Route path="alerts"           element={<PrincipalAlerts />} />
            <Route path="settings"         element={<PrincipalSettings />} />
          </Route>

          {/* Teacher */}
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['teacher', 'principal', 'admin']}>
              <TeacherLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
          </Route>

          {/* Parent */}
          <Route path="/parent" element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ParentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
