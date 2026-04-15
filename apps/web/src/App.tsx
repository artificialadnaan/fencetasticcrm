import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import AppLayout from '@/components/layout/app-layout';
import ProtectedRoute from '@/components/layout/protected-route';

const LoginPage = lazy(() => import('@/pages/login'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ProjectsPage = lazy(() => import('@/pages/projects'));
const ProjectDetailPage = lazy(() => import('@/pages/project-detail'));
const ProjectGridPage = lazy(() => import('@/pages/project-grid'));
const FinancesPage = lazy(() => import('@/pages/finances'));
const WorkOrderPage = lazy(() => import('@/pages/work-order'));
const CalendarPage = lazy(() => import('@/pages/calendar'));
const CommissionsPage = lazy(() => import('@/pages/commissions'));
const ReportsPage = lazy(() => import('@/pages/reports'));
const SettingsPage = lazy(() => import('@/pages/settings'));

function AppLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1016]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<AppLoadingFallback />}>
              <LoginPage />
            </Suspense>
          )
        }
      />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/grid" element={<ProjectGridPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/work-order" element={<WorkOrderPage />} />
        <Route path="/finances" element={<FinancesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/commissions" element={<CommissionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
