import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'

import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'














































































import CandidateLogin from './pages/CandidateLogin'
import CandidateActivate from './pages/CandidateActivate'






import NotFound from './pages/NotFound'
import { Toaster } from 'react-hot-toast'
import Offline from './pages/Offline'
import UpdateOverlay from './components/UpdateOverlay'
import MaintenanceGate from './components/MaintenanceGate'
import LandscapeOverlay from './components/LandscapeOverlay'
import CapacitorLifecycle from './components/CapacitorLifecycle'
import BackgroundLocationTracker from './components/BackgroundLocationTracker'
import TrackerPermissionGate from './components/TrackerPermissionGate'


const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const EmployeeLayout = lazy(() => import('./components/EmployeeLayout'));
const EmployeeAttendance = lazy(() => import('./pages/EmployeeAttendance'));
const EmployeeMobileAttendance = lazy(() => import('./pages/EmployeeMobileAttendance'));
const EmployeeHolidays = lazy(() => import('./pages/EmployeeHolidays'));
const EmployeeLeaves = lazy(() => import('./pages/EmployeeLeaves'));
const ApplyMobileLeave = lazy(() => import('./pages/ApplyMobileLeave'));
const EmployeePayroll = lazy(() => import('./pages/EmployeePayroll'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const EmployeePerformance = lazy(() => import('./pages/EmployeePerformance'));
const EmployeeExpenses = lazy(() => import('./pages/EmployeeExpenses'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const EmployeeMobileMap = lazy(() => import('./pages/EmployeeMobileMap'));
const EmployeeMobileCamera = lazy(() => import('./pages/EmployeeMobileCamera'));
const EmployeeMobileHolidays = lazy(() => import('./pages/EmployeeMobileHolidays'));
const EmployeeMobileBirthdays = lazy(() => import('./pages/EmployeeMobileBirthdays'));
const OriginationLoansLayout = lazy(() => import('./components/OriginationLoansLayout'));
const OriginationSalesLayout = lazy(() => import('./components/OriginationSalesLayout'));
const OriginationSaleDashboard = lazy(() => import('./pages/OriginationSaleDashboard'));
const OriginationSaleLeadsList = lazy(() => import('./pages/OriginationSaleLeadsList'));
const OriginationMobileSaleAddLead = lazy(() => import('./pages/OriginationMobileSaleAddLead'));
const OriginationMobileSaleLeadDetails = lazy(() => import('./pages/OriginationMobileSaleLeadDetails'));
const OriginationLoanDashboard = lazy(() => import('./pages/OriginationLoanDashboard'));
const OriginationLoanLeadsList = lazy(() => import('./pages/OriginationLoanLeadsList'));
const OriginationMobileLoanAddLead = lazy(() => import('./pages/OriginationMobileLoanAddLead'));
const OriginationMobileLoanLeadDetails = lazy(() => import('./pages/OriginationMobileLoanLeadDetails'));
const OriginationMobileLoanMemberDetails = lazy(() => import('./pages/OriginationMobileLoanMemberDetails'));
const OriginationLoanMembersList = lazy(() => import('./pages/OriginationLoanMembersList'));
const OriginationSaleMembersList = lazy(() => import('./pages/OriginationSaleMembersList'));
const OriginationMobileSaleMemberDetails = lazy(() => import('./pages/OriginationMobileSaleMemberDetails'));
const OriginationSaleForms = lazy(() => import('./pages/OriginationSaleForms'));
const OriginationLoanApplicationsList = lazy(() => import('./pages/OriginationLoanApplicationsList'));
const OriginationLoanForms = lazy(() => import('./pages/OriginationLoanForms'));
const OriginationLoanViewApplication = lazy(() => import('./pages/OriginationLoanViewApplication'));
const OriginationActivities = lazy(() => import('./pages/OriginationActivities'));
const BranchOperationsLayout = lazy(() => import('./components/BranchOperationsLayout'));
const BranchOperationsDashboard = lazy(() => import('./pages/BranchOperationsDashboard'));
const BranchOperationsLeads = lazy(() => import('./pages/BranchOperationsLeads'));
const BranchOperationsLoansApplicationsList = lazy(() => import('./pages/BranchOperationsLoansApplicationsList'));
const BranchOperationsLoansViewApplication = lazy(() => import('./pages/BranchOperationsLoansViewApplication'));
const BranchOperationsLoansEditApplication = lazy(() => import('./pages/BranchOperationsLoansEditApplication'));
const AssessmentManagement = lazy(() => import('./pages/AssessmentManagement'));
const DepartmentQuestionBank = lazy(() => import('./pages/DepartmentQuestionBank'));
const AssessmentCreate = lazy(() => import('./pages/AssessmentCreate'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminEmployees = lazy(() => import('./pages/AdminEmployees'));
const AdminDirectory = lazy(() => import('./pages/AdminDirectory'));
const AdminEmployeeView = lazy(() => import('./pages/AdminEmployeeView'));
const AdminEmployeeEdit = lazy(() => import('./pages/AdminEmployeeEdit'));
const AdminEmployeeSettings = lazy(() => import('./pages/AdminEmployeeSettings'));
const AdminAttendance = lazy(() => import('./pages/AdminAttendance'));
const AdminAttendanceConfig = lazy(() => import('./pages/AdminAttendanceConfig'));
const AdminAttendanceRegularize = lazy(() => import('./pages/AdminAttendanceRegularize'));
const AdminAttendanceLocation = lazy(() => import('./pages/AdminAttendanceLocation'));
const AdminLeaves = lazy(() => import('./pages/AdminLeaves'));
const AdminPayroll = lazy(() => import('./pages/AdminPayroll'));
const AdminBulkPayroll = lazy(() => import('./pages/AdminBulkPayroll'));
const AdminFeatureAccess = lazy(() => import('./pages/AdminFeatureAccess'));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs'));
const AdminAssets = lazy(() => import('./pages/AdminAssets'));
const AdminHolidays = lazy(() => import('./pages/AdminHolidays'));
const AdminHolidaysArchive = lazy(() => import('./pages/AdminHolidaysArchive'));
const AdminVerifyDocuments = lazy(() => import('./pages/AdminVerifyDocuments'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminEmailTemplates = lazy(() => import('./pages/AdminEmailTemplates'));
const AdminPerformance = lazy(() => import('./pages/AdminPerformance'));
const AdminExpenses = lazy(() => import('./pages/AdminExpenses'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminRecruitment = lazy(() => import('./pages/AdminRecruitment'));
const EmployeeAssessments = lazy(() => import('./pages/EmployeeAssessments'));
const EmployeeAssessmentInstructions = lazy(() => import('./pages/EmployeeAssessmentInstructions'));
const EmployeeAssessmentEngine = lazy(() => import('./pages/EmployeeAssessmentEngine'));
const EmployeeAssessmentResult = lazy(() => import('./pages/EmployeeAssessmentResult'));
const ComingSoon = lazy(() => import('./pages/ComingSoon'));
const AdminTrainingVideos = lazy(() => import('./pages/AdminTrainingVideos'));
const EmployeeTrainingVideos = lazy(() => import('./pages/EmployeeTrainingVideos'));
const CandidateLayout = lazy(() => import('./components/CandidateLayout'));
const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard'));
const CandidateJobs = lazy(() => import('./pages/CandidateJobs'));
const CandidateApplications = lazy(() => import('./pages/CandidateApplications'));
const CandidateProfile = lazy(() => import('./pages/CandidateProfile'));
const CandidateDocuments = lazy(() => import('./pages/CandidateDocuments'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,           // Private data is fresh for one minute in this tab only
      gcTime: 5 * 60 * 1000,          // Garbage collect inactive private queries after 5 minutes
      refetchOnWindowFocus: true,       // silently refresh when user returns to tab
      refetchOnReconnect: true,         // silently refresh after network reconnect
      refetchOnMount: true,             // fetch on mount only when cache is stale
      retry: 1,                         // retry failed requests once
    },
  },
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
    <QueryClientProvider client={queryClient}>
      <Router>
        <CapacitorLifecycle />
        <AuthProvider>
          <ThemeProvider>
            <MaintenanceGate>
            <BackgroundLocationTracker />
            <TrackerPermissionGate />
            <UpdateOverlay />
            <LandscapeOverlay />
            <Offline />
            <Toaster
            position="top-right"
            containerStyle={{ zIndex: 9999999 }}
            toastOptions={{
              className: 'bg-[var(--surface)] text-[var(--text)] border border-[var(--line)] shadow-[var(--shadow-modal)] rounded-[14px] text-[13px] font-medium',
              duration: 4000,
              success: {
                iconTheme: {
                  primary: '#1F9D55',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#D64550',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
          <Suspense fallback={<div role="status" className="flex min-h-[30vh] items-center justify-center text-sm text-[var(--muted)]">Opening workspace...</div>}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
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
                <ProtectedRoute allowedRoles={[...ADMIN_DASHBOARD_ROLES, ...EMPLOYEE_DASHBOARD_ROLES]}>
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
              <Route path="reports" element={<AdminReports />} />
              <Route path="holidays" element={<AdminHolidays />} />
              <Route path="holidays/archive" element={<AdminHolidaysArchive />} />
              <Route path="email-templates" element={<AdminEmailTemplates />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="performance" element={<AdminPerformance />} />
              <Route path="recruitment" element={<AdminRecruitment />} />
              <Route path="recruitment/verify-documents/:id" element={<AdminVerifyDocuments />} />

              {/* Assessment Hub Routes */}
              <Route path="assessments" element={<Navigate to="/admin/assessments/questions" replace />} />
              <Route path="assessments/questions" element={<DepartmentQuestionBank />} />
              <Route path="assessments/management" element={<AssessmentManagement />} />
              <Route path="assessments/rules" element={<Navigate to="/admin/assessments/management" replace />} />
              <Route path="assessments/create" element={<AssessmentCreate />} />
              <Route path="assessments/edit/:id" element={<AssessmentCreate />} />
              <Route path="assessments/results" element={<AssessmentResults />} />
              <Route path="assessments/training" element={<AdminTrainingVideos />} />
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
              <Route path="birthdays" element={<EmployeeMobileBirthdays />} />
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

            {/* Origination Loans Workspace (Employee Only) */}
            <Route
              path="/employee/loans"
              element={
                <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                  <OriginationLoansLayout />
                </ProtectedRoute>
              }
            >
              <Route path="origination" element={<OriginationLoanDashboard />} />
              <Route path="origination/leads" element={<OriginationLoanLeadsList />} />
              <Route path="origination/leads/add" element={<OriginationMobileLoanAddLead />} />
              <Route path="origination/leads/details" element={<OriginationMobileLoanLeadDetails />} />
              <Route path="origination/members" element={<OriginationLoanMembersList />} />
              <Route path="origination/members/details" element={<OriginationMobileLoanMemberDetails />} />
              <Route path="origination/applications" element={<OriginationLoanApplicationsList />} />
              <Route path="origination/activities" element={<OriginationActivities />} />
              <Route path="form" element={<OriginationLoanForms />} />
              <Route path="view-application" element={<OriginationLoanViewApplication />} />
            </Route>

            {/* Origination Sales Workspace (Employee Only) */}
            <Route
              path="/employee/sales"
              element={
                <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                  <OriginationSalesLayout />
                </ProtectedRoute>
              }
            >
              <Route path="origination" element={<OriginationSaleDashboard />} />
              <Route path="origination/leads" element={<OriginationSaleLeadsList />} />
              <Route path="origination/leads/add" element={<OriginationMobileSaleAddLead />} />
              <Route path="origination/leads/details" element={<OriginationMobileSaleLeadDetails />} />
              <Route path="origination/members" element={<OriginationSaleMembersList />} />
              <Route path="origination/members/details" element={<OriginationMobileSaleMemberDetails />} />
              <Route path="origination/activities" element={<OriginationActivities />} />
              <Route path="form" element={<OriginationSaleForms />} />
            </Route>

            {/* Branch Operations Workspace (Employee Only) */}
            <Route
              path="/employee/branch-operations"
              element={
                <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                  <BranchOperationsLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<BranchOperationsDashboard />} />
              <Route path="dashboard" element={<BranchOperationsDashboard />} />
              <Route path="leads" element={<BranchOperationsLeads />} />
              <Route path="activities" element={<OriginationActivities />} />
              <Route path="loans-applications" element={<BranchOperationsLoansApplicationsList />} />
              <Route path="loans-view-applications" element={<BranchOperationsLoansViewApplication />} />
              <Route path="loans-edit-application" element={<BranchOperationsLoansEditApplication />} />
            </Route>

            <Route
              path="/employee/attendance/map"
              element={
                <ProtectedRoute allowedRoles={EMPLOYEE_DASHBOARD_ROLES}>
                  <EmployeeMobileMap />
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
              element={<Navigate to="/employee/holidays" replace />}
            />
            <Route
              path="/employee/mobile/birthdays"
              element={<Navigate to="/employee/birthdays" replace />}
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
              <Route path="profile" element={<CandidateProfile />} />
            </Route>

            {/* Dedicated Full Page Candidate Documents Route */}
            <Route
              path="/candidate/documents"
              element={
                <ProtectedRoute allowedRoles={CANDIDATE_DASHBOARD_ROLES}>
                  <CandidateDocuments />
                </ProtectedRoute>
              }
            />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
            </MaintenanceGate>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
