import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import EmployeeLayout from './components/EmployeeLayout'
import EmployeeAttendance from './pages/EmployeeAttendance'
import EmployeeLeaves from './pages/EmployeeLeaves'
import EmployeePayroll from './pages/EmployeePayroll'
import EmployeeProfile from './pages/EmployeeProfile'
import EmployeePerformance from './pages/EmployeePerformance'
import EditProfilePage from './pages/EditProfilePage'
import AdminLayout from './components/AdminLayout'
import AdminEmployees from './pages/AdminEmployees'
import AdminDirectory from './pages/AdminDirectory'
import AdminEmployeeView from './pages/AdminEmployeeView'
import AdminEmployeeEdit from './pages/AdminEmployeeEdit'
import AdminEmployeeSettings from './pages/AdminEmployeeSettings'
import AdminAttendance from './pages/AdminAttendance'
import AdminAttendanceRegularize from './pages/AdminAttendanceRegularize'
import AdminAttendanceLocation from './pages/AdminAttendanceLocation'
import AdminLeaves from './pages/AdminLeaves'
import AdminPayroll from './pages/AdminPayroll'
import AdminFeatureAccess from './pages/AdminFeatureAccess'
import AdminAuditLogs from './pages/AdminAuditLogs'
import AdminAssets from './pages/AdminAssets'
import AdminHolidays from './pages/AdminHolidays'
import AdminHolidaysArchive from './pages/AdminHolidaysArchive'
import AdminSettings from './pages/AdminSettings'
import AdminPerformance from './pages/AdminPerformance'
import NotFound from './pages/NotFound'
import { Toaster } from 'react-hot-toast'
import SnowflakeCursor from './components/CustomCursor'
import OfflineOverlay from './components/OfflineOverlay'
import UpdateOverlay from './components/UpdateOverlay'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes — data is "fresh" for this long
      gcTime: 24 * 60 * 60 * 1000,     // 24 hours — needed for persistent caching across app restarts
      refetchOnWindowFocus: true,       // silently refresh when user returns to tab
      refetchOnReconnect: true,         // silently refresh after network reconnect
      refetchOnMount: 'always',         // silently refresh on every navigation mount
      retry: 1,                         // retry failed requests once
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

/**
 * Route role definitions — must mirror the backend require_role() calls.
 * Role is always sourced from the database via /auth/me; these arrays are
 * UX guards only. The backend is the authoritative enforcement point.
 */
const ADMIN_DASHBOARD_ROLES = ['admin']
const EMPLOYEE_DASHBOARD_ROLES = ['employee', 'hr', 'manager']

function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AuthProvider>
        <UpdateOverlay />
        <OfflineOverlay />
        <SnowflakeCursor />
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={ADMIN_DASHBOARD_ROLES}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="employees" element={<AdminEmployees />} />
              <Route path="directory" element={<AdminDirectory />} />
              <Route path="employees/:id" element={<AdminEmployeeView />} />
              <Route path="employees/:id/edit" element={<AdminEmployeeEdit />} />
              <Route path="employees/:id/settings" element={<AdminEmployeeSettings />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="attendance/regularize" element={<AdminAttendanceRegularize />} />
              <Route path="attendance/location" element={<AdminAttendanceLocation />} />
              <Route path="leaves" element={<AdminLeaves />} />
              <Route path="payroll" element={<AdminPayroll />} />
              <Route path="feature-access" element={<AdminFeatureAccess />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="assets" element={<AdminAssets />} />
              <Route path="holidays" element={<AdminHolidays />} />
              <Route path="holidays/archive" element={<AdminHolidaysArchive />} />
              <Route path="performance" element={<AdminPerformance />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                  <EmployeeLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<EmployeeDashboard />} />
              <Route path="attendance" element={<EmployeeAttendance />} />
              <Route path="leaves" element={<EmployeeLeaves />} />
              <Route path="payroll" element={<EmployeePayroll />} />
              <Route path="performance" element={<EmployeePerformance />} />
              <Route path="profile" element={<EmployeeProfile />} />
              <Route path="profile/edit" element={<EditProfilePage />} />
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}

export default App
