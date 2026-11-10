# Acme HRMS — Full Application Working Process Documentation

**Document Type:** Enterprise Technical Documentation  
**Scope:** Complete End-to-End System — All Portals, Modules, and Services  
**Version:1.0  
**Date:03 August 2026  
**Audience:** Software Developers, Solution Architects, QA Engineers, Business Analysts, HR Operations Teams

---

## Table of Contents

1. Introduction  
2. Complete System Overview  
3. Authentication and Access Control System  
4. Application Startup and Initialization Flow  
5. User Role-Based System Behavior  
6. Core Module Documentation  
7. Page-Level System Behavior  
8. API System Behavior  
9. Database Interaction Logic  
10. End-to-End User Journeys  
11. Business Logic Across System  
12. Error Handling Across Application  
13. Security Model  
14. File and Module Responsibility Mapping  
15. Component Interaction System  
16. Complete System Execution Flow  
17. Final Summary of System Architecture  

---

## 1. Introduction

### Purpose of the Application

Acme HRMS is a comprehensive Human Resource Management System designed for enterprise organizations. It digitizes, automates, and centralizes the full spectrum of HR operations — from employee onboarding and daily attendance tracking to payroll processing, recruitment management, performance evaluation, and organizational communication. The system serves as the single operational source of truth for all people-related processes within a company.

### Business Domain

The system operates within the Human Resources Management domain. It is built to support organizations of varying sizes that require structured management of employees, job candidates, payroll cycles, compliance workflows, and internal communications. The application supports multi-branch organizations and accommodates complex organizational hierarchies including managers, HR professionals, and administrative staff.

### Overall System Architecture

Acme HRMS is a decoupled, three-tier web application. The presentation layer is a single-page application built in React, delivered to browsers and mobile devices. The application logic layer is a RESTful API server built in PHP using the Slim framework. The data layer is a PostgreSQL relational database hosted remotely, with external file storage managed through Supabase Storage. The system communicates exclusively through JSON over HTTP. The frontend and backend are deployed together under a single domain, with the frontend routing through a reverse proxy to the backend API.

The architecture includes asynchronous background processing for email delivery through a database-backed email queue, a separate automated cron process for attendance maintenance, and a PostgreSQL extension (pgvector) for biometric face recognition comparisons.

### User Roles in the System

The system defines five distinct user roles, each with specific access boundaries enforced both at the database level and throughout the API layer:

- **Admin** — Has full access to all administrative functions. Manages all employees, configurations, modules, and global settings.
- **Employee** — A regular staff member. Accesses personal HR functions such as attendance, leaves, payroll, performance reviews, assessments, and training.
- **HR Manager (hr)** — Treated operationally like an employee for portal access, but may be granted elevated feature permissions by an admin.
- **Manager** — A team leader role. Uses the employee portal and may have access to their team's information depending on feature access grants.
- **Candidate** — A job applicant who has registered or been invited into the system. Has access exclusively to the recruitment and candidate portal.

### Core Modules of the Application

The application is organized into the following major functional modules: Authentication System, Employee Management, Attendance Management, Leave Management, Payroll Processing, Performance Management, Expense Management, Recruitment and Candidate Pipeline, Assessment Hub, Training Videos, Chat and Messaging, Asset Management, Holiday Management, Audit Logs, Feature Access Control, System Settings, and Loan Origination.

### Authentication and Authorization Approach

The system uses token-based authentication via JSON Web Tokens (JWT). Upon successful login, the server issues a signed JWT that the client stores in the browser's local storage. This token is attached to every subsequent API request in the Authorization header. The backend validates the token on each request using a symmetric secret key. Role and feature-based access is enforced at the API gateway level before any business logic is executed. The database is configured with session variables per request for use by audit triggers.

### Technology Stack

The frontend is built with React using Vite as the build tool. It uses React Router for client-side routing, TanStack Query (React Query) for server state management and caching, and Axios for HTTP communication. The application supports Progressive Web App features including offline mode and service worker-based caching.

The backend is built with PHP using the Slim Framework version 4. It uses PDO for database interaction with prepared statements throughout. JWT encoding and decoding is handled by the Firebase JWT library. Environment configuration is managed via the vlucas/phpdotenv library.

The database is PostgreSQL, extended with the pgvector extension to support vector similarity searches for biometric face authentication. File storage for avatars, documents, and training video assets is managed through Supabase Storage. Email delivery uses an edge function hosted on Supabase.

The application is containerized using Docker and deployed on Render's cloud infrastructure as defined in the render.yaml configuration.

### High-Level Folder Structure

The workspace is divided into two primary codebases. The `backend` directory contains the PHP API server with its entry point in `public/index.php`. All route definitions are organized as individual PHP files in the `public` directory, one per functional module. Supporting infrastructure including middleware, configuration, utilities, validators, and email templates are organized under `backend/src`. The `frontend` directory contains the React application with its source code in `frontend/src`, organized into pages, components, contexts, hooks, services, utilities, and API integration layers. A `supabase` directory contains the edge function responsible for outbound email processing and a migrations folder for database schema evolution.

---

## 2. Complete System Overview

### How the System Starts

From a user's perspective, the system starts when they navigate to the application's URL in a browser. The browser receives the React application bundle, which initializes the SPA runtime. The application checks for an existing authentication token in local storage. If no token is present and the current path is a public route, the system renders the login page immediately. If a token exists, the system enters an initialization sequence, fetching the user's current profile from the backend before rendering any protected content. A splash screen with a minimum display duration of 1.2 seconds is shown during this initialization phase to ensure a consistent loading experience.

On the server side, the PHP backend is always running as a web server process. Each incoming HTTP request triggers the Slim framework's routing logic, which dispatches the request through the middleware stack before reaching the appropriate route handler.

### How Users Access the System

There are three distinct access points depending on user type. Regular employees and administrators navigate to the root URL and use the standard login page. Candidates navigate to a dedicated candidate login path. Upon successful authentication at either entry point, users are issued a JWT and redirected to their role-appropriate dashboard.

The system also supports a password recovery flow accessible without authentication. Users can request a password reset link via email, which delivers a time-sensitive token to their registered address. Following the link allows them to set a new password.

### How Different Roles Interact with the System

Administrators interact through the Admin Panel, accessible at the `/admin` path. They have access to a comprehensive set of management tools spanning all organizational functions. The admin interface presents a consistent left-panel navigation structure with a main content area.

Employees, HR managers, and team managers interact through the Employee Portal at the `/employee` path. The interface is optimized for self-service HR functions. Navigation adapts based on which features an administrator has enabled for the individual user.

Candidates interact through the Candidate Portal at the `/candidate` path. Their experience is focused entirely on job applications, document submissions, and tracking their recruitment pipeline status.

### How Data Flows Across Modules

Data originates in one module and flows into others through shared database tables and API calls. For example, approved leave records automatically influence attendance status calculations and payroll deductions. Attendance records are the primary input for performance metric calculations. Payroll generation pulls salary, attendance, and leave data to compute net earnings. The recruitment module transitions candidates into employees upon hiring, creating entries across multiple tables.

### How Frontend and Backend Communicate

The frontend communicates with the backend exclusively through REST API calls using the Axios HTTP client. All API calls are directed to the `/api` base path. The Axios instance is configured with a request interceptor that automatically injects the stored JWT token into the `Authorization` header of every outgoing request. A response interceptor handles authentication failures by removing stale tokens, handles account deactivation by redirecting to the login page, and normalizes PostgreSQL timestamp formats to ISO 8601 UTC format for consistent JavaScript date handling.

### How Services Interact Internally

Within the backend, route handlers directly instantiate the `Database` class singleton to obtain a database connection. Business logic is embedded within route handlers and shared helper functions. For email delivery, route handlers insert records into a database-backed email queue table rather than sending emails synchronously. A Supabase edge function processes this queue asynchronously. Cron-based background jobs handle time-sensitive cleanup operations such as flagging attendance records with missing checkouts.

### How State is Managed Across the Application

The frontend manages two categories of state. Authentication and user profile state is managed through the `AuthContext`, a React context provider that makes user identity and profile data available throughout the component tree. Server data state — such as employee lists, attendance records, payroll data — is managed by TanStack Query. TanStack Query maintains an in-memory cache of API responses with a 5-minute freshness window, automatically re-fetching data when a user returns to a tab or reconnects to the network. The cache is also persisted to local storage so that data is available immediately on the next application load before fresh data arrives from the server, giving a 24-hour offline persistence window.

### How Sessions Are Maintained

Sessions are maintained through the JWT token stored in local storage. The token contains an expiration time that is determined by the `session_timeout` value configured in global settings. Administrators can set this to a specific number of minutes or to "never expire." The backend validates the token's expiration on every request. When a token expires, the next API call returns a 401 status, which the frontend handles by removing the token from local storage and clearing the user state, effectively logging the user out.

---

## 3. Authentication and Access Control System

### Login Process for All User Types

**Standard Employee and Admin Login:** The user navigates to the root path, enters their email address and password, and submits the login form. The frontend sends these credentials to the `POST /api/login` endpoint. The backend first checks whether the IP address has exceeded the configured rate limit for login attempts, which defaults to 5 attempts within a 15-minute window (configurable in global settings). If not rate-limited, the backend queries the users table for a record matching the provided email, verifies the password against the stored bcrypt hash, and checks that the account is active. If all checks pass, the backend fetches the user's feature access permissions from the `user_feature_access` table, constructs a JWT payload containing the user's ID, email, role, and face registration status, signs the token with the configured secret, and returns the token along with the user record. The frontend stores the token in local storage and fetches the full profile via `/api/me`.

**Face Recognition Login:** Users who have registered their biometric data can log in using face recognition. The user provides their email address, and the system captures their facial descriptor using the browser's camera and a face detection model. The 128-dimensional face descriptor vector is sent to the `POST /api/login/face` endpoint. The backend retrieves the stored face descriptor from the `user_biometrics` table and uses PostgreSQL's pgvector extension to compute the Euclidean distance between the submitted descriptor and the stored one. If the distance is 0.5 or less — a strict threshold aligned with the face-api.js standard — the authentication is considered successful, and the login flow proceeds identically to password login.

**Candidate Login:** Candidates use a separate login endpoint at `/api/candidate/login`. The authentication mechanism is identical to standard login but operates against the candidate role and redirects to the candidate portal upon success.

### Registration Process

The candidate portal supports self-service registration. A candidate submits their first name, last name, email address, and a password that must meet the system's password policy (minimum length and complexity rules enforced by the `PasswordValidator` utility). The backend checks for duplicate email addresses, creates the user record with an inactive status, generates a cryptographically random activation token, and queues a confirmation email containing an activation link. The account remains inactive until the candidate clicks the activation link, which triggers the `/api/candidate/activate` endpoint to mark the account as active. Employee accounts cannot be self-registered; they are created exclusively by administrators.

### Session Creation and Management

Upon successful authentication, the backend creates a JWT payload stamped with the current time, the configured expiration time, and the user's identity claims. This token is returned to the frontend, which stores it in local storage. There is no server-side session state — the token itself is the entire session artifact. The `AuthContext` in the frontend holds the live profile in memory, fetched after each login and rehydrated on page load.

### Token-Based Authentication

The system uses stateless JWT authentication using the HS256 algorithm. The token encodes the user's ID, email, role, and whether they have a registered face biometric. Tokens are validated on every protected API endpoint. The backend re-reads the user's active status from the database on each request to ensure that a deactivated account cannot continue using a valid token.

### Role-Based Access Control

Access to API endpoints is controlled through the `AuthMiddleware` class. Each route is registered with an explicit list of allowed roles. When a request arrives, the middleware extracts and validates the JWT, checks the decoded role against the route's required roles, and either proceeds or returns a 403 Forbidden response. Some endpoints additionally support feature-based access for employees, allowing access even if the user's role is not in the primary allowed list, provided they have been granted the specific feature permission in the `user_feature_access` table.

### Permission Handling Across Modules

Beyond role-based access, each employee user can be individually granted or revoked access to specific modules by an administrator. The available feature flags are: Attendance, Leave, Payroll, Employees directory, Recruitment, Assets, Chat, Loan Origination, Admin Assessments, Employee Assessments, and Employee Training Videos. These flags are stored in the `user_feature_access` table and are fetched at login time to be included in the JWT payload. The frontend uses these flags to conditionally display navigation items and links. The backend enforces them independently as a secondary access check in the middleware.

### Route Protection Logic

On the frontend, all paths under `/admin`, `/employee`, and `/candidate` are wrapped in a `ProtectedRoute` component. This component reads the profile from `AuthContext`. If the profile is not loaded yet, it renders a loading state. If the user is not authenticated, it redirects to the login page. If the user is authenticated but does not have a role in the allowed roles list for that route, it redirects to the appropriate dashboard for their role, or to the login page if no valid redirect exists.

### Logout Process

The logout action is triggered by the user interacting with a sign-out control in the application layout. The frontend calls `POST /api/logout`, which the backend acknowledges. Regardless of the server response, the frontend removes the token from local storage, clears the profile state in `AuthContext`, and clears all cached server data in the TanStack Query cache. The user is then redirected to the login page.

### Session Expiration Handling

When the JWT token expires, the next API call returns a 401 Unauthorized response. The Axios response interceptor passes this error back to the calling code without logging it as an unexpected error, since it represents an expected authentication state. The `AuthContext` catches this 401 during the profile fetch at initialization and clears the stored token, redirecting the user to the login page.

### Security Enforcement Across the System

Every time the middleware validates a token, it also performs a live database check to confirm the user's account is still active. This prevents a user whose account was deactivated by an admin from continuing to use an unexpired token. The check runs on every single authenticated request, providing real-time enforcement of account deactivation.

When processing protected requests, the middleware also sets PostgreSQL session-level configuration variables (`app.current_user_id`, `app.current_user_email`, `app.current_user_role`, `app.ip_address`, `app.user_agent`, `app.session_id`) so that database-level audit triggers can record who performed each operation.

---

## 4. Application Startup and Initialization Flow

### Entry Point of the Application

The backend entry point is `backend/public/index.php`. This file bootstraps the Slim application, loads environment variables from the `.env` file using phpdotenv, sets the server timezone to IST (Asia/Kolkata) to match the database, registers all middleware, and then requires each module-specific route file to register all API endpoints. The file is structured so that the main authentication routes are defined inline, and all other routes are loaded via `require` statements for each module.

The frontend entry point is `frontend/src/main.jsx`, which mounts the root `App` component into the DOM. The `App` component wraps the entire application in the `PersistQueryClientProvider` for server state management, the `Router` for client-side navigation, and the `AuthProvider` for authentication context.

### Initial Loading Sequence

When the React application first loads in the browser, the `App` component renders. The `AuthProvider` runs its initialization logic, which checks whether the current path is a public route and whether a JWT token exists in local storage. If it is a public page with no token, initialization completes immediately and the appropriate public page is shown. If a token exists, the provider fetches the user's profile from `/api/me`, enforcing a minimum display duration for the splash screen of 1.2 seconds. This ensures the splash screen does not flash briefly before disappearing, which would create a poor user experience.

### Configuration Loading

Backend configuration is loaded entirely from environment variables through the phpdotenv library. Key configuration values include database connection parameters, the JWT secret key, the chat encryption key, the Google Geocoding API key, the frontend URL for CORS enforcement, and integration credentials.

Frontend configuration uses environment variables injected at build time by Vite. At runtime, API base URLs and public configuration keys are available through the Vite environment mechanism.

### Global State Setup

On the backend, there is no persistent global state between requests, as PHP processes requests statelessly. The `Database` class uses a static singleton pattern so that within a single request, only one database connection is created regardless of how many route handlers are involved.

On the frontend, the global state is established during React's initialization phase. The `AuthProvider` creates the authentication context state. The TanStack Query client is configured with default cache policies and connected to the local storage persister, which loads any previously cached query results into memory immediately on startup.

### Authentication Check on Startup

The `AuthProvider` performs an authentication check during every application initialization. If a token is found in local storage, it calls `GET /api/me` to validate the token and retrieve the current user profile. This ensures that even if the token has expired or the user's account was deactivated since the last session, the frontend will detect this immediately and clear the session.

### Redirection Logic Based on User State

After the authentication check, the frontend determines where to route the user. If the user is not authenticated and tries to access a protected route, they are redirected to the login page. If the user is authenticated, the `ProtectedRoute` component checks whether their role is in the allowed roles list for the requested route. If not, they are redirected to the root path. After a successful login, the backend returns the user's role, and the frontend redirects to `/admin` for the admin role or `/employee` for employee, hr, and manager roles, or `/candidate/dashboard` for the candidate role.

---

## 5. User Role-Based System Behavior

### Admin Users

Admin users access the system through the Admin Panel at `/admin`. Upon login, they land on the Admin Dashboard, which presents a real-time overview of organizational health including total active employee count, today's attendance figures, monthly attendance trends, salary distribution analysis, department-wise headcount, recent leave requests, and upcoming birthdays. This dashboard data is fetched from a dedicated stats endpoint and cached for a short period to reduce database load.

Administrators can navigate to any module through the persistent left-sidebar navigation. They have full create, read, update, and delete capabilities across all entities. Administrators can see all employee data, all attendance records, all leave requests, all payslips, all expenses, all assets, and all recruitment activity. They can configure system-wide settings, control which features individual users can access, and view a complete audit log of every action performed in the system.

The admin role also controls the recruitment lifecycle from end to end: creating job postings, reviewing applications, moving candidates through the pipeline stages, scheduling interviews, verifying documents, generating offer letters, and onboarding successful candidates as employees.

### Employees

Employees access the system through the Employee Portal at `/employee`. Their experience is self-service focused. They can check in and out of work, view their attendance history, request leaves, check leave balances, download their payslips, submit expense claims, view assigned training videos, take assigned assessments, and communicate with colleagues through the chat system.

The employee portal navigation is dynamically controlled. Navigation items are only shown if the administrator has granted the employee access to that feature. An employee without the payroll feature enabled will not see the payroll section in their navigation.

Employees have access only to their own data. Their attendance records, payroll records, leave history, and expense submissions are all scoped to their user ID. They cannot view other employees' data.

Employees can also view their organizational context through the profile page, which shows their reporting manager, peers within the same team, and any direct reports they have. They can edit personal details such as contact information, emergency contacts, and biographical data, but cannot modify employment-related fields like department, salary, or position.

### HR Managers and Managers

HR managers and team managers use the same Employee Portal as regular employees. Their access to specific features depends entirely on the feature permissions an administrator has granted to their user account. A manager with the `canAttendance` flag enabled can view the employee attendance directory. A manager with `canEmployees` enabled can access the employee directory. Their data scope and restrictions are otherwise identical to regular employees — they see their own data by default, and can access additional modules only where feature access has been explicitly granted.

### Candidates

Candidates access the system through the Candidate Portal at `/candidate`. Their experience is entirely focused on the job application process. They can browse open job listings, submit applications, upload their resume and profile details, and track the status of their applications. The system notifies candidates through email at key pipeline milestones such as shortlisting, interview scheduling, offer issuance, or rejection.

Candidates must verify their email address before gaining access to the portal. Until activation, their account is created but inactive. Once activated, they can log in and access the full candidate portal.

Candidates have no access to the admin or employee portals. If a candidate is successfully hired and converted to an employee by an administrator, their account role is updated and they gain access to the employee portal on their next login.

---

## 6. Core Module Documentation

---

### 6.1 Authentication Module

**Purpose:** Manages all aspects of user identity verification, session establishment, and credential management for the entire system.

**Entry Points:** The login page at the root URL, the candidate login page, the forgot password page, the reset password page, and the change password page.

**User Journey:** A user arrives at the login screen and enters their credentials. The system validates the input, checks rate limits, verifies identity, and either returns an error or issues a session token. Upon success, the user is redirected to their role-appropriate interface.

**Features:** Password-based authentication, face biometric authentication, password reset via email link, enforced password change on first login, rate-limited login attempts with IP-level lockout, session timeout configuration, and account activation for candidates.

**Business Logic:** The system enforces a configurable number of maximum login attempts per IP address within a configurable time window. Exceeding this limit returns a lockout response including the number of seconds remaining until the lockout expires. Administrators configure these limits through the global settings interface. Passwords must meet minimum complexity requirements validated by the `PasswordValidator` utility. The `forcePasswordChange` flag on a user record triggers an immediate redirect to the change password page after login, preventing access to any other part of the system until the password is updated.

**Data Flow:** Login credentials flow from the browser to the login API endpoint. The backend queries the users table, validates credentials, queries the feature access table, constructs a JWT payload, and returns the token. Subsequent requests carry this token in the Authorization header.

**Backend Communication:** `POST /api/login`, `POST /api/login/face`, `POST /api/logout`, `PUT /api/change-password`, `POST /api/forgot-password`, `POST /api/reset-password`, `POST /api/candidate/register`, `POST /api/candidate/activate`.

**Database Interaction:** Reads from the `users` table for credential validation. Reads from `user_biometrics` for face descriptor comparison using pgvector. Reads from `user_feature_access` for permission flags. Inserts into `rate_limits` to track failed attempts. Reads from `global_settings` for rate limit and session timeout configuration. Inserts into `email_queue` for password reset and activation emails. Updates `users.password` on password change. Updates `users.reset_token` and `users.isActive` on activation.

**Error Handling:** Invalid credentials return 401. Deactivated accounts return 403. Rate limit exceeded returns 429 with a countdown. Validation failures return 400 with descriptive messages.

**Output Behavior:** Successful login returns a JWT token and the user record. Subsequent profile fetches via `/api/me` return the full profile with feature access flags and news headlines.

---

### 6.2 Employee Management Module

**Purpose:** Provides administrators with complete lifecycle management of the employee workforce, from creation and onboarding through profile management to status changes.

**Entry Points:** Admin Panel navigation items for Employees, Employee Directory, and individual employee detail and edit pages.

**User Journey:** An administrator navigates to the Employees section and views the full employee roster with search capabilities. They can create a new employee, view an individual employee's comprehensive profile, edit employment details, manage employee-specific settings, or view the employee directory as a non-editing reference.

**Features:** Full employee CRUD operations, searchable employee roster, individual profile pages with leave balance, recent payslips, and assigned assets, employee settings management, branch-aware employee listings, organizational hierarchy via manager assignments, and a separate read-only directory view.

**Business Logic:** When a new employee is created, the system creates both a user record in the `users` table (for authentication) and an employee record in the `employee` table (for HR data), linked by the `userId` foreign key. The system also creates a default leave balance record and a feature access record for the employee. Employees have configurable working week-off days, shift times, geo-fencing settings, and web attendance settings. Each employee is placed within a branch, department, position, and reporting hierarchy through the `managerId` reference.

**Data Flow:** Admin form submissions flow through PUT and POST requests to the employee API. The backend validates required fields and executes transactional writes across multiple tables to ensure consistency. Employee records are read by many other modules, forming the central entity of the system.

**Backend Communication:** `GET /api/admin/employees`, `GET /api/admin/employees/{id}`, `POST /api/admin/employees`, `PUT /api/admin/employees/{id}`, `DELETE /api/admin/employees/{id}`. Additional branch data from `GET /api/branches`.

**Database Interaction:** Reads and writes to `users` and `employee` tables. Reads from `branches`, `leave_balances`, `payslips`, and `assets` tables when building a comprehensive employee view. Cascading updates to linked records on employee deactivation.

**Error Handling:** 404 for employee not found. 400 for missing required fields. Transactional rollback on any failure during creation to maintain data integrity.

**Output Behavior:** List views return paginated employee arrays with branch names. Detail views return the full employee record including leave balance summary, recent payslip history, and assigned assets.

---

### 6.3 Attendance Management Module

**Purpose:** Tracks daily employee presence, check-in and check-out times, location data, and work shift compliance across the organization.

**Entry Points:** Employees access attendance from the Employee Portal. Admins access it from the Admin Panel's Attendance section. Mobile-specific interfaces are available for on-the-go attendance marking.

**User Journey (Employee):** An employee navigates to the Attendance section and sees their attendance history for the last 30 days. To record attendance, they use the check-in functionality, which may require them to capture a photo via the device camera and may enforce location validation if geo-fencing is enabled for their account. They check out at the end of the day through the same interface.

**User Journey (Admin):** An administrator views the entire organization's attendance records, filtered by date range, employee, or status. They can regularize attendance records where an employee's entry was incorrect, configure global attendance settings, manage shift definitions, and manage geo-fencing zones.

**Features:** Check-in and check-out with timestamp recording, late and early arrival detection against shift times, geo-location capture and optional geo-fence enforcement, photo capture on attendance punch, shift-time-based status classification, attendance regularization by admin, week-off and holiday exclusion from working day calculations, missing checkout detection via cron job, mobile-optimized attendance interface with camera and map views.

**Business Logic:** When an employee punches in, the system first checks whether they have an approved leave for today — if they do, check-in is blocked. The check-in time is compared against the configured shift start time. If the employee arrives after the shift start, the status is recorded as "present (late)." If they arrive before, the status is "present." On check-out, hours worked are calculated. The system accommodates employees who check in on a weekend or holiday by allowing the status to be overridden from "weekend" or "holiday" to "present."

A cron job runs daily to find attendance records from previous dates where a check-in exists but check-out is null. These records are updated to "present (checkout missing)" or "present (late+checkout missing)" to flag incomplete records for administrative review.

The sandwich policy is applied during leave approval: if weekends or holidays fall between two separate approved leave periods, those interstitial days are automatically converted to unpaid sandwich leaves to prevent circumvention of the leave policy.

**Data Flow:** Attendance punch requests carry geo-coordinates, optional photo URL, and the action type (check-in, check-out, or punch). The backend geocodes the coordinates using the Google Geocoding API if a key is configured, resolving them to a human-readable address. The attendance record is created or updated in the database.

**Backend Communication:** `GET /api/employee/attendance`, `POST /api/employee/attendance/punch`, `GET /api/admin/attendance`, `PUT /api/admin/attendance/{id}` (regularize), `GET /api/admin/attendance/config`, `PUT /api/admin/attendance/config`.

**Database Interaction:** Reads and writes to `attendance` table. Reads from `employee` for shift and week-off configuration. Reads from `company_holidays` for holiday awareness. Reads from `leaves` to check for active leave conflicts. Reads from `shift_times` for shift boundary comparisons.

**Error Handling:** Duplicate check-in blocked with a clear error message. Leave conflict prevents check-in. Geo-fence violations reject the punch if enabled. Transactional rollback on punch failure.

**Output Behavior:** Attendance history displayed with status, check-in/out times, hours worked, and location data. Admin view shows aggregate statistics and individual records with regularization options.

---

### 6.4 Leave Management Module

**Purpose:** Manages employee leave requests, approvals, balance tracking, and policy enforcement across the organization.

**Entry Points:** Employees submit leave requests through the Employee Portal leave section. Admins review and manage all leave requests through the Admin Panel.

**User Journey (Employee):** An employee navigates to the Leaves section and views their leave balance showing paid total, paid used, unpaid used, and remaining entitlement. They view their leave history paginated by request. To apply for leave, they navigate to the apply leave page, select leave type (paid or unpaid), start date, end date, and provide a reason. The system calculates the number of working days requested, accounting for weekends and holidays.

**User Journey (Admin):** An administrator views all pending leave requests across the organization. They can approve or reject each request. Upon approval, the system applies the sandwich policy to check for adjacent weekends or holidays that should be converted to sandwich leaves. Email notifications are queued to inform the employee of the decision.

**Features:** Paid and unpaid leave types, configurable annual leave balance, working-day calculation excluding weekends and holidays per employee's configured week-off, sandwich policy enforcement, leave balance adjustment by admin, paginated leave history, leave conflict check with attendance, email notifications on status changes.

**Business Logic:** Leave days are counted only on working days, excluding the employee's configured week-off days and active company holidays. When a leave is approved that is adjacent to a weekend or holiday that is itself adjacent to another approved leave, the system automatically inserts unpaid "sandwich leave" records for those interstitial non-working days and marks the corresponding attendance records accordingly. Leave balance records in `leave_balances` are updated when leaves are approved or when the admin manually adjusts an employee's entitlement.

**Data Flow:** Leave application data flows from the employee form to the leave creation API. Leave approval triggers sandwich policy checks and database updates to both the `leaves` and `attendance` tables, plus email queue insertion.

**Backend Communication:** `GET /api/employee/leaves`, `POST /api/employee/leaves`, `GET /api/admin/leaves`, `PUT /api/admin/leaves/{id}` (approve/reject), `PUT /api/admin/leaves/balance/{id}`.

**Database Interaction:** Reads and writes to `leaves` table. Reads and writes to `leave_balances`. Reads from `company_holidays` and `employee` for working-day calculations. Writes to `attendance` when sandwich policy creates leave entries. Inserts into `email_queue` on status changes.

**Error Handling:** 400 for missing required fields. Conflict detection for overlapping leave requests. Clear error messages surfaced to the employee on validation failures.

**Output Behavior:** Leave list with balance summary returned to the employee. Admin view provides full organizational leave data with filtering capabilities.

---

### 6.5 Payroll Module

**Purpose:** Manages the generation, tracking, and distribution of employee payslips including earnings, deductions, and net salary calculations.

**Entry Points:** Admin accesses payroll management from the Admin Panel. Employees access their own payslips from the Employee Portal.

**User Journey (Admin):** An administrator views the payroll overview showing aggregate statistics including total payroll disbursement, count of processed and pending payslips, and average salary. They can search payslips by employee name or ID. For new payroll cycles, they generate payslips individually or use the bulk payroll feature to generate for multiple employees simultaneously. Each payslip stores detailed earnings and deductions as structured JSON.

**User Journey (Employee):** An employee navigates to the Payroll section and sees a list of all their payslips ordered by date descending. Each payslip shows month, year, and net salary. They can expand a payslip to see the full breakdown of earnings components and deductions. Payslips can be downloaded as PDF documents generated by the `PayslipPDF` component.

**Features:** Individual and bulk payslip generation, detailed earnings and deductions JSON storage, PDF payslip download, paginated payroll administration, aggregate financial statistics, searchable payroll records.

**Business Logic:** Payslips store their financial data in three separate JSON fields: `earningsJson` for all earnings components (basic salary, allowances, bonuses), `deductionsJson` for all deduction components (PF, taxes, leaves without pay), and `detailsJson` for summary figures. Net salary is stored as a computed value on the record. Payslips have a status field (pending or generated) to track the processing lifecycle.

**Backend Communication:** `GET /api/admin/payroll`, `POST /api/admin/payroll`, `POST /api/admin/payroll/bulk`, `GET /api/employee/payroll`, `GET /api/admin/payroll/{id}/download`.

**Database Interaction:** Reads and writes to `payslips` table. Reads from `employee` for employee details during payslip rendering.

**Error Handling:** 400 for missing required data during generation. 404 for payslip not found.

**Output Behavior:** Admin receives paginated payslip list with statistics. Employee receives full payslip list with decoded earnings and deductions objects ready for rendering.

---

### 6.6 Performance Management Module

**Purpose:** Provides comprehensive performance metrics for employees based on attendance data, calculated across six-month rolling periods, enabling peer and team comparisons.

**Entry Points:** Employees access their performance view from the Employee Portal. Admins can review any employee's performance from the Admin Panel.

**User Journey (Employee):** An employee navigates to the Performance section and sees their attendance-based performance metrics across the last six months. The view shows monthly breakdowns of present days, leave days, absent days, late arrivals, and early departures. The employee can also see how their metrics compare to their peers within the same team and to their direct reports.

**User Journey (Admin):** An administrator selects an employee to analyze and views the same comprehensive metric breakdown, including comparison with the selected employee's peers and reporting team members.

**Features:** Six-month rolling attendance performance metrics, month-by-month breakdowns, current month in-progress summary, peer comparison within the same management hierarchy and department, reporting team comparison for managers, organizational context awareness (week-off and holidays excluded from calculations).

**Business Logic:** Performance metrics are built from raw attendance records. Each attendance status is normalized into one of three categories: present, leave, or ignore (for weekends, holidays, and future dates). The calculation respects each employee's individual week-off configuration and the company holiday calendar. For any given period, the system computes expected working days (total days minus weekends and holidays minus days before the employee's join date), actual present days, late arrival count, leave days used, and absent days. Peer discovery follows the organizational hierarchy: peers are employees sharing the same manager and department. Reporting employees are traversed recursively through the management tree.

**Backend Communication:** `GET /api/admin/performance?id={employeeId}`, `GET /api/employee/performance`.

**Database Interaction:** Reads from `employee` for profile and week-off data. Reads bulk attendance data for the employee and all relevant peers and reports in a single optimized query. Reads from `company_holidays` for holiday awareness.

**Error Handling:** 400 if no employee ID is provided to the admin endpoint. 404 if the employee record is not found.

**Output Behavior:** Returns the employee's metrics, current month summary, peer metrics array, and reporting team metrics array, all computed from attendance data.

---

### 6.7 Expense Management Module

**Purpose:** Enables employees to submit expense reimbursement claims and allows administrators to review, approve, or reject these claims.

**Entry Points:** Employees access expense management from the Employee Portal. Admins access it from the Admin Panel.

**User Journey (Employee):** An employee navigates to the Expenses section and views their submitted expense history. They can add a new expense by providing a title, description, amount, category, and optionally uploading a supporting document or bill image. The expense is created with a "Pending" status.

**User Journey (Admin):** An administrator views all expense claims across the organization with pagination. For each pending claim, they can approve or reject it and optionally add remarks explaining the decision.

**Features:** Expense submission with category classification, optional bill document attachment, paginated expense history, admin approval and rejection workflow with remarks, organization-wide expense visibility for admin.

**Business Logic:** Expenses are user-scoped; employees can only submit and view their own expenses. Once submitted, the expense remains in pending status until an administrator acts on it. There is no automatic approval workflow. The system enforces that only "Approved" or "Rejected" are valid status values on admin update requests. Expense deletion is supported for the submitting employee as long as the expense has not yet been acted upon.

**Backend Communication:** `GET /api/employee/expenses`, `POST /api/employee/expenses`, `DELETE /api/employee/expenses/{id}`, `GET /api/admin/expenses`, `PUT /api/admin/expenses/{id}`.

**Database Interaction:** Reads and writes to `expenses` table. Scoped by `user_id` for employee access. Joined with `employee` for admin view to show employee names and IDs.

**Error Handling:** 400 for missing required fields. 400 for invalid status values. Standard 404 and 500 error handling.

---

### 6.8 Recruitment and Candidate Pipeline Module

**Purpose:** Manages the complete end-to-end recruitment lifecycle from job posting creation through candidate sourcing, evaluation, and offer management.

**Entry Points:** Administrators manage recruitment from the Admin Panel's Recruitment section. Candidates access job listings and manage applications through the Candidate Portal.

**User Journey (Admin):** An administrator creates a job posting by specifying the title, department, location, type (full-time, part-time, contract), status (Draft, Active, Closed), description, requirements, and salary range. Active jobs appear to candidates. As applications arrive, the admin reviews each candidate's profile and moves them through pipeline stages. Admins can shortlist, schedule interviews, verify documents, issue offers, or reject candidates. Each action triggers a corresponding templated email to the candidate.

**User Journey (Candidate):** A candidate registers or logs in to the portal and browses active job listings. They can apply for positions, track the status of their applications, and receive notifications when their application status changes. They can upload supporting documents such as resumes, certificates, and IDs through the documents section.

**Features:** Job posting CRUD, application pipeline management, candidate stage tracking (applied, shortlisted, interview scheduled, offer issued, rejected), document upload and verification, offer letter generation from templates, templated email communications for each pipeline stage, interview scheduling notifications, document verification workflow for administrators.

**Business Logic:** Job postings track the number of applications through a derived count. Each application is tied to a job and a candidate user. The pipeline stages model a sequential recruiting funnel. When an admin verifies a candidate's documents, the system updates the candidate profile to mark documents as verified. Offer letters are generated using a template with variable substitution for candidate name, role, salary, and joining date. Hired candidates can be converted to employees by the administrator.

**Backend Communication:** `GET /api/admin/jobs`, `POST /api/admin/jobs`, `PUT /api/admin/jobs/{id}`, `DELETE /api/admin/jobs/{id}`, `GET /api/admin/applications`, `PUT /api/admin/applications/{id}`, `POST /api/admin/send-email`, `GET /api/candidate/jobs`, `POST /api/candidate/apply`, `GET /api/candidate/applications`.

**Database Interaction:** Reads and writes to `jobs` and `applications` tables. Reads and writes to `candidate_profiles`. Reads from `users` for candidate details. Inserts into `email_queue` for all candidate communications.

**Email Notifications:** Separate HTML email templates exist for candidate activation, application received, shortlisting, interview scheduling, offer issuance, rejection, and document verification.

---

### 6.9 Assessment Hub Module

**Purpose:** Provides a fully featured employee assessment system for creating, distributing, proctoring, and evaluating knowledge assessments.

**Entry Points:** Administrators access the Assessment Hub through a dedicated workspace at `/admin/assessments`. Employees access their assigned assessments through the Employee Portal.

**User Journey (Admin):** An administrator navigates to the Assessment Hub workspace, which has its own distinct layout separate from the main admin panel. They manage a department-level question bank by adding, editing, and organizing questions per department. They create assessments by specifying the title, department, duration, marks per question, maximum attempts allowed, assessment date, and selecting questions from the question bank. They can publish assessments and assign them to specific employees. The Results section shows all completed attempts with scores, percentages, pass/fail status, and a detailed question-level breakdown.

**User Journey (Employee):** An employee navigates to the Assessments section and sees all assessments assigned to them. Each assessment card shows the title, department, time limit, total marks, number of attempts used, and whether they have passed. If attempts remain and the assessment is active, they can start a new attempt. They first see an instructions page, then enter the full-screen assessment engine, which presents questions one at a time with a countdown timer. Upon submission, they are redirected to a results page showing their score and feedback.

**Features:** Department-level question bank management, assessment creation with flexible configuration, employee-specific assignment, attempt tracking with maximum attempt enforcement, time-limited exam engine, full-screen assessment mode, detailed results with per-question breakdown, admin results analytics.

**Business Logic:** Assessments can only be taken by employees who are explicitly assigned to them. The system tracks attempts per employee per assessment. If the maximum attempts threshold is reached, further attempts are blocked. An in-progress attempt is detected on the assignment list, allowing the employee to resume an interrupted session. Assessment scores are calculated as the sum of marks awarded for correctly answered questions. The passing threshold is a percentage value configured per assessment. Metadata caching at the API level (5-minute file-based cache) reduces database load for the frequently accessed assessment list.

**Backend Communication:** `GET /api/admin/assessments`, `POST /api/admin/assessments`, `PUT /api/admin/assessments/{id}`, `DELETE /api/admin/assessments/{id}`, `GET /api/admin/questions`, `POST /api/admin/questions`, `GET /api/admin/assessments/attempts`, `GET /api/employee/assessments`, `POST /api/employee/assessments/start`, `POST /api/employee/assessments/submit`.

**Database Interaction:** Reads and writes to `assessments`, `questions`, and `assessment_attempts` tables. Reads from `users` and `employee` for employee context. Attempt data including all answers is stored as structured JSON in the `answers_data` column.

---

### 6.10 Training Videos Module

**Purpose:** Enables administrators to publish video-based training content and assign it to specific employees for professional development.

**Entry Points:** Admins manage training videos within the Assessment Hub workspace. Employees access their assigned videos through the Employee Portal Training section.

**User Journey (Admin):** An administrator uploads a training video by providing a title and a video URL (linking to an external or Supabase-hosted video resource). They can assign the video to specific employees by selecting from the employee roster. They can update assignments and delete videos.

**User Journey (Employee):** An employee navigates to the Training section and sees all videos assigned to them. They can play videos directly in the browser using the provided URL.

**Features:** Video creation with URL and title, per-employee assignment using a JSON array, assignment management, employee-scoped video access.

**Business Logic:** Training video assignments are stored as a JSON array of employee IDs against each video record. The backend uses PostgreSQL's JSONB containment operators to filter videos where the stored assignment array contains the requesting employee's ID, handling both integer and string ID formats for compatibility.

**Backend Communication:** `GET /api/admin/training/videos`, `POST /api/admin/training/videos`, `DELETE /api/admin/training/videos/{id}`, `PUT /api/admin/training/videos/{id}/assign`, `GET /api/employee/training/videos`.

**Database Interaction:** Reads and writes to `training_videos` table. Assignment lookups use JSONB containment (`@>`) operators on `assigned_employee_ids` column.

---

### 6.11 Chat and Messaging Module

**Purpose:** Provides a secure, real-time messaging system for all users, supporting direct messages and group conversations with end-to-end message encryption.

**Entry Points:** Chat is accessible from both the Admin Panel and the Employee Portal. A mobile-optimized chat interface is available for mobile users.

**User Journey:** A user navigates to the Chat section and sees a list of their active conversations ordered by most recent message, with unread message counts. They can start a new direct message with any active user in the system. They can also create group chats, add participants, and manage group settings. Within a conversation, messages are displayed chronologically and are decrypted for display. Users can send text messages and attachments.

**Features:** Direct and group messaging, message encryption at rest using AES-256-GCM, unread message counting, join timestamp awareness (users only see messages sent after they joined a chat), group admin management, pending participant requests, real-time message ordering, mobile-optimized interface.

**Business Logic:** All message content is encrypted before storage in the database using AES-256-GCM with a random 96-bit IV and a 128-bit authentication tag. The encryption key is a 256-bit key loaded from the `APP_CHAT_KEY` environment variable. When messages are retrieved, they are decrypted server-side before being returned to the client. The chat participant's join timestamp is used to filter messages, ensuring that participants added later to a group cannot see historical messages predating their membership. Unread counts are computed server-side by counting messages in the chat received after the user's join time that the user's ID does not appear in the `readBy` JSON array.

**Backend Communication:** `GET /api/chat/users`, `GET /api/chat`, `GET /api/chat/{id}/messages`, `POST /api/chat`, `POST /api/chat/{id}/messages`, `PUT /api/chat/{id}/messages/read`.

**Database Interaction:** Reads and writes to `chats`, `chat_participants`, and `chat_messages` tables. `chat_messages.readBy` is a JSONB array of user IDs who have read the message. Complex CTE (Common Table Expression) queries are used to efficiently fetch chat lists with last messages and unread counts in a single database round trip.

---

### 6.12 Asset Management Module

**Purpose:** Tracks company-owned physical or digital assets and their assignment to employees.

**Entry Points:** Admin Panel Assets section.

**User Journey:** An administrator views the complete asset registry with pagination. They add new assets specifying name, category, serial number, status, and optionally assigning the asset to an employee. They can update asset details or reassign assets between employees.

**Features:** Asset CRUD, employee assignment, status tracking, paginated asset listing, asset visibility on employee profiles.

**Business Logic:** Assets are assigned to employees by the employee's `id` in the `employee` table (not the `userId`). When creating a new asset with an assignment, the backend resolves the user ID to the employee profile ID. Asset records appear on the assigned employee's profile page to provide a complete asset inventory view.

**Backend Communication:** `GET /api/admin/assets`, `POST /api/admin/assets`, `PUT /api/admin/assets/{id}`, `DELETE /api/admin/assets/{id}`.

**Database Interaction:** Reads and writes to `assets` table. Joined with `employee` for admin list view. Reads from `employee` to resolve user-to-employee ID mapping on assignment.

---

### 6.13 Holiday Management Module

**Purpose:** Maintains the official company holiday calendar used by the attendance and leave modules for working-day calculations.

**Entry Points:** Admin Panel Holidays section. Employee Portal Holiday listing. An archive section for historical holidays.

**User Journey:** An administrator creates a holiday entry by specifying the date, name, and optionally an image for display purposes. Existing holidays can be updated or deactivated. Employees view upcoming and current-year holidays in the employee portal.

**Features:** Holiday creation and update, date-based uniqueness enforcement, image attachment, active/inactive status, month-based filtering, holiday archiving.

**Business Logic:** Holiday dates are used system-wide by the attendance punch logic, leave application working-day calculations, and performance metric calculations. Deactivated holidays are excluded from all business calculations. The archive page shows all holidays regardless of active status.

**Backend Communication:** `GET /api/admin/holidays`, `POST /api/admin/holidays`, `PUT /api/admin/holidays/{id}`, `DELETE /api/admin/holidays/{id}`, `GET /api/employee/holidays`.

**Database Interaction:** Reads and writes to `company_holidays` table. Active holiday records are frequently read across multiple modules.

---

### 6.14 Audit Logs Module

**Purpose:** Provides a complete, immutable record of all significant actions performed in the system, supporting compliance, security investigation, and operational oversight.

**Entry Points:** Admin Panel Audit Logs section.

**User Journey:** An administrator navigates to the Audit Logs section and views a paginated, filterable log of all system activity. They can filter by module name, action type, actor name or UUID, and date range. Each log entry shows the module, entity type, action, actor identity and role, target employee, previous and new values for changed fields, timestamp, IP address, and browser information. UUID values in the log entries are automatically resolved to human-readable names.

**Features:** Paginated audit log viewing, multi-dimensional filtering, full change tracking with before/after values, UUID-to-name resolution, actor IP and browser context, session ID tracking.

**Business Logic:** Audit log records are inserted by database-level triggers that fire when records in key tables are modified. The triggers use the PostgreSQL session configuration variables set by the `AuthMiddleware` on each request (`app.current_user_id`, `app.current_user_role`, `app.ip_address`, etc.) to capture the full context of who made the change and from where. This approach ensures audit records are created even if application logic bypasses explicit logging calls.

**Backend Communication:** `GET /api/admin/audit-logs`.

**Database Interaction:** Reads from `audit_logs` table. UUID resolution queries are made against `users` and `employee` tables to replace raw UUIDs in log entries with human-readable names.

---

### 6.15 Feature Access Control Module

**Purpose:** Provides fine-grained, per-user control over which application modules individual non-admin users can access.

**Entry Points:** Admin Panel Feature Access section.

**User Journey:** An administrator navigates to Feature Access and sees a list of all non-admin users with their current feature permission flags displayed as toggles. The admin can enable or disable any individual feature for any user by toggling the corresponding flag. Changes take effect immediately and are reflected on the user's next authenticated request.

**Features:** Per-user feature flag management, upsert-based permission storage, real-time effect on navigation and API access, full list of configurable features: Attendance, Leave, Payroll, Employees, Recruitment, Assets, Chat, Loan Origination, Admin Assessments, Employee Assessments, Employee Training Videos.

**Business Logic:** Feature access records are stored in `user_feature_access` with one row per user. New users get a default record created during employee creation. The backend uses an upsert (INSERT ... ON CONFLICT DO UPDATE) pattern to handle both first-time grants and updates to existing records. The list of valid feature flag column names is validated server-side to prevent injection of arbitrary column names.

**Backend Communication:** `GET /api/admin/feature-access`, `POST /api/admin/feature-access`.

**Database Interaction:** Reads and writes to `user_feature_access` table. Joined with `users` for the admin list view.

---

### 6.16 System Settings Module

**Purpose:** Provides global system configuration that affects behavior across all modules, including security policies, branding, and operational modes.

**Entry Points:** Admin Panel Settings section, Email Templates section.

**User Journey:** An administrator navigates to Settings and configures session timeout duration, login rate limit attempts and window, forgot password rate limit attempts and window, maps API rate limit, news headlines for the application ticker, maintenance mode flag and message. Separately, they can manage the library of email templates used for candidate communications.

**Features:** Session timeout configuration (in minutes or "never"), login rate limit policy, forgot-password rate limit policy, maps API rate limit policy, news headlines management (add/remove scrolling ticker items), maintenance mode toggle with custom message, admin avatar upload, email template management.

**Business Logic:** Global settings are read at login time to determine JWT expiration duration and rate limit thresholds. Settings are cached in a PHP in-memory cache for 5 minutes to avoid hitting the database on every request. When maintenance mode is enabled, all users see the maintenance overlay regardless of their authentication state. News headlines are returned along with the user profile on each `/api/me` call and are displayed in a scrolling ticker on the dashboard.

**Backend Communication:** `GET /api/admin/settings`, `POST /api/admin/settings`, `GET /api/admin/email-templates`, `PUT /api/admin/email-templates/{id}`.

**Database Interaction:** Reads and writes to `global_settings` table (single-row design with upsert logic). Reads from and writes to `email_templates` table.

---

### 6.17 Loan Origination Module

**Purpose:** Provides a dedicated workspace for managing employee loan origination requests.

**Entry Points:** Employee Portal at `/employee/loans/origination`. A separate layout (`OriginationLayout`) wraps this section.

**User Journey:** An employee with loan origination feature access navigates to the Loans section. The Origination Dashboard provides the interface for managing loan requests.

**Features:** Dedicated origination workspace with its own layout. Feature access controlled via `canLoanOrigination` flag.

---

### 6.18 Face Registration Module

**Purpose:** Enables employees to register their facial biometric data for use in face-based attendance marking and login.

**Entry Points:** Employee Portal dedicated face registration page.

**User Journey:** An employee navigates to the face registration page, grants camera access, and the system captures their facial descriptor using a client-side face detection model. The descriptor vector is submitted to the backend, where it is stored in the `user_biometrics` table associated with their user ID. Once registered, the `isFaceRegistered` flag on their profile is set to true.

**Features:** Browser-based face capture, 128-dimensional descriptor submission, backend pgvector storage, registration status tracking.

---

### 6.19 Employee Dashboard Module

**Purpose:** Provides employees with a personalized overview of their status and quick access to key HR information.

**Entry Points:** Employee Portal root path `/employee`.

**Features:** Personal attendance summary, leave balance overview, upcoming holidays, recent payslip preview, news headlines ticker, notifications, quick-access links to key functions, birthday announcements.

---

### 6.20 Admin Dashboard Module

**Purpose:** Provides administrators with a real-time organizational health overview and key operational metrics.

**Entry Points:** Admin Panel root path `/admin`.

**Features:** Total active employee count, today's attendance and leave counts, six-month monthly attendance trend, salary distribution by range, department headcount distribution, upcoming birthdays, recent leave requests awaiting action, pending expense claims summary, news headlines ticker. Dashboard statistics are cached for a short period to optimize performance under high load.

---

## 7. Page-Level System Behavior

### Login Page (`/`)

The Login page is the entry point for all admin and employee users. It renders a login form with email and password fields. On submission, it calls the `signIn` method from `AuthContext`, which makes the login API call. If a rate limit lockout is active, the page displays an inline countdown showing the remaining seconds until login is available again. After successful authentication, the page inspects the user's role: admin users are redirected to `/admin`, while employee, hr, and manager users are redirected to `/employee`. If the user has a `forcePasswordChange` flag, they are redirected to `/change-password` regardless of role. A face login toggle allows switching to biometric authentication mode.

### Candidate Login Page (`/candidate/login`)

Similar to the standard login page but targets the candidate-specific login endpoint. Successful login redirects to `/candidate/dashboard`. New candidates can follow a registration link to the registration form.

### Candidate Activate Page (`/candidate/activate`)

This page is loaded via the activation link sent to the candidate's email. It reads the activation token from the URL query string and calls the activation API. On success, the candidate's account is activated and they are redirected to the login page.

### Forgot Password Page (`/forgot-password`) and Reset Password Page (`/reset-password`)

The Forgot Password page accepts an email address and triggers a password reset email containing a single-use token link. The Reset Password page reads the token from the URL, validates it, and allows the user to set a new password. Rate limiting is applied to the forgot-password request.

### Change Password Page (`/change-password`)

Available to all authenticated users. Enforces the password policy on the new password before submission. On success, updates the password and clears the `forcePasswordChange` flag.

### Admin Dashboard (`/admin`)

Fetches organizational statistics from `/api/admin/dashboard/stats`. Displays employee count, attendance metrics, trend charts, salary distribution, department breakdown, recent leaves, and upcoming birthdays. Data is refreshed according to TanStack Query's default stale time.

### Admin Employees (`/admin/employees`)

Fetches the full employee list with an optional search query parameter. Presents a searchable, sortable table. Each row links to the employee detail view. An "Add Employee" button opens a modal form for new employee creation.

### Admin Employee View (`/admin/employees/:id`)

Fetches complete employee data including leave balance, recent payslips, and assets. Displays tabbed sections for personal info, employment details, documents, payslips, and assets. Links to the edit and settings pages.

### Admin Employee Edit (`/admin/employees/:id/edit`)

Loads the current employee record into an editable form. Submits changes via PUT to update both the `users` and `employee` tables transactionally. Validates required fields client-side before submission.

### Admin Employee Settings (`/admin/employees/:id/settings`)

Manages employee-specific behavioral settings including geo-fencing toggle, web attendance toggle, MFA enable/disable, account active/inactive status, and shift time assignment.

### Admin Attendance (`/admin/attendance`)

Displays the organization-wide attendance records with date and employee filtering. Shows each employee's daily status. Provides a quick-regularize action for incorrect records.

### Admin Attendance Config (`/admin/attendance/config`)

Manages company-wide attendance configuration including shift time definitions, office location coordinates for geo-fencing, and geo-fence radius.

### Admin Attendance Regularize (`/admin/attendance/regularize`)

Dedicated interface for bulk-regularizing multiple attendance records. Allows selection of employee, date range, and new status.

### Admin Attendance Location (`/admin/attendance/location`)

Manages the geo-fence zone definitions — the geographic boundaries employees must be within to mark attendance.

### Admin Leaves (`/admin/leaves`)

Lists all leave requests with filtering by status. Each request shows the employee name, leave type, dates, days count, reason, and current status. Approve and reject actions trigger status updates and email notifications.

### Admin Payroll (`/admin/payroll`)

Displays paginated payroll records with aggregate statistics. Supports search. Individual payslip records can be viewed in detail. Links to the bulk payroll generation workflow.

### Admin Bulk Payroll (`/admin/payroll/bulk`)

Provides an interface for generating payslips for multiple employees in a single operation, specifying month, year, and earnings/deductions configurations.

### Admin Performance (`/admin/performance`)

An employee selector drives this page. After selecting an employee, it fetches and displays the full performance report including six-month trends, current month summary, peer comparison, and reporting hierarchy metrics.

### Admin Expenses (`/admin/expenses`)

Shows all employee expense submissions with pagination. Each row shows the employee name, expense title, amount, category, and current status. Approve/reject controls with optional remarks.

### Admin Assets (`/admin/assets`)

Paginated asset registry with create, update, and delete operations. Shows assigned employee names for each asset.

### Admin Holidays (`/admin/holidays`) and Archive (`/admin/holidays/archive`)

Active holidays management with create, update, and deactivate operations. The archive view shows all historical holiday records.

### Admin Feature Access (`/admin/feature-access`)

Lists all non-admin users with a toggle matrix for all available feature flags. Toggling a flag fires an immediate API call to update the permission.

### Admin Audit Logs (`/admin/audit-logs`)

Paginated audit log viewer with search and filter controls. Displays detailed change records. UUIDs in log entries are resolved to names.

### Admin Settings (`/admin/settings`)

Form-based global settings management. Changes are submitted via POST to the settings endpoint.

### Admin Email Templates (`/admin/email-templates`)

Lists the available email templates with a rich-text editor for modifying template content. Templates are used by the recruitment module and other notification systems.

### Admin Recruitment (`/admin/recruitment`)

Comprehensive recruitment pipeline management. Tabbed views for Jobs (create, edit, publish, close) and Applications (filter by job, stage management, candidate actions). Links to the document verification page for specific candidates.

### Admin Verify Documents (`/admin/recruitment/verify-documents/:id`)

Shows a candidate's uploaded documents for verification. An admin can mark documents as verified or request resubmission. Email notifications are triggered on verification or rejection.

### Admin Directory (`/admin/directory`)

A read-only searchable organizational directory showing all employees with their department, position, branch, and contact information.

### Assessment Management Pages (`/admin/assessments/*`)

A dedicated workspace with its own layout. Tabs for Department Question Bank (manage questions per department), Assessment Management (create, edit, publish, delete assessments, assign to employees), Assessment Results (view all attempts with analytics), and Training Videos.

### Employee Dashboard (`/employee`)

Personal dashboard with attendance summary, leave balance, payslip preview, and holiday listings. Adapts navigation based on feature access flags.

### Employee Attendance (`/employee/attendance`)

Shows last 30 attendance records. Check-in/check-out controls trigger the punch API with optional photo and location capture. Status badges provide visual attendance health feedback.

### Employee Mobile Attendance (`/employee/attendance/camera`, `/employee/mobile/map`)

Mobile-optimized interfaces for camera-based photo capture and map-based location display during attendance marking.

### Employee Holidays (`/employee/holidays`)

Displays the current year's company holidays with date and name. Mobile variant available.

### Employee Leaves (`/employee/leaves`)

Shows leave balance summary and paginated leave history. Apply Leave button navigates to the leave application page.

### Employee Apply Leave (`/employee/leaves/apply`)

Form for submitting a new leave request. Date pickers calculate the number of working days. Submits via POST to the leave creation endpoint.

### Employee Payroll (`/employee/payroll`)

Shows all payslips ordered newest first. Each payslip can be expanded to show full earnings and deductions. PDF download available via the PayslipPDF component.

### Employee Performance (`/employee/performance`)

Displays the employee's own six-month performance metrics, peer comparison, and reporting team data (if they have direct reports).

### Employee Expenses (`/employee/expenses`)

Shows personal expense history. Add Expense form for new submissions with optional file upload.

### Employee Profile (`/employee/profile`) and Edit Profile (`/employee/profile/edit`)

Profile shows all personal and employment details, team structure (manager, peers, reports), and assigned assets. Edit page allows updates to personal contact and biographical fields.

### Employee Face Registration (`/employee/face-registration`)

Camera-based interface for capturing and submitting facial biometric data.

### Employee Assessments (`/employee/assessments`, `/employee/assessments/instructions`, `/employee/assessments/session`, `/employee/assessments/result`)

Sequenced pages for viewing available assessments, reading instructions, taking the timed exam in a full-screen engine, and viewing results after submission.

### Employee Training Videos (`/employee/training`)

Lists all training videos assigned to the employee with playback capability.

### Chat (`/admin/chat`, `/employee/chat`, `/employee/chat/mobile`)

Messaging interface with conversation list, message threads, and new chat creation. Decrypted messages rendered in real time.

### Candidate Dashboard (`/candidate/dashboard`)

Overview of candidate activity — applications submitted, statuses, and any pending actions.

### Candidate Jobs (`/candidate/jobs`)

Lists all open job postings with apply controls.

### Candidate Applications (`/candidate/applications`)

Shows the candidate's submitted applications with current pipeline stage.

### Candidate Profile (`/candidate/profile`)

Candidate's editable professional profile including bio, experience, current title, and resume uploads.

### Candidate Documents (`/candidate/documents`)

Interface for uploading required documents. The system tracks when the documents tab was first viewed.

### Origination Dashboard (`/employee/loans/origination`)

Loan origination management interface within the dedicated OriginationLayout workspace.

### Not Found (`*`), Coming Soon, and Offline Pages

System utility pages for invalid routes, features in development, and network connectivity loss detection.

---

## 8. API System Behavior

### How APIs Are Structured

All API endpoints are prefixed with `/api`. The URL structure follows a resource-oriented pattern: `/api/{portal}/{resource}` or `/api/{portal}/{resource}/{id}`. Portal prefixes are `admin`, `employee`, and `candidate`. A small number of shared endpoints (login, me, branches, chat) exist at the root `/api` level. All requests and responses use JSON encoding.

### How Requests Are Triggered

The frontend triggers API calls in three ways. Initial page data loads are managed by TanStack Query's `useQuery` hook, which fires the request when the component mounts and handles caching, refetching, and loading states automatically. Mutations (creating, updating, or deleting records) are triggered by user form submissions or button interactions, managed either through TanStack Query's `useMutation` hook or direct Axios calls. Authentication-related requests are made directly through the `AuthContext` methods.

### Authentication Handling in APIs

Every protected API endpoint is registered with `->add(new AuthMiddleware([...]))` in the Slim route definition. The `AuthMiddleware` extracts the Bearer token from the Authorization header, decodes and verifies the JWT signature and expiration, checks the user's role against the required roles list, optionally checks feature access flags for the user, verifies the user's account is still active in the database, sets PostgreSQL session variables for audit trail purposes, and attaches the decoded token to the request object for use by the route handler.

### Request and Response Lifecycle

An incoming HTTP request enters the Slim application and passes through the middleware stack in order: GZIP middleware (response compression), Performance Logging middleware (request timing), Audit middleware (method and path logging), CORS middleware (headers and preflight handling), then the route-specific `AuthMiddleware`, and finally the route handler function. The route handler queries the database, constructs a JSON response, and returns it back through the middleware chain.

### Error Handling Strategy

The API uses HTTP status codes semantically. 200 for successful GET and PUT requests. 201 for successful POST creation. 400 for client-side validation failures with descriptive error messages. 401 for missing or invalid authentication tokens. 403 for insufficient permissions or deactivated accounts. 404 for resources that do not exist. 429 for rate limit violations with a `secondsRemaining` field. 500 for unexpected server-side errors.

### Data Transformation Between Frontend and Backend

The Axios response interceptor performs automatic date normalization. PostgreSQL returns timestamps in the format `YYYY-MM-DD HH:MM:SS`, which the interceptor converts to ISO 8601 format with the Indian Standard Time offset (`+05:30`). This ensures consistent JavaScript `Date` object construction throughout the frontend. JSON fields stored in database columns (such as payslip earnings, deductions, and assessment answers) are decoded by the backend before being included in API responses so the frontend receives native objects rather than JSON strings.

### API Dependency Between Modules

Several modules depend on shared data fetched by other APIs. The employee list (`/api/admin/employees`) is consumed by the attendance regularization, payroll generation, feature access, and assessment assignment interfaces. The branches endpoint (`/api/branches`) is consumed by the employee creation form. Performance metrics depend on attendance data. Payslip generation depends on employee salary data. Chat users list depends on the users table across all roles.

### Caching Mechanisms

The backend implements two levels of caching. A PHP in-process file-based cache (stored in the system's temporary directory) is used for frequently read, infrequently changed data such as assessment metadata and global settings, with a 5-minute TTL. TanStack Query on the frontend implements client-side caching with a 5-minute stale time, automatic background refetching on window focus and reconnect, and localStorage persistence for 24-hour offline availability.

---

## 9. Database Interaction Logic

### How Data Is Structured Conceptually

The database is organized around the central `users` table, which holds authentication credentials and role assignments. The `employee` table extends user records with HR-specific data and is linked one-to-one with `users` via the `userId` foreign key. The `candidate_profiles` table similarly extends users with recruitment-specific data for candidate-role users.

Operational records — attendance, leaves, payslips, expenses — are associated with users primarily through the `employeeId` or `user_id` column, which corresponds to the `users.id` value (not the `employee.id`). Asset records are associated through `employee.id`. This distinction is important and is reflected in how the backend joins these tables.

### How Different Modules Share Data

Holiday data from `company_holidays` is read by the attendance, leave, and performance modules. Employee schedule data (week-off, shift time) from `employee` is read by attendance, leave, and performance modules. Payslip records reference `employee.userId`. Leave records reference `users.id` as `employeeId`. The `user_feature_access` table is consulted at login and at API access time. The `global_settings` table is consulted at login and during rate-limited operations.

### Relationships Between Entities

Users have one Employee profile. Employees belong to one Branch. Employees report to one Manager (another employee). Employees have many Leaves, Attendance records, Payslips, and Expenses. Users have one Feature Access record. Chats have many Participants (users). Chats have many Messages. Assessments have many Questions and many Attempts. Training Videos have many assigned employees. Jobs have many Applications. Applications belong to one Job and one User.

### CRUD Operations Across the System

The system uses standard PDO prepared statements for all database operations. Insert operations use parameterized queries with positional or named placeholders. Update operations use explicit column lists. Delete operations are direct single-record deletions by primary key. Bulk operations (like bulk payroll generation) iterate over records and execute individual inserts within a transaction. The database uses UUID primary keys for most tables, generated using PostgreSQL's `gen_random_uuid()` function.

### Transaction Handling

Transactional integrity is used in operations that span multiple tables, particularly in employee creation (which writes to `users`, `employee`, `leave_balances`, and `user_feature_access`), leave approval (which writes to `leaves`, `leave_balances`, and `attendance`), and employee updates (which write to both `users` and `employee`). Transactions are managed explicitly using `$conn->beginTransaction()`, `$conn->commit()`, and `$conn->rollBack()` patterns.

### Data Validation Rules

Validation occurs at three levels. Client-side form validation catches obvious input errors before submission. API-level validation in route handlers checks for required fields and applies business rule constraints. Database-level constraints enforce referential integrity and data format correctness. The password policy is enforced by the `PasswordValidator` utility class on both the registration and password change endpoints. Feature flag column names are validated against a whitelist before being used in dynamic SQL to prevent injection attacks.

### Business Constraints Enforced at Data Level

A CHECK constraint on `users.role` enforces that only valid role values can be inserted, preventing privilege escalation through direct record manipulation. Unique constraints on email prevent duplicate registrations. The pgvector extension enforces the biometric vector dimensionality requirement. Attendance records use a unique composite index on `(employeeId, date)` to prevent duplicate daily records, handled through ON CONFLICT clauses in punch operations.

---

## 10. End-to-End User Journeys

### Journey 1: Admin Sets Up a New Employee

An administrator logs into the Admin Panel and navigates to Employees. They open the Add Employee modal and fill in the employee's personal details, employment information including department, position, branch, manager, salary, shift time, and week-off configuration. On submission, the backend creates user and employee records within a transaction, generates a welcome email from the template, queues it for delivery, creates a default leave balance, and creates a feature access record. The admin then navigates to Feature Access to enable any non-default features for this employee. The employee receives the welcome email with their login credentials and can immediately access the employee portal.

### Journey 2: Employee Marks Attendance

An employee opens the application on their mobile device. The application checks the stored JWT token and fetches their profile, displaying the Employee Dashboard. The employee navigates to Attendance. If geo-fencing is enabled for their account, the browser requests location permission. The employee taps Check In. The application captures the current location and optionally a photo via the camera. The attendance punch request is sent with coordinates, photo URL, action type, and the address resolved from coordinates by the Google Geocoding API. The backend validates that no approved leave exists for today, determines the attendance status based on shift time comparison, and creates or updates the attendance record. The UI updates to show the check-in time.

### Journey 3: Employee Applies for Leave and Admin Approves

An employee navigates to Leaves and selects Apply Leave. They choose the leave type, select start and end dates using date pickers, and enter a reason. The application calculates the working days count excluding weekends and holidays. The employee submits the request. The backend creates a leave record with pending status. The admin sees the new request on the Admin Leaves page. They review the details and approve. The backend updates the leave status to approved, applies the sandwich policy by checking adjacent dates for interstitial weekends and holidays, inserts any sandwich leave records into both the `leaves` and `attendance` tables, updates the leave balance, and queues an approval notification email to the employee. The employee, upon next viewing the Leaves page, sees the status updated and their balance adjusted.

### Journey 4: Candidate Registers and Progresses Through Recruitment

A candidate navigates to the candidate login page and registers. They receive an activation email and click the link, activating their account. They log in, complete their profile with biography, experience, and resume uploads, and browse active job listings. They apply for a position. The admin sees the new application and reviews the candidate's profile. The admin shortlists the candidate — an email is queued notifying them of shortlisting. The admin schedules an interview — another email is sent with interview details. After the interview, the admin updates the application to offer stage and generates an offer letter using the template system. The candidate accepts. The admin verifies the candidate's documents — a verification confirmation email is sent. The admin onboards the candidate as an employee, updating their role and creating the employee profile.

### Journey 5: Admin Generates Monthly Payroll

An administrator navigates to Payroll and reviews the current month's outstanding payslips. Using the Bulk Payroll interface, they select the target month and year, configure earnings components (basic salary, HRA, allowances) and deductions (provident fund, tax, unpaid leave deductions), and initiate generation. The backend creates payslip records for each selected employee with the detailed JSON breakdown. The admin can then review individual payslips, and employees gain access to their new payslip in the Employee Payroll section.

### Journey 6: Employee Takes an Assessment

An employee sees a new assessment assigned to them on the Assessments page. They review the details (duration, total marks, attempts allowed). They navigate to the Instructions page and read the assessment guidelines. They click Start Assessment, which opens the full-screen Assessment Engine. A countdown timer begins. The employee answers each question. At the final question or timer expiry, the assessment is submitted. The backend records the attempt with all answers, calculates the score, determines pass/fail against the passing percentage threshold, and returns the result. The employee is redirected to the Results page showing their score, percentage, pass/fail status, and question-by-question breakdown.

### Journey 7: Session Expiry and Re-Authentication

An employee has the application open in a browser tab and the session timeout expires. When the employee attempts to perform any action, the next API call returns a 401 Unauthorized response. The Axios interceptor passes this to the AuthContext, which detects the 401, removes the expired token from local storage, clears the cached profile, and the application redirects to the login page. The TanStack Query cache is cleared. The employee enters their credentials, receives a new token, and continues working.

---

## 11. Business Logic Across System

### How Permissions Are Enforced Globally

Role-based permissions are enforced at the API layer by the `AuthMiddleware`, which validates the JWT, checks the user's role against the route's required roles, and optionally checks feature access flags. The database provides a secondary enforcement layer through the role CHECK constraint. The frontend implements route-level protection through `ProtectedRoute` and navigation-level filtering based on the feature access flags included in the user profile. Administrators cannot be restricted by feature access — all module access is available to the admin role unconditionally.

### How Workflows Are Approved or Rejected

Leave and expense requests follow an explicit approval workflow. Items are created in a pending state. An administrator reviews them and takes an approve or reject action, which updates the status field and triggers any associated side effects (balance updates, sandwich policy, email notifications). There are no multi-step approval chains or delegated approvals — only the admin can approve or reject.

### How Calculations Are Performed

Working-day calculations for leave and performance use a date iteration algorithm that steps through each day in the range and excludes days matching the employee's configured week-off days and any active company holiday dates. Performance metrics build month-by-month summaries by iterating over each attendance record within the period. Payslip net salary calculations are performed at generation time based on the earnings and deductions JSON structures supplied by the admin.

### How Notifications Are Triggered

All email notifications are triggered asynchronously through an email queue table. When a system event requires an email (leave approval, candidate status change, welcome onboarding, password reset), the backend inserts a record into the `email_queue` table with the recipient address, subject, and pre-rendered HTML body. An external process (Supabase edge function) polls this queue and delivers the emails. This decoupling ensures that email delivery failures do not affect the primary operation's success.

### How Reports Are Generated

The dashboard statistics endpoint aggregates data from multiple tables in a single database transaction, using SQL aggregate functions and conditional grouping. Results are cached for a short period. The admin can export individual payslips as PDF documents generated client-side by the React PDF rendering component.

### How Audit Logs Are Maintained

Audit logs are populated primarily through PostgreSQL database triggers that fire on INSERT, UPDATE, and DELETE operations on key tables. These triggers capture the change context (actor identity, IP, session) from the PostgreSQL session variables set by the `AuthMiddleware`. The `AuditMiddleware` in the PHP middleware stack provides HTTP-level timing and request logging. The result is a comprehensive, tamper-resistant audit record that captures both application-level context and database-level change details.

### How the System Ensures Data Consistency

Transactional database operations ensure that multi-table operations either fully succeed or are fully rolled back. The singleton database connection pattern within a request ensures that all operations in a single request share one connection and can participate in the same transaction. PostgreSQL's foreign key constraints enforce referential integrity across related tables. The face biometric threshold (distance ≤ 0.5) is enforced server-side and cannot be overridden by client data.

---

## 12. Error Handling Across Application

### Input Validation Errors

Client-side form validation catches empty required fields and format violations before API submission. Server-side validation returns 400 responses with descriptive error messages in the `error` JSON field. The frontend displays these messages to the user via the React Hot Toast notification system or inline form error states.

### API Failures

API errors are caught by the Axios interceptor and by individual component error handlers. 500-level server errors are logged to the browser console. Components in error states display fallback UI or retry options. TanStack Query automatically retries failed queries once before surfacing the error to the component.

### Authentication Failures

401 responses from the API clear the stored token and profile state, triggering a redirect to the login page. 403 responses for deactivated accounts display a toast notification explaining the deactivation and redirect to the login page after a short delay.

### Authorization Failures

403 responses for insufficient permissions are caught at the component level. The frontend's route guards (`ProtectedRoute`) prevent unauthorized navigation to protected routes before API calls are even made. API-level 403 responses for feature access violations are surfaced to the component through the standard error chain.

### Network Issues

The application is built as a Progressive Web App with service worker support. When the device is offline, the `OfflinePage` component is displayed, blocking interaction and informing the user of the connectivity issue. Previously cached TanStack Query data remains available for reading while offline. When connectivity is restored, the service worker triggers a re-fetch of stale data.

### Data Conflicts

Unique constraint violations (duplicate email on employee creation, duplicate attendance punch) are caught by the database and return SQL exception messages that the backend translates to 400 or 409 responses with descriptive error messages.

### System-Level Failures

The PHP error middleware captures unhandled exceptions and returns structured 500 error responses. In development, stack traces are included in the response. In production environments, the error details should be suppressed (a known security gap identified in the system audit). Database connection failures are caught during connection establishment and return 500 responses.

### Recovery Mechanisms

Retry logic is built into TanStack Query with a single retry on failed queries. The cron job for missing checkout detection runs independently of user interaction, providing automated correction of missed check-out records. The email queue provides resilience for email delivery — if delivery fails temporarily, items remain in the queue for the next processing cycle.

---

## 13. Security Model

### Authentication Security

Passwords are hashed using bcrypt via PHP's `password_hash()` function with the `PASSWORD_DEFAULT` algorithm, providing a strong, adaptive one-way hash. Face biometric data is stored as a floating-point vector in the database, not as an image, making it non-reversible to the original facial image. JWT tokens are signed using HMAC-SHA256 with a server-side secret key. Rate limiting enforced at the IP level prevents brute-force attacks against both password and face-based authentication.

### Authorization Rules

Every API endpoint explicitly declares its access requirements. The default posture is deny — an endpoint without `AuthMiddleware` is a public endpoint only if intentionally designed as such. Role and feature access are checked independently on every request. There is no fallback role assignment for missing or invalid roles — a malformed token or missing role returns a 403 immediately.

### Role-Based Access Control

The `users.role` column in PostgreSQL is the sole authoritative source of role truth. A database-level CHECK constraint prevents invalid role values. The frontend role arrays are treated as UX hints only; backend enforcement is always authoritative. The middleware validates the role on every request by decoding the JWT (which contains the role at issuance time) and also performs an active-status re-check against the live database.

### Data Protection Mechanisms

Chat messages are encrypted at rest using AES-256-GCM with random 96-bit initialization vectors and 128-bit authentication tags, providing confidentiality and integrity. The encryption key is stored as an environment variable, not in code. SQL injection protection is achieved through universal use of PDO prepared statements with parameterized queries throughout the backend.

### Secure API Communication

CORS is strictly enforced — only the configured `FRONTEND_URL` is allowed as an origin. Non-matching origins receive a "null" access-control-allow-origin header, which browsers reject. Security headers are set on all responses: `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` with one-year max-age and subdomain inclusion, `Content-Security-Policy: default-src 'self'`, and `Referrer-Policy: strict-origin-when-cross-origin`.

### Session Management

Sessions are stateless JWT tokens stored in the browser's local storage. Token expiration is configurable by the administrator. Account deactivation takes effect immediately on the next authenticated request, regardless of the token's expiration time, because the middleware performs a live active-status check on every request.

### Input Sanitization

Dynamic column references in feature access queries are validated against a fixed whitelist of allowed column names before being interpolated into SQL, preventing column injection. Email content in templates uses `htmlspecialchars()` for user-supplied values before insertion. Activation and reset tokens are generated using `random_bytes()`, providing cryptographically secure random values.

### Known Security Considerations

Based on the security audit conducted in July 2026, the following areas require attention: JWT tokens are stored in local storage, making them vulnerable to XSS attacks — migration to HttpOnly cookies is recommended. Several components use `dangerouslySetInnerHTML` without DOMPurify sanitization, creating potential XSS vectors. CSRF token validation is not implemented for state-changing operations. Two-Factor Authentication (MFA / TOTP) with emergency single-use backup recovery codes is fully implemented, verified, and enforced during the sign-in flow.

---

## 14. File and Module Responsibility Mapping

### `backend/public/index.php`
The single entry point of the entire backend. Responsible for bootstrapping the Slim application, loading environment variables, registering all middleware in the correct order, defining the core authentication endpoints (login, face login, logout, `/me`, change password), and requiring all module-specific route files. Controls the full request lifecycle from HTTP ingress to response egress.

### `backend/public/*_routes.php` (Each Module Route File)
Each file registers all API endpoints for one functional module. Examples include `admin_employees_routes.php` for the Employee Management API, `admin_attendance_routes.php` for Attendance, `chat_routes.php` for the Chat system, and so on. These files contain the actual business logic for their module, including database queries, validation, and response formatting. They are required by `index.php` at startup.

### `backend/src/Middleware/AuthMiddleware.php`
The security gatekeeper for the entire API. Validates JWT tokens, enforces role-based access control, checks feature access flags, verifies account active status, and sets PostgreSQL session variables for audit trails. Used on every protected endpoint.

### `backend/src/Middleware/GzipMiddleware.php`
Transparently compresses JSON and text responses using gzip or deflate encoding for clients that support it. Reduces network payload sizes for large data responses.

### `backend/src/Middleware/AuditMiddleware.php`
Logs every HTTP request's method, path, and response time to the PHP error log for operational monitoring.

### `backend/src/Middleware/PerformanceLoggingMiddleware.php`
Records request performance timing for diagnostic purposes.

### `backend/src/Config/Database.php`
Implements the singleton database connection pattern. Manages a single PDO connection per PHP request lifecycle. Reads connection parameters from environment variables. Uses a custom `LoggingPDO` wrapper for enhanced query logging.

### `backend/src/Utils/ChatEncryption.php`
Provides AES-256-GCM encryption and decryption services for chat message content. Manages key loading from environment variables and handles the IV+Tag+Ciphertext payload format.

### `backend/src/Utils/RateLimiter.php`
Implements database-backed IP-level rate limiting. Checks attempt counts against configurable thresholds, records new attempts, calculates lockout remaining time, and clears attempts on successful authentication.

### `backend/src/Utils/PasswordValidator.php`
Enforces the system's password complexity policy. Used at both registration and password change endpoints.

### `backend/src/Utils/Cache.php`
Provides a simple file-based in-process caching mechanism for frequently read, infrequently changed data like global settings and assessment metadata.

### `backend/src/Utils/AssessmentConstants.php`
Stores shared constants for the assessment module, including default instructions text injected into assessment responses.

### `backend/public/performance_helpers.php`
A shared helper library providing the performance calculation logic used by both the admin and employee performance endpoints. Contains functions for building month intervals, calculating metric summaries, traversing organizational hierarchies, and normalizing attendance status values.

### `backend/cron/mark_missing_checkouts.php`
A standalone PHP script intended to be executed by a scheduled task (cron job). Scans past attendance records with check-in but no check-out and updates their status to flag the missing checkout for administrative review.

### `frontend/src/App.jsx`
Defines the entire client-side routing tree using React Router v6. Wraps all routes in the `AuthProvider` and `PersistQueryClientProvider`. Applies `ProtectedRoute` guards to all privileged paths with appropriate role arrays.

### `frontend/src/contexts/AuthContext.jsx`
The central authentication state manager for the frontend. Provides user identity, profile, loading states, and the `signIn`, `signInWithFace`, `signOut`, and `fetchProfile` methods to all components. Manages the initialization sequence and splash screen display during startup.

### `frontend/src/api/axios.js`
Configures the Axios HTTP client with the API base URL and request/response interceptors. The request interceptor injects JWT tokens. The response interceptor handles 401 and 403 responses and normalizes PostgreSQL timestamp formats.

### `frontend/src/components/ProtectedRoute.jsx`
The client-side route guard component. Validates that the authenticated user's role is in the allowed roles list for the current route. Redirects to login if unauthenticated or to the appropriate dashboard if role-unauthorized.

### `frontend/src/components/AdminLayout.jsx`, `EmployeeLayout.jsx`, `CandidateLayout.jsx`
Shell layout components for each portal. Provide the persistent navigation sidebar, header, and main content area. The navigation items in these layouts are conditionally rendered based on the user's feature access flags from the profile.

### `frontend/src/components/PayslipPDF.jsx`
Client-side PDF generation component that renders a formatted payslip document for download, using the payslip data including earnings and deductions breakdown.

### `frontend/src/components/SplashScreen.jsx`
The loading overlay displayed during the authentication initialization phase. Enforces a minimum display time of 1.2 seconds for a polished startup experience.

### `frontend/src/components/UpdateOverlay.jsx`, `MaintenanceOverlay.jsx`
System-level overlays. The Update Overlay notifies users of available application updates from the PWA service worker. The Maintenance Overlay appears system-wide when the admin has enabled maintenance mode, blocking all interaction.

### `supabase/functions/send-email/`
The Supabase Edge Function responsible for processing the email queue. Polls the `email_queue` table, delivers emails using the configured email service, and marks records as sent or logs failures.

---

## 15. Component Interaction System

### How Components Communicate

React components communicate primarily through two mechanisms. Data flows down through props from parent to child. Shared application state is accessed through React Context via the `useAuth()` hook (for authentication state) and TanStack Query's `useQuery()` and `useMutation()` hooks (for server data state). Components do not communicate laterally — they all read from and write to shared state stores.

### How Data Flows Between UI Components

Page-level components are responsible for fetching data through TanStack Query hooks. They pass the fetched data as props to presentational child components. Form components collect user input, validate it locally, and call mutation functions upon submission. The mutation success or failure triggers toast notifications and optional cache invalidations that cause dependent queries to refetch.

### State Management Approach

The application uses a two-layer state management approach. Persistent server state (API data) is managed by TanStack Query with automatic caching, background refetching, and localStorage persistence. Ephemeral UI state (form values, modal visibility, selected items) is managed through React's built-in `useState` and `useReducer` hooks within individual components. There is no global client-side state management library (such as Redux) — the combination of React Context for auth state and TanStack Query for server state handles all cross-component state needs.

### Shared Services Usage

The `api` Axios instance from `frontend/src/api/axios.js` is the universal shared service for all HTTP communication. All page components and hooks import and use this single configured instance, ensuring consistent token injection and error handling.

### Reusable Component Behavior

The `EmployeeSelect` component provides a searchable employee picker used across multiple admin forms (performance analysis, payroll generation, assessment assignment, asset management). The `GlobalSearch` component provides a cross-module search capability from the admin navigation. The `AddEmployeeModal` is shared across employee management workflows. The `PageLoader` provides a consistent loading state UI. The `PullToRefresh` component adds mobile pull-to-refresh gestures to mobile pages.

### Cross-Module Communication

Cross-module interactions happen at the data level rather than the component level. When an administrator approves a leave, the attendance and leave modules share the resulting database changes on next fetch. TanStack Query's cache invalidation mechanism ensures that after a mutation in one module, dependent queries in related modules are marked as stale and refetch their data on next access, keeping all views consistent without explicit component communication.

---

## 16. Complete System Execution Flow

The complete system execution flow begins the moment a user opens the application in their browser. The Vite-built JavaScript bundle is delivered to the browser, and the React runtime initializes. The root `App` component renders, instantiating the `PersistQueryClientProvider` which loads any previously cached server data from local storage into memory. The React Router initializes and reads the current URL path. The `AuthProvider` begins its initialization sequence.

The `AuthProvider` checks whether the current path is a public route. If not, or if a token exists in local storage, it calls the `/api/me` endpoint. This call reaches the PHP backend, passes through the middleware stack (GZIP, PerformanceLogging, Audit, CORS), is handled by the `/api/me` route handler with `AuthMiddleware` protection, which validates the JWT, performs a live active-status database check, sets PostgreSQL session variables, and allows the handler to execute. The handler queries the users and employee tables to build the full profile, including feature access flags and news headlines, and returns the profile JSON. The response passes back through the GZIP middleware for compression.

Back on the frontend, the `AuthProvider` receives the profile and stores it in React state. After the minimum splash screen duration, the loading state is cleared and the application's actual content renders. The `ProtectedRoute` components in the router tree evaluate the user's role against the route requirements. The correct portal layout (Admin, Employee, or Candidate) renders with its navigation sidebar. The navigation items are filtered based on the user's feature access flags.

A page-level component mounts. TanStack Query's `useQuery` hook fires for the initial data fetch specific to that page. The request passes through the Axios interceptor, which injects the JWT token into the Authorization header. The API call reaches the backend, is processed through the middleware chain, authenticated, authorized, and the route handler executes its database queries. The database returns data through the PDO connection. The handler formats the response JSON, which passes through the GZIP middleware and is delivered to the frontend. The Axios response interceptor normalizes timestamps. TanStack Query stores the response in its in-memory cache and persists it to local storage. The React component re-renders with the fetched data.

The user interacts with the page — form submissions, button clicks, or search input trigger mutations or new queries. Mutations call the API, receive confirmation, and TanStack Query invalidates related cached queries, causing background refetches for affected data. Toast notifications confirm success or communicate errors.

Throughout the session, the `AuthProvider`'s profile is updated on each explicit `fetchProfile` call (such as after a profile edit). If any API call returns a 401, the Axios interceptor signals the `AuthContext`, which clears the session and redirects to login.

When the user logs out, `AuthContext.signOut()` is called. It posts to `/api/logout`, removes the token from local storage, clears the TanStack Query cache entirely, resets the profile state, and the `ProtectedRoute` guards immediately redirect the user to the login page, completing the full session lifecycle.

---

## 17. Final Summary of System Architecture

Acme HRMS is a full-featured, enterprise-grade Human Resource Management System that provides a unified platform for managing the complete employee lifecycle, from recruitment through daily operations to organizational analysis. The system serves three distinct user groups — administrators, employees, and job candidates — each through a dedicated portal with role-appropriate functionality.

The architecture follows a clean separation between presentation, logic, and data tiers. The React frontend provides a highly responsive, mobile-capable single-page application with offline awareness and intelligent caching. The PHP Slim backend provides a stateless RESTful API with consistent security enforcement at every endpoint. PostgreSQL provides robust relational data storage with advanced capabilities including vector similarity search for biometric authentication.

Key data flow principles are: all data mutations flow through validated, authorized API endpoints; all sensitive operations are wrapped in database transactions; all user communications flow through a resilient email queue; all user identity claims are re-validated on every request against the live database; and all significant data changes are captured in an immutable audit log.

The business workflow structure mirrors real-world HR operations. Leave management enforces organizational policies like the sandwich rule automatically. Attendance integrates with shift definitions, geo-fencing, and biometric verification. Payroll generates structured financial records. Performance analytics derive from actual attendance data. Recruitment pipelines move candidates through structured stages with automated communications.

From a maintainability perspective, the codebase follows consistent patterns throughout: one route file per module, one middleware class per concern, one context per state domain, one shared HTTP client, and one source of truth for roles and permissions. New modules can be added by creating a new route file and requiring it in `index.php`, following the established patterns.

From a scalability perspective, the system's stateless API design means additional backend instances can be added without session coordination. TanStack Query's caching layer reduces repeated API calls significantly. GZIP compression on all JSON responses reduces bandwidth consumption. Database-level caching for frequently read settings reduces per-request database load. The use of Supabase for file storage and email processing offloads I/O-intensive operations to specialized managed services.

---

*End of Documentation*

*This document was generated from direct analysis of the Acme HRMS source code (frontend and backend) as of August 2026. It reflects the actual implemented system behavior and does not contain assumptions beyond what is present in the codebase.*
