import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Admin pages
import AdminExpensesPage from './pages/admin/ExpensesPage';
import FrontDeskPage from './pages/admin/FrontDeskPage';
import MySalaryPage from './pages/admin/MySalaryPage';
import RentersPage from './pages/admin/RentersPage';
import ReservationsPage from './pages/admin/ReservationsPage';
import AdminBookingsPage from './pages/admin/BookingsPage';
import AdminShiftPage from './pages/admin/ShiftPage';
import AdminRoomsPage from './pages/admin/RoomsPage';
import CheckInsPage from './pages/admin/CheckInsPage';

// Owner/Director/Admin pages
import CompaniesPage from './pages/superadmin/CompaniesPage';
import SettingsPage from './pages/settings/SettingsPage';
import OwnerDashboard from './pages/owner/DashboardPage';
import BranchesPage from './pages/owner/BranchesPage';
import RoomsPage from './pages/owner/RoomsPage';
import StaffPage from './pages/staff/StaffPage';
import DevicesPage from './pages/admin/DevicesPage';
import AttendancePage from './pages/admin/AttendancePage';
import PayrollPage from './pages/owner/PayrollPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }
  return <Layout>{children}</Layout>;
}

function getDefaultRoute(role) {
  if (role === 'superadmin') return '/superadmin/companies';
  if (role === 'owner') return '/owner/dashboard';
  if (role === 'supervisor') return '/supervisor/dashboard';
  if (role === 'director') return '/director/dashboard';
  if (role === 'admin') return '/admin/front-desk';
  return '/login';
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={getDefaultRoute(user.role)} replace />} />

      {/* Super Admin routes */}
      <Route path="/superadmin/companies" element={
        <ProtectedRoute allowedRoles={['superadmin']}>
          <CompaniesPage />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/front-desk" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <FrontDeskPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/renters" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <RentersPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/reservations" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ReservationsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/expenses" element={
        <ProtectedRoute allowedRoles={['admin', 'director', 'owner']}>
          <AdminExpensesPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/salary" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <MySalaryPage />
        </ProtectedRoute>
      } />

      {/* Director routes (reuse same pages with director auth) */}
      <Route path="/director/dashboard" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <OwnerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/director/rooms" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <FrontDeskPage />
        </ProtectedRoute>
      } />
      <Route path="/director/renters" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <RentersPage />
        </ProtectedRoute>
      } />
      <Route path="/director/reservations" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <ReservationsPage />
        </ProtectedRoute>
      } />
      <Route path="/director/bookings" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <AdminBookingsPage />
        </ProtectedRoute>
      } />
      <Route path="/director/expenses" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <AdminExpensesPage />
        </ProtectedRoute>
      } />
      <Route path="/director/shifts" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <AdminShiftPage />
        </ProtectedRoute>
      } />
      <Route path="/director/staff" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <StaffPage />
        </ProtectedRoute>
      } />
      <Route path="/director/payroll" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <PayrollPage />
        </ProtectedRoute>
      } />
      {/* Route removed for director */ }
      <Route path="/director/attendance" element={
        <ProtectedRoute allowedRoles={['director', 'owner']}>
          <AttendancePage />
        </ProtectedRoute>
      } />

      {/* Owner routes */}
      <Route path="/owner/dashboard" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/owner/branches" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <BranchesPage />
        </ProtectedRoute>
      } />
      <Route path="/owner/rooms" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <RoomsPage />
        </ProtectedRoute>
      } />
      <Route path="/owner/staff" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <StaffPage />
        </ProtectedRoute>
      } />
      <Route path="/owner/payroll" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <PayrollPage />
        </ProtectedRoute>
      } />
      <Route path="/owner/devices" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <DevicesPage />
        </ProtectedRoute>
      } />
      <Route path="/owner/attendance" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <AttendancePage />
        </ProtectedRoute>
      } />
      <Route path="/owner/reports" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerDashboard />
        </ProtectedRoute>
      } />

      {/* Supervisor routes */}
      <Route path="/supervisor/dashboard" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <OwnerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/rooms" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <AdminRoomsPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/checkin" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <CheckInsPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/bookings" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <AdminBookingsPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/expenses" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <AdminExpensesPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/shifts" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <AdminShiftPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/staff" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <StaffPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/payroll" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <PayrollPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/branches" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <BranchesPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/devices" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <DevicesPage />
        </ProtectedRoute>
      } />
      <Route path="/supervisor/reports" element={
        <ProtectedRoute allowedRoles={['supervisor', 'owner']}>
          <OwnerDashboard />
        </ProtectedRoute>
      } />

      {/* Superadmin routes */}
      <Route path="/superadmin/companies" element={
        <ProtectedRoute allowedRoles={['superadmin']}>
          <CompaniesPage />
        </ProtectedRoute>
      } />

      {/* Global Settings */}
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['superadmin', 'owner', 'director', 'admin', 'supervisor']}>
          <SettingsPage />
        </ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

import { Users, Building2, Construction } from 'lucide-react';

function StaffPlaceholder() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Users className="text-primary-400" /> Xodimlar
      </h1>
      <div className="card py-16 text-center">
        <Construction className="w-16 h-16 mx-auto text-slate-600 mb-4" />
        <p className="text-slate-400 text-lg">Bu bo'lim tez orada qo'shiladi</p>
        <p className="text-slate-500 text-sm mt-2">Xodimlar maoshi va davomati (Face ID) bo'limi</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f1629',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
