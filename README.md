# 🏢 Acme HRMS

A comprehensive **Human Resource Management System** built for modern organizations. Acme HRMS streamlines employee management, payroll, attendance tracking, leave management, loan origination, branch operations, recruitment, and more — all in one unified platform.

> **Live Demo:** Deployed on [Render](https://render.com) via Docker

---

## ✨ Features

### 👤 Employee Portal
- **Dashboard** — Personalized overview with key stats and notifications
- **Attendance** — GPS-based check-in/out with face recognition, map view, and camera integration
- **Leave Management** — Apply, track, and manage leave requests
- **Payroll** — View salary breakdowns, payslips, and payment history
- **Expenses** — Submit and track expense claims
- **Performance** — View performance reviews and assessments
- **Profile** — Manage personal information and documents
- **Training Videos** — Access company training materials
- **Assessments** — Take skill assessments with a built-in assessment engine

### 🔧 Admin Panel
- **Dashboard** — Organization-wide analytics and insights
- **Employee Directory** — Manage employee profiles, roles, and feature access
- **Attendance Management** — Configure attendance rules, locations, and regularization
- **Leave Management** — Approve/reject leaves and configure leave policies
- **Payroll & Bulk Payroll** — Process payroll for individuals or in bulk
- **Recruitment** — Full recruitment pipeline with candidate tracking
- **Performance Reviews** — Conduct and manage performance evaluations
- **Assessments** — Create assessments, question banks, and view results
- **Holidays** — Manage company holiday calendars with archive support
- **Expenses** — Review and approve employee expense claims
- **Assets** — Track and manage company assets
- **Training Videos** — Upload and manage training content
- **Email Templates** — Configure automated email communications
- **Audit Logs** — Full audit trail of system activities
- **Settings** — System-wide configuration and preferences

### 🏦 Loan Origination Module
- **Dashboard** — Loan pipeline overview with key metrics
- **Leads Management** — Capture, track, and manage loan leads
- **Loan Applications** — Process Personal and Business loan applications
- **Members Directory** — Manage loan applicant profiles
- **Loan Forms** — Dynamic loan application forms

### 🏗️ Branch Operations Module
- **Dashboard** — Branch-level analytics and KPIs
- **Loan Applications** — View, edit, and manage branch-processed loan applications
- **Audit Logging** — Track all branch-level loan operations

### 🎯 Candidate Portal
- **Dashboard** — Application status overview
- **Job Listings** — Browse and apply for open positions
- **Applications** — Track application progress
- **Documents** — Upload required documents
- **Profile** — Manage candidate information

### 📱 Mobile-First Design
Every module ships with a dedicated **mobile-optimized** view featuring:
- iOS-inspired liquid glass bottom navigation
- Touch-friendly swipe gestures
- Responsive layouts for all screen sizes
- Landscape orientation detection and warnings

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **React Router 7** | Client-side routing |
| **TanStack React Query 5** | Server state management with offline persistence |
| **Framer Motion** | Animations & transitions |
| **Recharts** | Data visualization & charts |
| **Lucide React** | Icon library |
| **Supabase JS** | Auth & real-time features |
| **Axios** | HTTP client |
| **Face API** | Face recognition for attendance |
| **React PDF** | PDF generation for payslips & reports |

### Backend
| Technology | Purpose |
|---|---|
| **PHP 8.2** | Server runtime |
| **Slim Framework 4** | Lightweight REST API framework |
| **PostgreSQL** | Primary database (via Supabase) |
| **Firebase PHP JWT** | JWT authentication |
| **PHP Dotenv** | Environment variable management |
| **Apache** | Web server |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker** | Containerized deployment |
| **Render** | Cloud hosting platform |
| **Supabase** | Database, Auth & real-time backend |
| **Google Maps API** | Geolocation & mapping services |

---

## 📁 Project Structure

```
Acme HRMS/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── api/                 # Axios instance & API config
│   │   ├── components/          # Reusable UI components
│   │   │   ├── forms/           # Loan & application forms
│   │   │   └── ...              # Layout components, modals, etc.
│   │   ├── contexts/            # React context providers (Auth, etc.)
│   │   ├── pages/               # Page-level components (~99 pages)
│   │   ├── services/            # API service functions
│   │   └── App.jsx              # Root component with routing
│   ├── public/                  # Static assets
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # PHP REST API
│   ├── public/                  # Route definitions & entry point
│   │   ├── index.php            # Slim app bootstrap
│   │   ├── admin_*_routes.php   # Admin API routes
│   │   ├── employee_*_routes.php # Employee API routes
│   │   ├── origination_*_routes.php # Loan origination routes
│   │   ├── branch_operations_*_routes.php # Branch ops routes
│   │   └── candidate_*_routes.php # Candidate portal routes
│   ├── src/                     # Application source (middleware, config)
│   ├── cron/                    # Scheduled tasks
│   ├── scripts/                 # Utility scripts
│   └── composer.json
│
├── supabase/                    # Supabase configuration
├── Dockerfile                   # Multi-stage Docker build
├── docker-entrypoint.sh         # Container startup script
├── render.yaml                  # Render deployment config
└── SYSTEM_DOCUMENTATION.md      # Detailed system documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **PHP** ≥ 8.0
- **Composer**
- **PostgreSQL** (or a [Supabase](https://supabase.com) project)

### 1. Clone the Repository

```bash
git clone https://github.com/Kondapaneni/HRMS.git
cd HRMS
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8080
```

Start the dev server:

```bash
npm run dev
```

### 3. Backend Setup

```bash
cd backend
composer install
```

Create a `.env` file in the `backend/` directory:

```env
DB_HOST=your_db_host
DB_PORT=5432
DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret
GOOGLE_MAPS_API_KEY=your_google_maps_key
GOOGLE_GEOCODING_API_KEY=your_geocoding_key
FRONTEND_URL=http://localhost:5173
```

Start the PHP development server:

```bash
php -S localhost:8080 -t public
```

---

## 🐳 Docker Deployment

Build and run with Docker:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=your_url \
  --build-arg VITE_SUPABASE_ANON_KEY=your_key \
  --build-arg VITE_API_URL=your_api_url \
  -t acme-hrms .

docker run -p 80:80 \
  -e DB_HOST=your_host \
  -e DB_PORT=5432 \
  -e DB_DATABASE=your_db \
  -e DB_USERNAME=your_user \
  -e DB_PASSWORD=your_pass \
  -e JWT_SECRET=your_secret \
  acme-hrms
```

The Docker build uses a **multi-stage** process:
1. **Stage 1** — Builds the React frontend with Vite
2. **Stage 2** — Sets up the PHP/Apache backend and copies the built frontend into the `public/` directory

---

## ☁️ Render Deployment

This project includes a `render.yaml` for one-click deployment on [Render](https://render.com):

1. Connect your GitHub repository to Render
2. Configure the environment variables listed in `render.yaml`
3. Deploy — Render will automatically build and serve the Docker container

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL database host |
| `DB_PORT` | PostgreSQL port (default: `5432`) |
| `DB_DATABASE` | Database name |
| `DB_USERNAME` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret key for JWT token signing |
| `GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |
| `GOOGLE_GEOCODING_API_KEY` | Google Geocoding API key |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_API_URL` | Backend API base URL |
| `FRONTEND_URL` | Frontend app URL (for CORS) |

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ by the <strong>Acme</strong> team
</p>
