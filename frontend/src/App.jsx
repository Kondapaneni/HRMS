import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import EmployeeLayout from './components/EmployeeLayout'
import EmployeeAttendance from './pages/EmployeeAttendance'
import EmployeeMobileAttendance from './pages/EmployeeMobileAttendance';
import EmployeeHolidays from './pages/EmployeeHolidays';
import EmployeeLeaves from './pages/EmployeeLeaves'
import ApplyMobileLeave from './pages/ApplyMobileLeave'
import EmployeePayroll from './pages/EmployeePayroll'
import EmployeeProfile from './pages/EmployeeProfile'
import EmployeePerformance from './pages/EmployeePerformance'
import EmployeeExpenses from './pages/EmployeeExpenses'
import EditProfile from './pages/EditProfile'
import EmployeeFaceRegistration from './pages/EmployeeFaceRegistration'
import EmployeeMobileMap from './pages/EmployeeMobileMap'
import EmployeeMobileCamera from './pages/EmployeeMobileCamera'

import EmployeeMobileHolidays from './pages/EmployeeMobileHolidays'
import EmployeeMobileBirthdays from './pages/EmployeeMobileBirthdays'
import OriginationLayout from './components/OriginationLayout'
import OriginationDashboard from './pages/OriginationDashboard'
import OriginationLeadsList from './pages/OriginationLeadsList'
import OriginationMobileAddLead from './pages/OriginationMobileAddLead'
import OriginationMobileLeadDetails from './pages/OriginationMobileLeadDetails'
import OriginationMobileMemberDetails from './pages/OriginationMobileMemberDetails'
import OriginationMembersList from './pages/OriginationMembersList'
import OriginationApplicationsList from './pages/OriginationApplicationsList'
import OriginationViewApplication from './pages/OriginationViewApplication'
import BranchOperationsLayout from './components/BranchOperationsLayout'
import AssessmentWorkspaceLayout from './components/AssessmentWorkspaceLayout'
import AssessmentManagement from './pages/AssessmentManagement'
import DepartmentQuestionBank from './pages/DepartmentQuestionBank'
import AssessmentCreate from './pages/AssessmentCreate'
import AssessmentResults from './pages/AssessmentResults'
import AdminLayout from './components/AdminLayout'
import AdminEmployees from './pages/AdminEmployees'
import AdminDirectory from './pages/AdminDirectory'
import AdminEmployeeView from './pages/AdminEmployeeView'
import AdminEmployeeEdit from './pages/AdminEmployeeEdit'
import AdminEmployeeSettings from './pages/AdminEmployeeSettings'
import AdminAttendance from './pages/AdminAttendance'
import AdminAttendanceConfig from './pages/AdminAttendanceConfig'
import AdminAttendanceRegularize from './pages/AdminAttendanceRegularize'
import AdminAttendanceLocation from './pages/AdminAttendanceLocation'
import AdminLeaves from './pages/AdminLeaves'
import AdminPayroll from './pages/AdminPayroll'
import AdminBulkPayroll from './pages/AdminBulkPayroll'
import AdminFeatureAccess from './pages/AdminFeatureAccess'
import AdminAuditLogs from './pages/AdminAuditLogs'
import AdminAssets from './pages/AdminAssets'
import AdminHolidays from './pages/AdminHolidays'
import AdminHolidaysArchive from './pages/AdminHolidaysArchive'
import AdminVerifyDocuments from './pages/AdminVerifyDocuments'
import AdminSettings from './pages/AdminSettings'
import AdminEmailTemplates from './pages/AdminEmailTemplates'
import AdminPerformance from './pages/AdminPerformance'
import AdminExpenses from './pages/AdminExpenses'

import AdminRecruitment from './pages/AdminRecruitment'
import OriginationLoanForms from './pages/OriginationLoanForms'
import EmployeeAssessments from './pages/EmployeeAssessments'
import EmployeeAssessmentInstructions from './pages/EmployeeAssessmentInstructions'
import EmployeeAssessmentEngine from './pages/EmployeeAssessmentEngine'
import EmployeeAssessmentResult from './pages/EmployeeAssessmentResult'
import ComingSoon from './pages/ComingSoon'
import AdminTrainingVideos from './pages/AdminTrainingVideos'
import EmployeeTrainingVideos from './pages/EmployeeTrainingVideos'
import CandidateLogin from './pages/CandidateLogin'
import CandidateActivate from './pages/CandidateActivate'
import CandidateLayout from './components/CandidateLayout'
import CandidateDashboard from './pages/CandidateDashboard'
import CandidateJobs from './pages/CandidateJobs'
import CandidateApplications from './pages/CandidateApplications'
import CandidateProfile from './pages/CandidateProfile'
import CandidateDocuments from './pages/CandidateDocuments'
import NotFound from './pages/NotFound'
import { Toaster } from 'react-hot-toast'
import SnowflakeCursor from './components/CustomCursor'
import Offline from './pages/Offline'
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
const CANDIDATE_DASHBOARD_ROLES = ['candidate']

function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <Router>
        <AuthProvider>
            <UpdateOverlay />
            <Offline />
            <SnowflakeCursor />
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/candidate/login" element={<CandidateLogin />} />
              <Route path="/candidate/activate" element={<CandidateActivate />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route 
                path="/change-password" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'employee', 'hr', 'manager']}>
                    <ChangePassword />
                  </ProtectedRoute>
                } 
              />
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
                <Route path="attendance/config" element={<AdminAttendanceConfig />} />
                <Route path="attendance/regularize" element={<AdminAttendanceRegularize />} />
                <Route path="attendance/location" element={<AdminAttendanceLocation />} />
                <Route path="leaves" element={<AdminLeaves />} />
                <Route path="payroll" element={<AdminPayroll />} />
                <Route path="payroll/bulk" element={<AdminBulkPayroll />} />
                <Route path="feature-access" element={<AdminFeatureAccess />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="assets" element={<AdminAssets />} />
                <Route path="expenses" element={<AdminExpenses />} />
                <Route path="holidays" element={<AdminHolidays />} />
                <Route path="holidays/archive" element={<AdminHolidaysArchive />} />
                <Route path="email-templates" element={<AdminEmailTemplates />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="performance" element={<AdminPerformance />} />
                <Route path="recruitment" element={<AdminRecruitment />} />
                <Route path="recruitment/verify-documents/:id" element={<AdminVerifyDocuments />} />
                <Route path="form" element={<OriginationLoanForms />} />
                <Route path="view-application" element={<OriginationViewApplication />} />
              </Route>

              {/* Acme Assessment Hub Workspace (Admin Only) */}
              <Route
                path="/admin/assessments"
                element={
                  <ProtectedRoute allowedRoles={ADMIN_DASHBOARD_ROLES}>
                    <AssessmentWorkspaceLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="questions" replace />} />
                <Route path="questions" element={<DepartmentQuestionBank />} />
                <Route path="management" element={<AssessmentManagement />} />
                <Route path="rules" element={<Navigate to="management" replace />} />
                <Route path="create" element={<AssessmentCreate />} />
                <Route path="edit/:id" element={<AssessmentCreate />} />
                <Route path="results" element={<AssessmentResults />} />
                <Route path="training" element={<AdminTrainingVideos />} />
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
                <Route path="holidays" element={<EmployeeHolidays />} />
                <Route path="leaves" element={<EmployeeLeaves />} />
                <Route path="leaves/apply" element={<ApplyMobileLeave />} />
                <Route path="expenses" element={<EmployeeExpenses />} />
                <Route path="payroll" element={<EmployeePayroll />} />
                <Route path="performance" element={<EmployeePerformance />} />
                <Route path="assessments" element={<EmployeeAssessments />} />
                <Route path="assessments/instructions" element={<EmployeeAssessmentInstructions />} />
                <Route path="training" element={<EmployeeTrainingVideos />} />
                <Route path="profile" element={<EmployeeProfile />} />
                <Route path="profile/edit" element={<EditProfile />} />
              </Route>

              {/* Fullscreen Exam Routes (no sidebar/header) */}
              <Route
                path="/employee/assessments/session"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <EmployeeAssessmentEngine />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/assessments/result"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <EmployeeAssessmentResult />
                  </ProtectedRoute>
                }
              />

              {/* Acme Loans Workspace (Employee Only) */}
              <Route
                path="/employee/loans"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <OriginationLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="origination" element={<OriginationDashboard />} />
                <Route path="origination/leads" element={<OriginationLeadsList />} />
                <Route path="origination/leads/add" element={<OriginationMobileAddLead />} />
                <Route path="origination/leads/:id/details" element={<OriginationMobileLeadDetails />} />
                <Route path="origination/members" element={<OriginationMembersList />} />
                <Route path="origination/members/:phone/details" element={<OriginationMobileMemberDetails />} />
                <Route path="origination/applications" element={<OriginationApplicationsList />} />
                <Route path="form" element={<OriginationLoanForms />} />
                <Route path="view-application" element={<OriginationViewApplication />} />
              </Route>

              {/* Branch Operations Workspace (Employee Only) */}
              <Route
                path="/employee/branch-operations"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <BranchOperationsLayout />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employee/attendance/map"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <EmployeeMobileMap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/face-registration"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <EmployeeFaceRegistration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/attendance/camera"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <EmployeeMobileCamera />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/mobile/holidays"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <EmployeeMobileHolidays />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/mobile/birthdays"
                element={
                  <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                    <EmployeeMobileBirthdays />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/mobile/applyleave"
                element={<Navigate to="/employee/leaves/apply" replace />}
              />
              {/* Candidate Portal Routes */}
              <Route
                path="/candidate"
                element={
                  <ProtectedRoute allowedRoles={CANDIDATE_DASHBOARD_ROLES}>
                    <CandidateLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<CandidateDashboard />} />
                <Route path="jobs" element={<CandidateJobs />} />
                <Route path="applications" element={<CandidateApplications />} />
                <Route path="documents" element={<CandidateDocuments />} />
                <Route path="profile" element={<CandidateProfile />} />
              </Route>

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
        </AuthProvider>
      </Router>
    </PersistQueryClientProvider>
  )
}

export default App
