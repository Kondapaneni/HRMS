-- Disposable CI fixture from read-only catalog metadata, 2026-11-16.
-- No real records, secrets or webhook destinations. NOT a migration.
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;
SET search_path=public,extensions;
CREATE SEQUENCE public.global_settings_id_seq;
CREATE SEQUENCE public.geofences_id_seq;
CREATE SEQUENCE public.shift_times_id_seq;
CREATE TABLE public.application_timeline (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  application_id uuid,
  status_change character varying(100) NOT NULL,
  notes text,
  updated_by uuid,
  created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.applications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  job_id uuid,
  candidate_id uuid,
  resume_url text,
  status character varying(50) DEFAULT 'Applied'::character varying,
  applied_date timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  notice_period character varying(50),
  cover_note text
);
CREATE TABLE public.assessment_attempts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assessment_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  attempt_number integer DEFAULT 1 NOT NULL,
  start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  end_time timestamp with time zone,
  status character varying(50) DEFAULT 'in_progress'::character varying,
  answers_data jsonb DEFAULT '[]'::jsonb,
  score integer,
  total_marks integer,
  percentage numeric(5,2),
  passed boolean,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  submit_reason character varying(255) DEFAULT 'manual'::character varying
);
CREATE TABLE public.assessments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title character varying(255) NOT NULL,
  duration_minutes integer DEFAULT 30 NOT NULL,
  passing_percentage integer DEFAULT 70 NOT NULL,
  max_attempts integer DEFAULT 1 NOT NULL,
  randomize_questions boolean DEFAULT false,
  randomize_options boolean DEFAULT false,
  result_visibility character varying(50) DEFAULT 'immediate'::character varying,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  department character varying(150) DEFAULT 'General'::character varying,
  marks_per_question integer DEFAULT 1,
  selected_questions jsonb DEFAULT '[]'::jsonb,
  status character varying(50) DEFAULT 'Active'::character varying,
  assessment_date character varying(50) DEFAULT NULL::character varying,
  questions_count integer DEFAULT 0,
  assigned_employee_ids jsonb
);
CREATE TABLE public.assets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name character varying(255) NOT NULL,
  category character varying(100) NOT NULL,
  serial_number character varying(100),
  status character varying(50) DEFAULT 'Available'::character varying,
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.attendance (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "employeeId" uuid,
  date date,
  "checkIn" timestamp without time zone,
  "checkOut" timestamp without time zone,
  status character varying(50),
  hours numeric(5,2) DEFAULT 0.00,
  "checkInLat" numeric(10,8),
  "checkInLng" numeric(11,8),
  "checkInAddress" text,
  "checkInPhoto" text,
  "checkOutLat" numeric(10,8),
  "checkOutLng" numeric(11,8),
  "checkOutAddress" text,
  "checkOutPhoto" text,
  "isRegularized" boolean DEFAULT false,
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "deviceId" character varying(255)
);
CREATE TABLE public.attendance_punches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "attendanceId" uuid,
  "employeeId" uuid,
  "punchTime" timestamp without time zone,
  latitude numeric(10,8),
  longitude numeric(11,8),
  address text,
  photo text,
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.audit_logs (
  audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
  module_name character varying,
  entity_type character varying NOT NULL,
  entity_id character varying NOT NULL,
  action_type character varying NOT NULL,
  actor_user_id character varying,
  actor_name character varying,
  actor_role character varying,
  target_employee_id character varying,
  target_employee_name character varying,
  previous_values jsonb,
  new_values jsonb,
  changed_fields jsonb,
  "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  ip_address character varying,
  browser_information character varying,
  session_id character varying
);
CREATE TABLE public.branches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name character varying(255) NOT NULL
);
CREATE TABLE public.candidate_documents (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  candidate_id uuid,
  document_type character varying(100) NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  status character varying(20) DEFAULT 'pending'::character varying,
  uploaded_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.candidate_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  phone character varying(50),
  address text,
  current_title character varying(255),
  experience character varying(50),
  resume_url jsonb,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  documents_tab_seen_at timestamp with time zone
);
CREATE TABLE public.company_holidays (
  id uuid NOT NULL,
  "holidayDate" date NOT NULL,
  "holidayName" character varying(255) NOT NULL,
  "holidayImage" text,
  "isActive" integer DEFAULT 1,
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.department_question_bank (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  department character varying(150) NOT NULL,
  question_text text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb NOT NULL,
  correct_option integer DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  question_type character varying(50) DEFAULT 'mcq_single'::character varying,
  correct_options jsonb DEFAULT '[]'::jsonb
);
CREATE TABLE public.email_queue (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  to_email character varying(255) NOT NULL,
  subject character varying(255) NOT NULL,
  body text NOT NULL,
  status character varying(50) DEFAULT 'pending'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  delivery_token uuid DEFAULT gen_random_uuid() NOT NULL
);
CREATE TABLE public.employee (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "employeeId" character varying(50) NOT NULL,
  "userId" uuid,
  "firstName" character varying(100),
  "lastName" character varying(100),
  email character varying(255),
  "workEmail" character varying(255),
  "panNumber" character varying(50),
  phone character varying(20),
  branch character varying(100),
  department character varying(100),
  "position" character varying(100),
  "joinDate" date,
  "employmentType" character varying(50),
  "noticePeriod" character varying(50),
  "shiftTime" character varying(50),
  "workMode" character varying(50),
  "weekOff" character varying(50),
  salary numeric(12,2),
  timeline text,
  avatar text,
  status character varying(50) DEFAULT 'Active'::character varying,
  "employmentStatus" character varying(50),
  "employmentStatusDate" date,
  "employmentStatusReason" text,
  "managerId" character varying(50),
  address text,
  "dateOfBirth" date,
  "bloodGroup" character varying(10),
  "emergencyContact" character varying(100),
  "emergencyPhone" character varying(20),
  gender character varying(20),
  "maritalStatus" character varying(50),
  nationality character varying(50),
  "geoFenceEnabled" boolean DEFAULT false,
  "webAttendanceEnabled" boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "trackerDeviceId" character varying(255),
  "trackerDeviceModel" character varying(255),
  "trackerLastActive" timestamp without time zone,
  "themePreference" character varying(20) DEFAULT 'system'::character varying
);
CREATE TABLE public.employee_training_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id uuid,
  user_id uuid,
  video_id uuid,
  completed boolean DEFAULT true,
  completed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.expenses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  title character varying(255) NOT NULL,
  description text,
  amount numeric(10,2) NOT NULL,
  category character varying(100) NOT NULL,
  bill_url text,
  status character varying(50) DEFAULT 'Pending'::character varying,
  remarks text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.geofences (
  id integer DEFAULT nextval('geofences_id_seq'::regclass) NOT NULL,
  name character varying(255) NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  radius integer DEFAULT 100,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.global_settings (
  id integer DEFAULT nextval('global_settings_id_seq'::regclass) NOT NULL,
  session_timeout character varying(20) DEFAULT '30'::character varying,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  login_rate_limit_attempts integer DEFAULT 5,
  login_rate_limit_window integer DEFAULT 15,
  forgot_password_rate_limit_attempts integer DEFAULT 3,
  forgot_password_rate_limit_window integer DEFAULT 60,
  maps_rate_limit_attempts integer DEFAULT 5,
  maps_rate_limit_window integer DEFAULT 10,
  admin_avatar text,
  news_headlines jsonb DEFAULT '[]'::jsonb,
  maintenance_mode boolean DEFAULT false,
  maintenance_message text DEFAULT 'The application is currently undergoing maintenance. Please check back later.'::text,
  tracking_interval_minutes integer DEFAULT 15
);
CREATE TABLE public.hrms_refresh_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  token_hash character(64) NOT NULL,
  session_version integer NOT NULL,
  client_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone
);
CREATE TABLE public.jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title character varying(255) NOT NULL,
  department character varying(100) NOT NULL,
  location character varying(100) NOT NULL,
  type character varying(50) NOT NULL,
  description text,
  description_pdf_url text,
  status character varying(50) DEFAULT 'Draft'::character varying,
  deadline timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  experience text,
  salary_min text,
  salary_max text,
  vacancy numeric,
  skills text,
  qualification text
);
CREATE TABLE public.leave_balances (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "employeeId" uuid,
  "paidTotal" integer DEFAULT 12,
  "paidUsed" integer DEFAULT 0,
  "unpaidUsed" integer DEFAULT 0,
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.leaves (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "employeeId" uuid,
  "leaveType" character varying(50),
  "startDate" date,
  "endDate" date,
  days integer,
  reason text,
  status character varying(50) DEFAULT 'pending'::character varying,
  "appliedDate" date DEFAULT CURRENT_DATE,
  "approvedBy" uuid,
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.loan_application_audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  application_id character varying(100) NOT NULL,
  loan_application_id uuid,
  editor_name character varying(255) NOT NULL,
  editor_user_id uuid,
  changes jsonb DEFAULT '[]'::jsonb NOT NULL,
  changes_count integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.loan_applications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  loan_type character varying(100) DEFAULT 'Business Loan'::character varying NOT NULL,
  status character varying(50) DEFAULT 'Created'::character varying NOT NULL,
  form_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by character varying(255),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  application_id character varying(50),
  lead_id character varying(255),
  signatures jsonb DEFAULT '{}'::jsonb,
  branch character varying
);
CREATE TABLE public.loan_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  application_id character varying(100) NOT NULL,
  slot_key character varying(100) NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.loan_leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  status text DEFAULT 'New'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by uuid,
  loan_type character varying(100) DEFAULT 'Personal Loan'::character varying,
  branch character varying
);
CREATE TABLE public.mfa_backup_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  code_hash character varying(255) NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.mfa_secrets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  secret character varying(64) NOT NULL,
  confirmed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.origination_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  priority character varying(50) DEFAULT 'Medium'::character varying,
  start_date date NOT NULL,
  start_time character varying(20) DEFAULT '10:00'::character varying,
  end_date date,
  end_time character varying(20) DEFAULT '11:00'::character varying,
  all_day boolean DEFAULT false,
  address text,
  notes text,
  status character varying(50) DEFAULT 'Scheduled'::character varying,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  assigned_to uuid
);
CREATE TABLE public.payslips (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "employeeId" uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  "detailsJson" jsonb,
  "earningsJson" jsonb,
  "deductionsJson" jsonb,
  "netSalary" numeric(12,2) NOT NULL,
  status character varying(50) DEFAULT 'paid'::character varying,
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.portal_item_reads (
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  last_seen_at timestamp with time zone NOT NULL,
  seen_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  portal_key character varying(100) NOT NULL,
  item_type character varying(100) NOT NULL
);
CREATE TABLE public.rate_limits (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ip_address character varying(45) NOT NULL,
  action character varying(50) NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.sale_leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  address text,
  status text DEFAULT 'New'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  branch character varying(255),
  product_type character varying(255) DEFAULT NULL::character varying
);
CREATE TABLE public.shift_times (
  id integer DEFAULT nextval('shift_times_id_seq'::regclass) NOT NULL,
  "shiftLabel" character varying(255) NOT NULL,
  "startTime" time without time zone NOT NULL,
  "endTime" time without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.training_videos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  video_url text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  assigned_employee_ids jsonb DEFAULT '[]'::jsonb
);
CREATE TABLE public.user_feature_access (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL,
  "canAttendance" boolean DEFAULT false,
  "canLeave" boolean DEFAULT false,
  "canPayroll" boolean DEFAULT false,
  "canEmployees" boolean DEFAULT false,
  "canRecruitment" boolean DEFAULT false,
  "canAssets" boolean DEFAULT false,
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "canLoanOrigination" boolean DEFAULT false,
  "canAdminAssessments" boolean DEFAULT false,
  "canBranchOperations" boolean DEFAULT false,
  "canSalesOrigination" boolean DEFAULT false,
  "canExpenses" boolean DEFAULT false
);
CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email character varying(255) NOT NULL,
  password character varying(255) NOT NULL,
  "firstName" character varying(100),
  "lastName" character varying(100),
  role character varying(50) DEFAULT 'employee'::character varying,
  department character varying(100),
  "position" character varying(100),
  "forcePasswordChange" boolean DEFAULT false,
  "isActive" boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "mfaEnabled" boolean DEFAULT false,
  reset_token character varying(255) DEFAULT NULL::character varying,
  reset_token_expires timestamp without time zone,
  otp_code character varying(255),
  otp_expires_at timestamp without time zone,
  "themePreference" character varying(20) DEFAULT 'system'::character varying,
  token_version integer DEFAULT 0 NOT NULL
);
ALTER TABLE public.application_timeline ADD CONSTRAINT application_timeline_pkey PRIMARY KEY (id);
ALTER TABLE public.applications ADD CONSTRAINT applications_pkey PRIMARY KEY (id);
ALTER TABLE public.assessment_attempts ADD CONSTRAINT assessment_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.assessments ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);
ALTER TABLE public.assets ADD CONSTRAINT assets_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance_punches ADD CONSTRAINT attendance_punches_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);
ALTER TABLE public.branches ADD CONSTRAINT branches_pkey PRIMARY KEY (id);
ALTER TABLE public.candidate_documents ADD CONSTRAINT candidate_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.candidate_profiles ADD CONSTRAINT candidate_profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.company_holidays ADD CONSTRAINT company_holidays_pkey PRIMARY KEY (id);
ALTER TABLE public.department_question_bank ADD CONSTRAINT department_question_bank_pkey PRIMARY KEY (id);
ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);
ALTER TABLE public.employee ADD CONSTRAINT employee_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_training_progress ADD CONSTRAINT employee_training_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);
ALTER TABLE public.geofences ADD CONSTRAINT geofences_pkey PRIMARY KEY (id);
ALTER TABLE public.global_settings ADD CONSTRAINT global_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.hrms_refresh_sessions ADD CONSTRAINT hrms_refresh_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_balances ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);
ALTER TABLE public.leaves ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);
ALTER TABLE public.origination_activities ADD CONSTRAINT loan_activities_pkey PRIMARY KEY (id);
ALTER TABLE public.loan_application_audit_logs ADD CONSTRAINT loan_application_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.loan_applications ADD CONSTRAINT loan_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.loan_documents ADD CONSTRAINT loan_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.loan_leads ADD CONSTRAINT loan_leads_pkey PRIMARY KEY (id);
ALTER TABLE public.mfa_backup_codes ADD CONSTRAINT mfa_backup_codes_pkey PRIMARY KEY (id);
ALTER TABLE public.mfa_secrets ADD CONSTRAINT mfa_secrets_pkey PRIMARY KEY (id);
ALTER TABLE public.payslips ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);
ALTER TABLE public.portal_item_reads ADD CONSTRAINT portal_item_reads_pkey PRIMARY KEY (user_id, portal_key, item_type, item_id);
ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);
ALTER TABLE public.sale_leads ADD CONSTRAINT sale_leads_pkey PRIMARY KEY (id);
ALTER TABLE public.shift_times ADD CONSTRAINT shift_times_pkey PRIMARY KEY (id);
ALTER TABLE public.training_videos ADD CONSTRAINT training_videos_pkey PRIMARY KEY (id);
ALTER TABLE public.user_feature_access ADD CONSTRAINT user_feature_access_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_employeeId_date_key" UNIQUE ("employeeId", date);
ALTER TABLE public.branches ADD CONSTRAINT branches_name_key UNIQUE (name);
ALTER TABLE public.candidate_profiles ADD CONSTRAINT candidate_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.company_holidays ADD CONSTRAINT "company_holidays_holidayDate_key" UNIQUE ("holidayDate");
ALTER TABLE public.employee ADD CONSTRAINT "employee_employeeId_key" UNIQUE ("employeeId");
ALTER TABLE public.employee_training_progress ADD CONSTRAINT employee_video_unique UNIQUE (employee_id, video_id);
ALTER TABLE public.leave_balances ADD CONSTRAINT "leave_balances_employeeId_key" UNIQUE ("employeeId");
ALTER TABLE public.loan_applications ADD CONSTRAINT loan_applications_application_id_key UNIQUE (application_id);
ALTER TABLE public.mfa_secrets ADD CONSTRAINT mfa_secrets_user_id_key UNIQUE (user_id);
ALTER TABLE public.loan_documents ADD CONSTRAINT unique_app_slot UNIQUE (application_id, slot_key);
ALTER TABLE public.user_feature_access ADD CONSTRAINT "user_feature_access_userId_key" UNIQUE ("userId");
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE public.hrms_refresh_sessions ADD CONSTRAINT hrms_refresh_sessions_client_type_check CHECK ((client_type = ANY (ARRAY['web'::text, 'android'::text])));
ALTER TABLE public.users ADD CONSTRAINT users_token_version_nonnegative CHECK ((token_version >= 0));
ALTER TABLE public.application_timeline ADD CONSTRAINT application_timeline_application_id_fkey FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE public.application_timeline ADD CONSTRAINT application_timeline_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.applications ADD CONSTRAINT applications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.applications ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE public.assets ADD CONSTRAINT assets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES employee(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_punches ADD CONSTRAINT "attendance_punches_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES attendance(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_punches ADD CONSTRAINT "attendance_punches_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.candidate_documents ADD CONSTRAINT candidate_documents_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.candidate_profiles ADD CONSTRAINT candidate_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_training_progress ADD CONSTRAINT employee_training_progress_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE public.employee_training_progress ADD CONSTRAINT employee_training_progress_video_id_fkey FOREIGN KEY (video_id) REFERENCES training_videos(id) ON DELETE CASCADE;
ALTER TABLE public.employee ADD CONSTRAINT "employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.hrms_refresh_sessions ADD CONSTRAINT hrms_refresh_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.leave_balances ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.leaves ADD CONSTRAINT "leaves_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES users(id);
ALTER TABLE public.leaves ADD CONSTRAINT "leaves_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.origination_activities ADD CONSTRAINT loan_activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE public.origination_activities ADD CONSTRAINT loan_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.loan_leads ADD CONSTRAINT loan_leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public.mfa_backup_codes ADD CONSTRAINT mfa_backup_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.mfa_secrets ADD CONSTRAINT mfa_secrets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.payslips ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.training_videos ADD CONSTRAINT training_videos_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.user_feature_access ADD CONSTRAINT "user_feature_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.daily_attendance_master()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- First, proactively insert any weekend/holiday records for TODAY
    PERFORM public.insert_weekend_holiday_attendance();
    
    -- Second, retroactively clean up any missed attendances for the LAST 30 DAYS
    PERFORM public.finalize_attendance();
    
    -- Third, resolve any incomplete check-ins from previous days
    -- Calculate hours worked up to the employee's individual shift end time
    WITH missing_checkouts AS (
        SELECT 
            a.id,
            CASE 
                WHEN a.status ILIKE '%late%' THEN 'present (late+checkout missing)'
                ELSE 'present (checkout missing)'
            END AS new_status,
            GREATEST(0.00, ROUND(
                EXTRACT(EPOCH FROM (
                    (CASE 
                        WHEN COALESCE(st."endTime", '18:30:00'::time) < COALESCE(st."startTime", '09:45:00'::time)
                        THEN (a.date + INTERVAL '1 day' + COALESCE(st."endTime", '18:30:00'::time))
                        ELSE (a.date + COALESCE(st."endTime", '18:30:00'::time))
                    END) - a."checkIn"
                )) / 3600.0, 2
            )) AS calc_hours
        FROM attendance a
        LEFT JOIN employee e ON (a."employeeId" = e."userId" OR a."employeeId" = e.id)
        LEFT JOIN shift_times st ON e."shiftTime" = st."shiftLabel"
        WHERE a."checkIn" IS NOT NULL
          AND a."checkOut" IS NULL
          AND a.date < CURRENT_DATE
          AND (
              a.status NOT ILIKE '%checkout missing%'
              OR a.hours IS NULL 
              OR a.hours = 0.00
          )
    )
    UPDATE attendance a
    SET status = mc.new_status,
        hours = mc.calc_hours,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM missing_checkouts mc
    WHERE a.id = mc.id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.finalize_attendance()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_finalize_from DATE := CURRENT_DATE - INTERVAL '30 days';
    v_curr_date DATE;
    v_emp RECORD;
    v_uid UUID;
    v_att_exists BOOLEAN;
    v_leave_exists BOOLEAN;
    v_is_holiday BOOLEAN;
    v_day_name VARCHAR;
    v_emp_week_off VARCHAR;
BEGIN
    v_curr_date := v_finalize_from;
    
    WHILE v_curr_date <= v_yesterday LOOP
            -- Check if the current date is a company holiday
            SELECT EXISTS(
                SELECT 1 FROM company_holidays 
                WHERE "holidayDate" = v_curr_date AND "isActive" = 1
            ) INTO v_is_holiday;

            -- Skip Holidays
            IF NOT v_is_holiday THEN
                FOR v_emp IN SELECT id, "userId", "joinDate", "weekOff" FROM employee WHERE status = 'active' LOOP
                    v_uid := COALESCE(v_emp."userId", v_emp.id);
                    
                    -- Determine employee's week off (default to Sunday)
                    v_day_name := TRIM(to_char(v_curr_date, 'Day'));
                    v_emp_week_off := COALESCE(NULLIF(TRIM(v_emp."weekOff"), ''), 'Sunday');
                    
                    IF v_day_name = v_emp_week_off THEN
                        CONTINUE;
                    END IF;
                    
                    -- Skip dates before the employee's join date
                    IF v_emp."joinDate" IS NOT NULL AND v_curr_date < v_emp."joinDate" THEN
                        CONTINUE;
                    END IF;
                    
                    -- Check if attendance already exists
                    SELECT EXISTS(
                        SELECT 1 FROM attendance WHERE "employeeId" = v_uid AND date = v_curr_date
                    ) INTO v_att_exists;
                    
                    IF NOT v_att_exists THEN
                        -- Check if on approved leave
                        SELECT EXISTS(
                            SELECT 1 FROM leaves 
                            WHERE "employeeId" = v_uid
                            AND status = 'approved' 
                            AND "startDate"::DATE <= v_curr_date 
                            AND "endDate"::DATE >= v_curr_date
                        ) INTO v_leave_exists;
                        
                        IF NOT v_leave_exists THEN
                            INSERT INTO attendance ("employeeId", date, status) 
                            VALUES (v_uid, v_curr_date, 'missed');
                        END IF;
                    END IF;
                END LOOP;
            END IF;
            
        v_curr_date := v_curr_date + INTERVAL '1 day';
    END LOOP;
END;$function$
;
CREATE OR REPLACE FUNCTION public.insert_weekend_holiday_attendance()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    target_date DATE;
    day_name TEXT;
    is_holiday BOOLEAN;
    emp RECORD;
    weekoff_array TEXT[];
    emp_is_weekend BOOLEAN;
    holiday_name TEXT;
    att_status TEXT;
BEGIN
    -- Get current date in IST
    target_date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
    
    -- Get current day name (lowercase)
    day_name := lower(to_char(target_date, 'Day'));
    day_name := trim(day_name);

    -- Check if today is a company holiday
    SELECT true INTO is_holiday 
    FROM company_holidays 
    WHERE "holidayDate" = target_date AND "isActive" = 1
    LIMIT 1;

    IF is_holiday IS NULL THEN
        is_holiday := false;
    END IF;

    -- Loop through active employees
    FOR emp IN SELECT id, "userId", "weekOff" FROM employee WHERE status = 'active' LOOP
        att_status := NULL;
        
        -- Default to sunday if weekOff is null
        IF emp."weekOff" IS NULL OR trim(emp."weekOff") = '' THEN
            weekoff_array := ARRAY['sunday'];
        ELSE
            -- Convert comma-separated string to array
            weekoff_array := string_to_array(lower(emp."weekOff"), ',');
            -- Trim spaces
            FOR i IN 1 .. array_length(weekoff_array, 1) LOOP
                weekoff_array[i] := trim(weekoff_array[i]);
            END LOOP;
        END IF;

        emp_is_weekend := day_name = ANY(weekoff_array);

        IF is_holiday THEN
            att_status := 'holiday';
        ELSIF emp_is_weekend THEN
            att_status := 'weekend';
        END IF;

        IF att_status IS NOT NULL THEN
            -- Check if record already exists
            IF NOT EXISTS (SELECT 1 FROM attendance WHERE "employeeId" = emp."userId" AND date = target_date) THEN
                INSERT INTO attendance ("employeeId", date, status, "isRegularized")
                VALUES (emp."userId", target_date, att_status, false);
            END IF;
        END IF;

    END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.jsonb_diff_val(val1 jsonb, val2 jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    result jsonb;
    v record;
BEGIN
    result = '{}'::jsonb;
    IF val1 IS NULL OR val2 IS NULL THEN
        RETURN result;
    END IF;
    FOR v IN SELECT * FROM jsonb_each(val2) LOOP
        IF val1 -> v.key IS DISTINCT FROM v.value THEN
            result = result || jsonb_build_object(v.key, jsonb_build_object('old', val1 -> v.key, 'new', v.value));
        END IF;
    END LOOP;
    RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.process_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    app_uid VARCHAR;
    app_uemail VARCHAR;
    app_urole VARCHAR;
    app_ip VARCHAR;
    app_ua VARCHAR;
    app_sid VARCHAR;
    
    target_emp_id VARCHAR := NULL;
    target_emp_name VARCHAR := NULL;
    
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_changed JSONB := NULL;
    
    mod_name VARCHAR := TG_TABLE_NAME;
    rec_id VARCHAR;
BEGIN
    -- Extract context from current session (set by AuthMiddleware)
    BEGIN
        app_uid := current_setting('app.current_user_id', true);
        app_uemail := current_setting('app.current_user_email', true);
        app_urole := current_setting('app.current_user_role', true);
        app_ip := current_setting('app.ip_address', true);
        app_ua := current_setting('app.user_agent', true);
        app_sid := current_setting('app.session_id', true);
    EXCEPTION WHEN OTHERS THEN
        app_uid := NULL;
    END;

    -- Lookup actor name if we have app_uid
    IF app_uid IS NOT NULL THEN
        BEGIN
            EXECUTE 'SELECT "firstName" || '' '' || "lastName" FROM users WHERE id = $1'
            INTO app_uemail
            USING app_uid::UUID;
        EXCEPTION WHEN OTHERS THEN
            -- fallback to email if lookup fails
            NULL;
        END;
    END IF;

    -- Generate JSON representations first to avoid static record field errors
    IF TG_OP = 'INSERT' THEN
        v_new_data := row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := row_to_json(OLD)::JSONB;
        v_new_data := row_to_json(NEW)::JSONB;
        v_changed := jsonb_diff_val(v_old_data, v_new_data);
        
        -- Do not log if nothing actually changed
        IF v_changed = '{}'::JSONB THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := row_to_json(OLD)::JSONB;
    END IF;

    -- Determine record ID and Target Employee ID based on Table
    IF TG_TABLE_NAME = 'users' THEN
        mod_name := 'Employee / User Settings';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := rec_id;
        target_emp_name := COALESCE(v_new_data->>'firstName', v_old_data->>'firstName') || ' ' || COALESCE(v_new_data->>'lastName', v_old_data->>'lastName');
    ELSIF TG_TABLE_NAME = 'employee' THEN
        mod_name := 'Employee Work Information';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'userId', v_old_data->>'userId');
    ELSIF TG_TABLE_NAME = 'attendance' THEN
        mod_name := 'Attendance Regularization';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'employeeId', v_old_data->>'employeeId');
    ELSIF TG_TABLE_NAME = 'leaves' THEN
        mod_name := 'Leave Management';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'employeeId', v_old_data->>'employeeId');
    ELSIF TG_TABLE_NAME = 'user_feature_access' THEN
        mod_name := 'Feature Access Roles';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'userId', v_old_data->>'userId');
    ELSIF TG_TABLE_NAME = 'payslips' THEN
        mod_name := 'Payroll Management';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'employeeId', v_old_data->>'employeeId');
    ELSIF TG_TABLE_NAME = 'assets' THEN
        mod_name := 'Assets Management';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        BEGIN
            EXECUTE 'SELECT "userId" FROM employee WHERE id = $1'
            INTO target_emp_id
            USING COALESCE(v_new_data->>'assigned_to', v_old_data->>'assigned_to')::UUID;
        EXCEPTION WHEN OTHERS THEN
            target_emp_id := NULL;
        END;
    ELSE
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
    END IF;

    -- Lookup target employee name if we have target_emp_id but not name
    IF target_emp_id IS NOT NULL AND target_emp_name IS NULL THEN
        BEGIN
            EXECUTE 'SELECT "firstName" || '' '' || "lastName" FROM users WHERE id = $1'
            INTO target_emp_name
            USING target_emp_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            target_emp_name := NULL;
        END;
    END IF;

    INSERT INTO audit_logs (
        module_name, entity_type, entity_id, action_type,
        actor_user_id, actor_name, actor_role,
        target_employee_id, target_employee_name,
        previous_values, new_values, changed_fields,
        ip_address, browser_information, session_id
    ) VALUES (
        mod_name, TG_TABLE_NAME, rec_id, TG_OP,
        app_uid, app_uemail, app_urole,
        target_emp_id, target_emp_name,
        v_old_data, v_new_data, v_changed,
        app_ip, app_ua, app_sid
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_assets_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $function$
;
ALTER TABLE public.application_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrms_refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_application_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origination_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_item_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrms_refresh_sessions FORCE ROW LEVEL SECURITY;
CREATE TRIGGER audit_assets_trigger AFTER INSERT OR UPDATE OR DELETE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER trg_audit_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER trg_audit_employee AFTER INSERT OR UPDATE OR DELETE ON public.employee FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER trg_audit_leaves AFTER INSERT OR UPDATE OR DELETE ON public.leaves FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER trg_audit_payslips AFTER INSERT OR UPDATE OR DELETE ON public.payslips FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER trg_audit_user_feature_access AFTER INSERT OR UPDATE OR DELETE ON public.user_feature_access FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER trg_audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_assets_updated_at_column();
-- The real database has an email_queue webhook trigger. Recreate its
-- name/timing/argument shape in disposable CI, but NEVER install the network
-- implementation or point at a real service. This stub performs zero I/O.
CREATE SCHEMA supabase_functions;
CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
LANGUAGE plpgsql AS $sec018_no_network$
BEGIN
  RETURN NEW;
END
$sec018_no_network$;
CREATE TRIGGER "Trigger Send Email" AFTER INSERT ON public.email_queue
FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(
  'https://example.invalid/functions/v1/send-email',
  'POST', '{"Content-type":"application/json"}', '{}', '5000'
);
-- No HTTP calls, real endpoints, or email deliveries are possible here.
INSERT INTO public.users (id,email,password,role,"firstName","lastName","isActive",token_version)
VALUES ('11111111-1111-4111-8111-111111111111','alice@example.invalid','synthetic-unusable-password','employee','Alice','Synthetic',true,1),
('22222222-2222-4222-8222-222222222222','bob@example.invalid','synthetic-unusable-password','employee','Bob','Synthetic',true,1);
