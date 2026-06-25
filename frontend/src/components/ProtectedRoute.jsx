import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Roles that land on the admin dashboard after login.
 * All others land on the employee dashboard.
 */
const ADMIN_ROLES = ["admin"];

/**
 * Returns the home path for a given role.
 * Used when redirecting an unauthorised user to the page they belong on.
 */
function getRoleHomePath(role) {
  return ADMIN_ROLES.includes(role) ? "/admin" : "/employee";
}

/**
 * ProtectedRoute
 *
 * Security model:
 *  - Frontend route guards are UX-only. The backend enforces authorisation.
 *  - Role is NEVER read from localStorage or the JWT client-side.
 *  - Role is always sourced from `profile`, which was fetched from /auth/me
 *    (which reads users.role from the database).
 *  - If the profile could not be loaded after authentication, access is denied
 *    and the user is redirected to login — we never grant access on ambiguity.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Loading...
      </div>
    );
  }

  // Not authenticated → login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Role-restricted route
  if (allowedRoles) {
    // Profile is still being fetched from the backend — show a spinner so we
    // don't redirect back to login while the request is in-flight.
    if (profileLoading && !profile) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
          Loading...
        </div>
      );
    }

    // Profile fetch completed with no data — deny access and force re-login.
    if (!profile) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Force password change check
    if (
      profile.forcePasswordChange &&
      location.pathname !== "/change-password"
    ) {
      return <Navigate to="/change-password" replace />;
    }

    // Role check: profile.role is always read from the database via /auth/me
    if (!allowedRoles.includes(profile.role)) {
      // Feature access check for employees
      if (profile.role === "employee" && profile.featureAccess) {
        const path = location.pathname;
        const fa = profile.featureAccess;
        let hasAccess = false;

        if (
          (path.startsWith("/admin/attendance") ||
            path.startsWith("/admin/holidays")) &&
          fa.canAttendance
        )
          hasAccess = true;
        else if (path.startsWith("/admin/leaves") && fa.canLeave)
          hasAccess = true;
        else if (path.startsWith("/admin/payroll") && fa.canPayroll)
          hasAccess = true;
        else if (
          (path === "/admin/employees" ||
            path.startsWith("/admin/employees/") ||
            path.startsWith("/admin/directory")) &&
          fa.canEmployees
        )
          hasAccess = true;
        else if (path.startsWith("/admin/recruitment") && fa.canRecruitment)
          hasAccess = true;
        else if (path.startsWith("/admin/assets") && fa.canAssets)
          hasAccess = true;

        if (hasAccess) {
          return children;
        }
      }

      // Redirect to the page this user actually belongs on
      return <Navigate to={getRoleHomePath(profile.role)} replace />;
    }
  }

  return children;
};

export { getRoleHomePath };
