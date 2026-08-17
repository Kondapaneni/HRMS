<div align="center">

# 🏢 ACME HRMS

### *Enterprise-Grade Human Resource Management System*

[![Built with React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![PHP Backend](https://img.shields.io/badge/Backend-PHP_8.2-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://php.net)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Supabase](https://img.shields.io/badge/BaaS-Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Render](https://img.shields.io/badge/Hosted_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

<br/>

[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)
[![GitHub repo size](https://img.shields.io/github/repo-size/Kondapaneni/HRMS?style=flat-square&color=blue)](https://github.com/Kondapaneni/HRMS)
[![GitHub last commit](https://img.shields.io/github/last-commit/Kondapaneni/HRMS?style=flat-square&color=green)](https://github.com/Kondapaneni/HRMS/commits/main)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Kondapaneni/HRMS?style=flat-square&color=orange)](https://github.com/Kondapaneni/HRMS/commits/main)

<br/>

> **A full-stack, production-ready HRMS platform powering employee management, payroll, attendance with face recognition, loan origination, branch operations, recruitment, and more — with dedicated mobile-first experiences for every module.**

<br/>

[🚀 Live Demo](#-deployment) · [📖 Documentation](#-api-modules) · [⚡ Quick Start](#-quick-start) · [🐳 Docker](#-docker-deployment)

</div>

---

<br/>

## 📊 Platform at a Glance

<div align="center">

| 📈 Metric | Value |
|:---|:---|
| 🗂️ **Total Pages** | 99+ React Components |
| 🔌 **API Routes** | 34 PHP Route Files |
| 🧩 **Modules** | 5 Major Workspaces |
| 📱 **Mobile Views** | Dedicated for Every Module |
| 🔐 **Auth** | JWT + Supabase + Face Recognition |
| ☁️ **Deployment** | Dockerized on Render |

</div>

<br/>

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              React 19 + Vite 8 + TailwindCSS 4              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │    │
│  │  │  Admin   │ │ Employee │ │Candidate │ │  Branch Ops  │   │    │
│  │  │  Portal  │ │  Portal  │ │  Portal  │ │   & Loans    │   │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │    │
│  │       │             │            │              │           │    │
│  │  ┌────┴─────────────┴────────────┴──────────────┴───────┐   │    │
│  │  │         TanStack React Query (Offline Cache)         │   │    │
│  │  └──────────────────────┬───────────────────────────────┘   │    │
│  └─────────────────────────┼───────────────────────────────────┘    │
│                            │ Axios HTTP                             │
├────────────────────────────┼────────────────────────────────────────┤
│                     API GATEWAY LAYER                               │
│  ┌─────────────────────────┴───────────────────────────────────┐    │
│  │              Slim Framework 4 (PHP 8.2 / Apache)            │    │
│  │  ┌──────────┐ ┌─────────────┐ ┌──────────────────────┐     │    │
│  │  │   JWT    │ │   CORS &    │ │   Route Middleware   │     │    │
│  │  │  Auth    │ │  Security   │ │   & Validation       │     │    │
│  │  └────┬─────┘ └──────┬──────┘ └──────────┬───────────┘     │    │
│  │       └──────────────┬┘                   │                 │    │
│  │              ┌───────┴───────────────────┐│                 │    │
│  │              │    34 Route Controllers   ││                 │    │
│  │              └───────────────────────────┘│                 │    │
│  └──────────────────────┬────────────────────┘                 │    │
├─────────────────────────┼──────────────────────────────────────────┤
│                   DATA & SERVICES LAYER                             │
│  ┌──────────┐  ┌────────┴────────┐  ┌──────────────────────┐       │
│  │ Supabase │  │   PostgreSQL    │  │   Google Maps API    │       │
│  │   Auth   │  │   (Supabase)    │  │   & Geocoding API    │       │
│  └──────────┘  └─────────────────┘  └──────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

<br/>

---

## ⚡ Feature Breakdown

### 👤 Employee Workspace

<table>
<tr>
<td width="50%">

#### 📊 Smart Dashboard
- Personalized stats & notifications
- Birthday & holiday widgets
- Live company news ticker
- Quick-action shortcuts

#### ⏰ Attendance System
- **GPS-based** check-in/check-out
- **Face recognition** via webcam
- Interactive map view with location pins
- Attendance calendar & history

#### 📝 Leave Management
- Apply for leaves with category selection
- Real-time approval status tracking
- Leave balance dashboard
- Mobile-optimized application form

</td>
<td width="50%">

#### 💰 Payroll & Expenses
- Detailed salary breakdown view
- Downloadable PDF payslips
- Expense claim submission with receipts
- Monthly payment history

#### 🎯 Performance & Assessments
- Performance review dashboards
- Timed skill assessments with anti-cheat
- Question randomization engine
- Instant result & score cards

#### 👤 Profile & Training
- Comprehensive profile management
- Document upload & verification
- Training video library access
- Password & security settings

</td>
</tr>
</table>

---

### 🔧 Admin Control Center

<table>
<tr>
<td width="50%">

#### 👥 Employee Management
- Full employee directory with search & filters
- Add, edit, view employee profiles
- Role & feature access control per employee
- Document verification workflows

#### 📅 Attendance & Leaves
- Organization-wide attendance monitoring
- Configurable attendance rules & locations
- Leave approval/rejection workflows
- Attendance regularization handling

#### 💳 Payroll Processing
- Individual & bulk payroll processing
- Salary component configuration
- Payslip generation & distribution
- Payment history & audit trail

</td>
<td width="50%">

#### 🎯 Recruitment Pipeline
- End-to-end recruitment management
- Job posting & candidate tracking
- Interview scheduling & evaluation
- Candidate portal with self-service

#### 📊 Analytics & Compliance
- Organization-wide dashboard analytics
- Complete audit log system
- Holiday calendar management
- Email template configuration

#### 🏢 Asset & Training
- Company asset tracking & assignment
- Training video management
- Performance review administration
- Assessment creation with question banks

</td>
</tr>
</table>

---

### 🏦 Loan Origination Module

<table>
<tr>
<td width="50%">

#### 📋 Lead Management
- Capture & categorize loan leads
- Lead status pipeline tracking
- Mobile lead entry form
- Lead-to-application conversion

#### 📄 Loan Applications
- Personal & Business loan forms
- Multi-step application workflows
- Document collection & verification
- Application status tracking

</td>
<td width="50%">

#### 👥 Member Directory
- Loan applicant profile management
- Member detail views with loan history
- Mobile-optimized member browsing
- Quick search & filtering

#### 📊 Origination Dashboard
- Pipeline analytics & conversion rates
- Application status distribution
- Team performance metrics
- Real-time KPI tracking

</td>
</tr>
</table>

---

### 🏗️ Branch Operations Module

<table>
<tr>
<td width="50%">

#### 📊 Branch Dashboard
- Branch-level loan analytics
- Real-time application metrics
- Performance KPIs per branch
- Status distribution overview

</td>
<td width="50%">

#### 📋 Loan Application Management
- View & edit branch applications
- Detailed application view with documents
- Audit logging for all operations
- Batch-optimized data loading (N+1 eliminated)

</td>
</tr>
</table>

---

### 🎯 Candidate Portal

<table>
<tr>
<td width="50%">

#### 🏠 Candidate Dashboard
- Application status overview
- Upcoming interview notifications
- Document upload reminders
- Profile completion tracker

</td>
<td width="50%">

#### 💼 Job & Application Management
- Browse open positions with filters
- One-click job application
- Track application progress
- Upload required documents

</td>
</tr>
</table>

---

### 📱 Mobile Experience

> Every single module has a **dedicated mobile-optimized** counterpart — not just responsive, but purpose-built for touch interactions.

<div align="center">

| Feature | Description |
|:---|:---|
| 🧊 **Liquid Glass Navigation** | iOS-inspired frosted glass bottom navigation bar |
| 👆 **Swipe Gestures** | Swipe between navigation tabs |
| 📐 **Orientation Detection** | Landscape warning with animated phone rotation |
| ⚡ **Offline Support** | TanStack Query persistence for offline-first experience |
| 🎭 **Framer Motion** | Smooth page transitions and micro-animations |
| 📷 **Camera Integration** | Native camera access for face recognition attendance |
| 🗺️ **GPS & Maps** | Real-time location tracking with Google Maps |

</div>

<br/>

---

## 🛠️ Tech Stack Deep Dive

<div align="center">

### Frontend

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7.17-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.x-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.x-0055FF?style=flat-square&logo=framer&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-3.8-22B5BF?style=flat-square)
![Axios](https://img.shields.io/badge/Axios-1.17-5A29E4?style=flat-square&logo=axios&logoColor=white)

### Backend

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?style=flat-square&logo=php&logoColor=white)
![Slim](https://img.shields.io/badge/Slim_Framework-4.x-74A045?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Apache](https://img.shields.io/badge/Apache-2.4-D22128?style=flat-square&logo=apache&logoColor=white)

### Infrastructure & Services

![Docker](https://img.shields.io/badge/Docker-Multi_Stage-2496ED?style=flat-square&logo=docker&logoColor=white)
![Render](https://img.shields.io/badge/Render-Cloud-46E3B7?style=flat-square&logo=render&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-BaaS-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Google Maps](https://img.shields.io/badge/Google_Maps-API-4285F4?style=flat-square&logo=googlemaps&logoColor=white)

</div>

<br/>

---

## 📁 Project Structure

```
📦 Acme HRMS
├── 🎨 frontend/                          # React Single Page Application
│   ├── src/
│   │   ├── api/                          # Axios instance & interceptors
│   │   ├── components/                   # Shared UI components
│   │   │   ├── forms/                    # Dynamic loan application forms
│   │   │   ├── AdminLayout.jsx           # Admin shell with sidebar
│   │   │   ├── EmployeeLayout.jsx        # Employee shell with navigation
│   │   │   ├── BranchOperationsLayout.jsx # Branch ops shell
│   │   │   ├── OriginationLayout.jsx     # Loan origination shell
│   │   │   └── CandidateLayout.jsx       # Candidate portal shell
│   │   ├── contexts/                     # Auth & global state providers
│   │   ├── pages/                        # 99+ page components
│   │   │   ├── Admin*.jsx                # Admin portal pages (25+)
│   │   │   ├── Employee*.jsx             # Employee portal pages (20+)
│   │   │   ├── BranchOperations*.jsx     # Branch operations pages (7)
│   │   │   ├── Origination*.jsx          # Loan origination pages (14)
│   │   │   ├── Candidate*.jsx            # Candidate portal pages (10)
│   │   │   └── Assessment*.jsx           # Assessment engine pages (4)
│   │   ├── services/                     # API service layer
│   │   └── App.jsx                       # Root routing & providers
│   ├── package.json                      # Dependencies & scripts
│   └── vite.config.js                    # Build configuration
│
├── ⚙️ backend/                            # PHP REST API
│   ├── public/                           # Apache document root
│   │   ├── index.php                     # Slim app bootstrap & middleware
│   │   ├── admin_*_routes.php            # 16 admin route files
│   │   ├── employee_*_routes.php         # 8 employee route files
│   │   ├── origination_*_routes.php      # 4 origination route files
│   │   ├── branch_operations_*_routes.php # 2 branch ops route files
│   │   └── candidate_*_routes.php        # 2 candidate route files
│   ├── src/
│   │   ├── Config/Database.php           # PDO connection manager
│   │   └── Middleware/AuthMiddleware.php  # JWT authentication guard
│   ├── cron/                             # Scheduled background tasks
│   ├── scripts/                          # Database & utility scripts
│   └── composer.json                     # PHP dependencies
│
├── 🐳 Dockerfile                          # Multi-stage production build
├── 🚀 docker-entrypoint.sh                # Container env injection
├── ☁️ render.yaml                          # Render deployment blueprint
└── 📖 SYSTEM_DOCUMENTATION.md             # 118KB detailed documentation
```

<br/>

---

## 🔌 API Modules

<div align="center">

| Module | Routes | Endpoints | Description |
|:---|:---:|:---:|:---|
| 🔧 **Admin Dashboard** | 1 | 5+ | Org-wide analytics & stats |
| 👥 **Admin Employees** | 1 | 10+ | CRUD, search, directory |
| ⏰ **Admin Attendance** | 1 | 15+ | Config, locations, regularize |
| 📝 **Admin Leaves** | 1 | 8+ | Policies, approvals, balance |
| 💳 **Admin Payroll** | 1 | 10+ | Processing, payslips, bulk |
| 🎯 **Admin Recruitment** | 1 | 12+ | Jobs, candidates, pipeline |
| 📊 **Admin Performance** | 1 | 6+ | Reviews, ratings, reports |
| 🎓 **Admin Assessments** | 1 | 8+ | Create, manage, results |
| 📅 **Admin Holidays** | 1 | 5+ | Calendar CRUD, archives |
| 💰 **Admin Expenses** | 1 | 4+ | Review, approve, reject |
| 🏢 **Admin Assets** | 1 | 6+ | Track, assign, manage |
| 🎬 **Admin Training** | 1 | 4+ | Video management |
| 📧 **Admin Email** | 1 | 3+ | Template configuration |
| 🔍 **Admin Audit** | 1 | 3+ | Activity logs & trails |
| ⚙️ **Admin Settings** | 1 | 5+ | System configuration |
| 🔐 **Admin Feature Access** | 1 | 3+ | Role-based permissions |
| 👤 **Employee Profile** | 1 | 8+ | Profile, avatar, documents |
| ⏰ **Employee Attendance** | 1 | 6+ | Check-in/out, history |
| 📝 **Employee Leave** | 1 | 5+ | Apply, cancel, balance |
| 💳 **Employee Payroll** | 1 | 3+ | View payslips, history |
| 💰 **Employee Expenses** | 1 | 4+ | Submit, track claims |
| 📊 **Employee Performance** | 1 | 4+ | View reviews, ratings |
| 🎓 **Employee Assessments** | 1 | 6+ | Take, submit, results |
| 🎬 **Employee Training** | 1 | 2+ | Watch training content |
| 🏦 **Origination Dashboard** | 1 | 4+ | Pipeline analytics |
| 📋 **Origination Leads** | 1 | 6+ | Lead CRUD, conversion |
| 📄 **Origination Loans** | 1 | 8+ | Application processing |
| 👥 **Origination Members** | 1 | 5+ | Member management |
| 🏗️ **Branch Ops Dashboard** | 1 | 4+ | Branch analytics |
| 📋 **Branch Ops Applications** | 1 | 6+ | Loan app management |
| 🔐 **Candidate Auth** | 1 | 4+ | Login, register, activate |
| 💼 **Candidate Recruitment** | 1 | 8+ | Jobs, apply, documents |

</div>

<br/>

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|:---|:---|:---|
| Node.js | ≥ 20.x | Frontend runtime |
| PHP | ≥ 8.0 | Backend runtime |
| Composer | Latest | PHP dependency manager |
| PostgreSQL | ≥ 15 | Database (or use Supabase) |

### 1️⃣ Clone

```bash
git clone https://github.com/Kondapaneni/HRMS.git
cd HRMS
```

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8080
```

```bash
npm run dev
# → http://localhost:5173
```

### 3️⃣ Backend Setup

```bash
cd backend
composer install
```

Create `backend/.env`:

```env
DB_HOST=your_db_host
DB_PORT=5432
DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
GOOGLE_GEOCODING_API_KEY=your_geocoding_key
FRONTEND_URL=http://localhost:5173
```

```bash
php -S localhost:8080 -t public
# → API ready at http://localhost:8080
```

<br/>

---

## 🐳 Docker Deployment

The project uses a **multi-stage Docker build** for optimized production images:

```
Stage 1: node:20-alpine     →  Build React frontend with Vite
Stage 2: php:8.2-apache     →  Serve PHP API + static frontend
```

### Build & Run

```bash
# Build the image
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your_key \
  --build-arg VITE_API_URL=https://your-api.onrender.com \
  -t acme-hrms .

# Run the container
docker run -p 80:80 \
  -e DB_HOST=your_host \
  -e DB_PORT=5432 \
  -e DB_DATABASE=your_db \
  -e DB_USERNAME=your_user \
  -e DB_PASSWORD=your_pass \
  -e JWT_SECRET=your_secret \
  -e GOOGLE_MAPS_API_KEY=your_key \
  -e GOOGLE_GEOCODING_API_KEY=your_key \
  -e FRONTEND_URL=https://your-app.onrender.com \
  acme-hrms
```

> 💡 The `docker-entrypoint.sh` automatically generates a `.env` file from container environment variables at startup, ensuring seamless deployment on platforms like Render.

<br/>

---

## ☁️ Deployment

### Render (Recommended)

This project includes a [`render.yaml`](render.yaml) blueprint for **one-click deployment**:

1. Fork this repository
2. Connect to [Render Dashboard](https://dashboard.render.com)
3. Create a new **Blueprint** and select your fork
4. Configure the environment variables
5. Deploy 🚀

### Environment Variables Reference

<details>
<summary><b>📋 Click to expand full environment variable list</b></summary>

| Variable | Required | Description |
|:---|:---:|:---|
| `DB_HOST` | ✅ | PostgreSQL database host |
| `DB_PORT` | ✅ | PostgreSQL port (default: `5432`) |
| `DB_DATABASE` | ✅ | Database name |
| `DB_USERNAME` | ✅ | Database user |
| `DB_PASSWORD` | ✅ | Database password |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `GOOGLE_MAPS_API_KEY` | ✅ | Google Maps JavaScript API key |
| `GOOGLE_GEOCODING_API_KEY` | ✅ | Google Geocoding API key |
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `VITE_API_URL` | ✅ | Backend API base URL |
| `FRONTEND_URL` | ✅ | Frontend URL (for CORS configuration) |

</details>

<br/>

---

## 🔒 Security

- 🔐 **JWT Authentication** — Stateless token-based auth for all API endpoints
- 🛡️ **Role-Based Access Control** — Granular feature access per employee
- 🔑 **Supabase Auth** — Managed authentication with email verification
- 🧱 **CORS Protection** — Configurable cross-origin policies
- 📝 **Audit Logging** — Complete trail of all admin & branch operations
- 🔒 **Environment Isolation** — Secrets injected at runtime, never in code
- 📸 **Face Recognition** — Biometric attendance verification

<br/>

---

## ⚡ Performance Optimizations

- **Batch Database Queries** — Eliminated N+1 query patterns across loan & branch modules
- **TanStack Query Caching** — Intelligent client-side caching with offline persistence
- **Multi-Stage Docker Build** — Minimal production image size
- **Optimized Composer Autoloader** — Classmap-based autoloading in production
- **Apache mod_rewrite** — Efficient URL rewriting for SPA routing
- **Code Splitting** — Vite-powered lazy loading for optimal bundle sizes

<br/>

---

## 📖 Documentation

The repository includes a comprehensive **118KB System Documentation** file ([`SYSTEM_DOCUMENTATION.md`](SYSTEM_DOCUMENTATION.md)) covering:

- Complete database schema reference
- API endpoint documentation
- Authentication & authorization flows
- Module-specific business logic
- Deployment procedures

<br/>

---

<div align="center">

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

<br/>

**Built with ❤️ by the Acme Team**

<br/>

![React](https://img.shields.io/badge/-React-61DAFB?style=flat&logo=react&logoColor=black)
![PHP](https://img.shields.io/badge/-PHP-777BB4?style=flat&logo=php&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Tailwind](https://img.shields.io/badge/-TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/-Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![JWT](https://img.shields.io/badge/-JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

<br/>

⭐ **Star this repo if you found it useful!** ⭐

</div>
