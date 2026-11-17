<div align="center">
  <img src="frontend/public/favicon.png" alt="Acme HRMS application icon" width="78" />

  # ACME HRMS

  **Human resources, workforce attendance, recruitment and branch-origination workflows in one application.**

  A React web client, PHP/Slim API, Supabase-backed data services and a Capacitor Android client.

  [![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](frontend/package.json)
  [![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](frontend/package.json)
  [![PHP 8.2 container](https://img.shields.io/badge/PHP_container-8.2-777BB4?logo=php&logoColor=white)](Dockerfile)
  [![Slim 4](https://img.shields.io/badge/Slim-4-59666C)](backend/composer.json)
  [![Capacitor 8](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)](frontend/package.json)

  [**Workspaces**](#workspaces) · [**Architecture**](#architecture) · [**Getting started**](#getting-started) · [**Android**](#android-app) · [**Security**](#security-and-operations) · [**Deployment**](#deployment-and-maintenance)
</div>

---

> [!NOTE]
> **About this project:** This README describes functionality visible in the repository source code. Availability of any feature depends on the configured backend, database, permissions, native platform and external services. Review deployment configuration and run application tests before enabling real-user access.

## What this repository contains

Acme HRMS is a multi-workspace application for company administrators, employees, HR/managers, applicants and operational teams. The primary browser experience is a React single-page application. The backend implements authentication, authorization, domain APIs, database access and protected file operations in PHP. The Android application uses Capacitor and a native location-tracking service.

| Layer | Implementation | Where to inspect |
| --- | --- | --- |
| Web UI | React 19, React Router 7, Vite 8, Tailwind CSS 4, TanStack Query 5, Axios | [`frontend/package.json`](frontend/package.json), [`frontend/src/App.jsx`](frontend/src/App.jsx) |
| API | PHP 8.2 in Docker, Slim 4, Composer, JWT authentication and route middleware | [`Dockerfile`](Dockerfile), [`backend/composer.json`](backend/composer.json), [`backend/public/index.php`](backend/public/index.php) |
| Data | PostgreSQL hosted through Supabase; versioned SQL migrations | [`backend/src/Config/Database.php`](backend/src/Config/Database.php), [`supabase/migrations`](supabase/migrations) |
| Private files | Supabase Storage accessed through authenticated PHP upload, deletion and file-proxy endpoints | [`backend/public/storage_routes.php`](backend/public/storage_routes.php), [`frontend/src/lib/supabase.js`](frontend/src/lib/supabase.js) |
| Email | Database-backed email queue and a guarded Supabase Edge Function using Nodemailer | [`supabase/functions/send-email`](supabase/functions/send-email), [`backend/src/Security/EmailSecurity.php`](backend/src/Security/EmailSecurity.php) |
| Android | Capacitor 8, Java native foreground location service, protected native session storage | [`frontend/capacitor.config.json`](frontend/capacitor.config.json), [`LocationTrackerService.java`](frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java) |
| Hosting / CI | Docker image with Apache, Render configuration and GitHub Actions security checks | [`render.yaml`](render.yaml), [`.github/workflows`](.github/workflows) |

## Workspaces

These are **implemented routes and backend capabilities**, not an assertion that every workflow is ready for unrestricted production use.

| Workspace | Code-backed capabilities | Entry points |
| --- | --- | --- |
| **Administration** | Dashboard, employee directory and settings, attendance/geofences/shifts, leave approvals, payroll, expenses, assets, holidays, performance, audit logs, reports, feature access, recruitment, assessments and training | [Admin routes](frontend/src/App.jsx), [PHP admin modules](backend/public/admin_employees_routes.php) |
| **Employees / HR / managers** | Employee dashboard, attendance, profile, leave, expenses, payroll, performance, assessment sessions, assigned training and birthdays; selected admin-layout features are permission-gated | [Employee routes](frontend/src/App.jsx), [employee API](backend/public/employee_attendance_routes.php) |
| **Candidates** | Account activation and login, job browsing, application tracking, document submission and secure download of a linked offer letter | [Candidate pages](frontend/src/pages/CandidateApplications.jsx), [candidate API](backend/public/candidate_recruitment_routes.php) |
| **Loan origination** | Leads, member lookup, loan applications, associated documents, statuses and activities with server-side access restrictions | [Loan routes](backend/public/origination_loans_application_routes.php), [access rules](backend/src/Security/OriginationAccess.php) |
| **Sales origination & branch operations** | Sales leads and activities; branch dashboards, lead views, application review, seen-status and authorized updates | [Sales API](backend/public/origination_sales_leads_routes.php), [branch API](backend/public/branch_operations_application_routes.php) |

The web UI includes desktop and mobile layouts. It also contains employee/admin chatbot endpoints; the optional external Gemini path is restricted to predefined, non-personal FAQ prompts rather than arbitrary HR records ([policy](backend/public/sec004_gemini_security.php)).

## Architecture

```mermaid
flowchart TB
  subgraph Clients["Clients"]
    WEB["React + Vite web app"]
    AND["Capacitor Android app<br/>hosted web view + native tracking"]
  end
  API["PHP 8.2 / Slim 4 API<br/>JWT, role + feature checks, business rules"]
  DB[("Supabase PostgreSQL")]
  STORE[("Private Supabase Storage")]
  EDGE["Supabase Edge email webhook"]
  SMTP["Configured SMTP delivery"]
  MAPS["Google Maps / Geocoding"]

  AND -->|"HTTPS-hosted UI and API"| WEB
  WEB -->|"/api and authenticated file routes"| API
  API -->|"PDO"| DB
  API -->|"server-authorized file operations"| STORE
  DB -->|"email_queue webhook (when configured)"| EDGE
  EDGE --> SMTP
  WEB -->|"restricted browser Maps key"| MAPS
  API -->|"server Geocoding key"| MAPS
```

**Important implementation details**

- **Authentication authority:** HRMS uses its **PHP-issued JWT and database identity**, not a browser Supabase Auth session. The frontend's Storage adapter calls backend routes rather than issuing anonymous direct Storage writes.
- **Access control:** Protected APIs use role, feature and record/branch checks on the server. Frontend route guards are only an additional UI gate.
- **Sessions:** Normal access tokens are bounded; refresh sessions rotate. Web refresh uses a restricted HttpOnly cookie, while Android uses native secure session storage.
- **Attendance:** Geofence rules apply server-side to configured check-in/check-out cases. Android interval/location punches are a separate roaming tracking workflow.
- **Email:** Recruitment notification types and templates are server-controlled. The Edge endpoint is intended for database webhook delivery, not direct public mailing.
- **Maintenance:** A server-side maintenance middleware restricts protected APIs for non-admin sessions while preserving configured admin recovery paths.

Source: [auth middleware](backend/src/Middleware/AuthMiddleware.php) · [session utilities](backend/src/Utils/RefreshSessions.php) · [geofence policy](backend/src/Security/AttendanceGeofence.php) · [maintenance middleware](backend/src/Middleware/MaintenanceMiddleware.php).

## Repository layout

```text
HRMS/
├── .github/workflows/    # Security, Android and regression CI workflows
├── backend/
│   ├── public/           # Slim entry point, API routes and Apache rewrites
│   └── src/              # Middleware, security helpers, templates, utilities
├── frontend/
│   ├── android/          # Capacitor Android native project and Java tracker
│   ├── public/           # App icons, static assets and Android release files
│   └── src/              # React pages, components, API client and services
├── scripts/              # Restricted, purpose-built maintenance utilities
├── supabase/
│   ├── functions/        # Guarded send-email Edge Function
│   ├── migrations/       # Versioned database changes
│   └── review-only/      # Security review SQL; not normal app startup
├── tests/                # Focused security and regression test fixtures
├── Dockerfile
├── docker-entrypoint.sh
├── render.yaml
└── README.md
```

## Getting started

### Prerequisites

- **Docker** for the closest match to the repository's container build; or **Node.js 20+**, npm, **PHP with PDO PostgreSQL / cURL extensions**, and Composer for split frontend/backend development. The published container uses Node 20 to build assets and PHP 8.2 with Apache.
- An **existing, appropriately provisioned PostgreSQL/Supabase environment** (schema, migration state, Storage buckets/policies, and development accounts). The repository contains migrations, **not a complete empty-database bootstrap**.
- Your own server credentials and, for optional integrations, correctly restricted Google API keys and email delivery configuration.

> [!CAUTION]
> Use a dedicated development database and test accounts. Do not run reset scripts, apply migrations, purge Storage or change production security settings just to bring up a local instance. Never commit real `.env` files, signing keys or credentials.

### Option A — Docker (recommended for an integrated local preview)

1. Clone the repository.
2. Create a **local, untracked** `.env` in the project root using your development environment's credentials (see [configuration](#configuration)).
3. From the repository root:

```bash
git clone https://github.com/Kondapaneni/HRMS.git
cd HRMS
docker build -t acme-hrms .
docker run --rm --env-file .env -p 8080:80 acme-hrms
```

Open [http://localhost:8080](http://localhost:8080). The multi-stage [Dockerfile](Dockerfile) builds the React assets and serves the SPA and API together through Apache. It does **not** create the database, accounts or Supabase resources.

### Option B — Separate development servers

The Vite development proxy sends `/api` and protected file paths to `http://127.0.0.1:8080` ([config](frontend/vite.config.js)). For this workflow, create an **untracked `backend/.env`** with the applicable backend variables.

**Terminal 1 — API**

```bash
cd backend
composer install
php -S 127.0.0.1:8080 -t public public/index.php
```

**Terminal 2 — React**

```bash
cd frontend
npm ci
npm run dev
```

Open the local Vite URL printed in the terminal. PHP's built-in server is for development; Apache-specific response headers and rewrite behavior should be checked in the Docker deployment.

For a standalone web build:

```bash
cd frontend
npm ci
npm run build
npm run preview
```

A Vite preview of static assets does **not** provision or start the PHP API. Authentication and real business functionality require the backend and database.

## Configuration

The backend reads environment values via [phpdotenv](backend/public/index.php); [`docker-entrypoint.sh`](docker-entrypoint.sh) creates the container's runtime `.env` from available OS environment variables when needed. [`render.yaml`](render.yaml) declares a subset of required deployment secrets. These are **variable names only**, never real values.

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection used by PHP |
| `JWT_SECRET` | Server-side access-token signing secret |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Backend Storage integration; secret key **must remain server-side** |
| `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` | Frontend origin and approved cross-origin requests |
| `GOOGLE_MAPS_BROWSER_API_KEY` | Separately restricted browser Maps JavaScript key, returned only by an authenticated config endpoint |
| `GOOGLE_GEOCODING_API_KEY` | Server-side geocoding; keep separate from the browser key |
| `GOOGLE_MAPS_API_KEY` | Legacy server-side Maps configuration where still required |
| `DB_PDO_PREPARE_MODE`, `SEC018_NATIVE_SESSION_ENABLED` | Database prepare/session-pooler compatibility controls; do not change without validating the target connection |
| `SEC018_DB_USE_RESTRICTED`, `SEC018_DB_USERNAME`, `SEC018_DB_PASSWORD` | Optional restricted database identity |
| `VITE_API_URL` / `VITE_BACKEND_URL` | Frontend API endpoint configuration where applicable; Vite uses `/api` by default on the web |

Additional mailer / integration settings may be needed for a working deployment; inspect the relevant [Edge Function](supabase/functions/send-email/index.ts) and application configuration rather than guessing credentials.

**Safeguards:** Keep `SUPABASE_SECRET_KEY`, `JWT_SECRET`, database passwords and Android signing secrets out of any `VITE_`-prefixed frontend variable, Git commits, screenshots and build logs. Change database prepare mode or connection pooling settings only after testing the target connection and a rollback plan; see the [database adapter](backend/src/Config/Database.php).

## API overview

The backend entry point is [`backend/public/index.php`](backend/public/index.php) and registers the per-workspace route modules under [`backend/public/`](backend/public). Representative existing endpoints:

| Purpose | Examples |
| --- | --- |
| Authentication and recovery | `POST /api/login`, `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/auth/mfa/verify`, `POST /api/auth/refresh`, `POST /api/logout` |
| Current session | `GET /api/me`, `PUT /api/change-password` |
| Employee attendance | `GET /api/employee/attendance`, `POST /api/employee/attendance/punch` |
| Administration | `GET /api/admin/dashboard/stats`, `GET /api/admin/employees`, `POST /api/admin/feature-access`, `GET /api/admin/reports/payroll` |
| Recruitment / candidate | `GET /api/admin/jobs`, `POST /api/candidate/activate`, `GET /api/candidate/applications` |
| Origination | `GET /api/loans/applications`, `GET /api/branch-operations/applications`, sales/lead and activity routes |
| Protected files | `POST /api/storage/upload`, `DELETE /api/storage/object`, and guarded `/Offer-Letter/`, `/Resume/` and other file proxy routes |
| Status / web assets | `GET /api/news`, `GET /version.json` |

**Authorization varies per endpoint**. A valid login does not grant automatic Admin, payroll, cross-branch or candidate-document access. The frontend's route visibility is not a substitute for backend authorization.

## Android app

The Android project lives under [`frontend/android/`](frontend/android); [Capacitor configuration](frontend/capacitor.config.json) points the native WebView at a configured HTTPS-hosted HRMS URL. It is **not an independently bundled offline server**.

- Attendance background updates use a Java **foreground location service** with notification, location and battery-permission handling ([service](frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java), [plugin](frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerPlugin.java)).
- The recurring tracking interval comes from application settings, with a **15-minute fallback** in the client; individual testing may temporarily use shorter intervals. The service is intended to operate during an active check-in and stop after checkout, subject to Android permissions and OS behavior.
- Native refresh credentials are transferred into Keystore-backed handling ([native session adapter](frontend/src/api/nativeSession.js)); the browser uses a different refresh-cookie path.
- `npm run cap:sync` builds and syncs the web assets to the Android project; `npm run cap:open` opens Android Studio. The `cap:apk` npm script invokes `gradlew.bat` and is Windows-oriented.
- [Android CI](.github/workflows/sec006.yml) builds test artifacts; public employee-profile APK download is gated by a **verified signed release manifest** in `frontend/public/downloads/android-release.json`. Do not assume that any local debug APK is a valid in-place upgrade.

```bash
cd frontend
npm ci
npm run cap:sync
npm run cap:open
```

Releasing an APK with a different signing certificate can require a coordinated uninstall/reinstall migration. The signed release and publishing rules are implemented in the [Android GitHub Actions workflow](.github/workflows/sec006.yml) and the [employee profile download UI](frontend/src/pages/EmployeeMobileProfile.jsx). Never share signing keys or distribute an unsigned/debug APK as a production release.

## Quality checks and change control

The repository contains source, HTTP, PostgreSQL fixture, frontend and Android regression tests under [`tests/`](tests), run by the [GitHub Actions workflows](.github/workflows). Several tests expect disposable databases or fixtures and must never be directed at real HRMS records.

For a basic local source check:

```bash
# Frontend
cd frontend
npm ci
npm run build
npm run lint

# Backend (from the repository root, with PHP installed)
cd ..
php -l backend/public/index.php
```

These commands are available in the project; they do not imply that every CI workflow has been executed or passed in your local environment. Follow the individual workflow configuration before running database-dependent or Android-specific tests. Review and test source changes before merging them; protect signing credentials and published commit history.

## Security and operations

Application security is enforced primarily in the PHP backend and native Android integration. The repository currently implements:

- **Authentication and MFA:** signed access JWTs, email OTP and TOTP challenge flows, bounded access-token lifetime and rotating refresh credentials ([authentication](backend/public/index.php), [MFA routes](backend/public/mfa_routes.php), [session handling](backend/src/Utils/RefreshSessions.php)).
- **Role and record authorization:** explicit allowed roles, feature grants and ownership/branch checks for protected APIs ([middleware](backend/src/Middleware/AuthMiddleware.php), [origination access policy](backend/src/Security/OriginationAccess.php)).
- **Protected storage:** authenticated backend upload/deletion and guarded file-download routes rather than open client-side Storage writes ([storage routes](backend/public/storage_routes.php)).
- **Attendance validation:** server-side geofence handling for configured check-in/check-out flows; Android interval punches have a separate policy ([geofence module](backend/src/Security/AttendanceGeofence.php)).
- **Maintenance and browser protections:** server-side maintenance gating and configured HTTP/CORS protections ([maintenance middleware](backend/src/Middleware/MaintenanceMiddleware.php), [Apache headers](backend/public/.htaccess)).

These are descriptions of implemented controls, **not a claim that the application has passed every security or release requirement**. Validate your environment, permissions, HTTPS, secret rotation, backup/restore procedures and operational monitoring before a real-user rollout. Report potential security issues privately without posting credentials or personal information.

## Deployment and maintenance

- [`render.yaml`](render.yaml) declares a Docker-backed Render web service tracking `main`. The [Dockerfile](Dockerfile) builds frontend assets with Node and runs PHP 8.2/Apache for the API and SPA.
- The [Capacitor config](frontend/capacitor.config.json) and [email-link helper](backend/src/Security/EmailSecurity.php) refer to `https://hrms-qwv3.onrender.com`. That is a **configured host**, not independently verified availability or production clearance.
- Database changes live in [`supabase/migrations/`](supabase/migrations); approval, backups, migration history verification and target-environment selection are deployment responsibilities.
- React emits a version file ([Vite config](frontend/vite.config.js)), while maintenance is enforced server-side for protected API calls ([middleware](backend/src/Middleware/MaintenanceMiddleware.php)).

## Source and maintenance notes

For implementation details, follow the linked [frontend application](frontend/src/App.jsx), [backend API](backend/public/index.php), [database migrations](supabase/migrations), [deployment configuration](render.yaml) and [CI workflows](.github/workflows).

**Source review:** This README was checked against repository commit [`4df0af4`](https://github.com/Kondapaneni/HRMS/commit/4df0af4d16232fdc65b6038263b25494d38ebad4) on **2026-11-17**. Deployed behavior may differ from code until the appropriate configuration and release are applied. No `LICENSE` file was present in that reviewed tree; confirm redistribution terms with the maintainer.
