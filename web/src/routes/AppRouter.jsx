import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, SchoolRoute, GuestRoute } from './guards';
import AppLayout from '../components/layout/AppLayout';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import TeachersPage from '../pages/TeachersPage';
import ClassesPage from '../pages/ClassesPage';
import StudentsPage from '../pages/StudentsPage';
import StudentDetailPage from '../pages/StudentDetailPage';
import HealthPage from '../pages/HealthPage';
import MealsPage from '../pages/MealsPage';
import MealDetailPage from '../pages/MealDetailPage';
import NutritionPage from '../pages/NutritionPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/meals/:id" element={<MealDetailPage />} />
            <Route path="/nutrition" element={<NutritionPage />} />

            {/* School-only */}
            <Route element={<SchoolRoute />}>
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/classes" element={<ClassesPage />} />
            </Route>

            {/* Teacher-only */}
            <Route path="/health" element={<HealthPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}