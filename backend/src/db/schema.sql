-- Hoobe HR PostgreSQL Schema (Core + Phase 1 + Phase 2)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'Candidate',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_key TEXT,
  last_login_at TIMESTAMPTZ,
  resume_text TEXT,
  resume_hash VARCHAR(128),
  resume_key TEXT,
  resume_cached_at TIMESTAMPTZ,
  skills TEXT[] NOT NULL DEFAULT '{}',
  ai_strengths TEXT[] NOT NULL DEFAULT '{}',
  ai_weaknesses TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent Phase 1 migrations on existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(30);

-- Upgrade legacy role constraint and map Recruiter -> HRManager
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
  END LOOP;
END $$;

UPDATE users SET role = 'HRManager' WHERE role = 'Recruiter';

-- Ensure at least one Admin exists if any HRManager exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'Admin')
     AND EXISTS (SELECT 1 FROM users WHERE role = 'HRManager') THEN
    UPDATE users
    SET role = 'Admin'
    WHERE id = (SELECT id FROM users WHERE role = 'HRManager' ORDER BY created_at ASC LIMIT 1);
  END IF;
END $$;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('Admin', 'HRManager', 'HiringManager', 'Employee', 'Candidate'));

-- ============================================================================
-- PHASE 1: COMPANY STRUCTURE & GOVERNANCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL DEFAULT 'Hoobe HR',
  legal_name VARCHAR(200) NOT NULL DEFAULT '',
  industry VARCHAR(120) NOT NULL DEFAULT '',
  company_size VARCHAR(60) NOT NULL DEFAULT '',
  website VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  default_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
  work_week_days TEXT[] NOT NULL DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  logo_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO company_settings (company_name, industry, default_currency, timezone)
SELECT 'Hoobe HR', 'Technology', 'USD', 'UTC'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  code VARCHAR(30) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  head_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  budget_amount NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  city VARCHAR(120) NOT NULL DEFAULT '',
  country VARCHAR(120) NOT NULL DEFAULT '',
  timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
  address TEXT NOT NULL DEFAULT '',
  is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  grade VARCHAR(50) NOT NULL DEFAULT '',
  min_salary NUMERIC(12, 2),
  max_salary NUMERIC(12, 2),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(150) NOT NULL DEFAULT '',
  actor_role VARCHAR(30) NOT NULL DEFAULT '',
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RECRUITING: JOBS, SAVED JOBS, APPLICANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  department VARCHAR(120) NOT NULL,
  location VARCHAR(150) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Closed')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(200) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  ai_strengths TEXT NOT NULL DEFAULT '',
  ai_gaps TEXT NOT NULL DEFAULT '',
  ai_recommendation TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Shortlisted', 'In Review', 'Pending', 'Rejected', 'Hired')),
  source VARCHAR(100) NOT NULL DEFAULT 'Job Board',
  skills TEXT[] NOT NULL DEFAULT '{}',
  experience TEXT NOT NULL DEFAULT '',
  resume_url TEXT,
  resume_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE applicants ADD COLUMN IF NOT EXISTS resume_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_unique_user_job
  ON applicants (job_id, user_id)
  WHERE user_id IS NOT NULL;

-- ============================================================================
-- PHASE 2: EMPLOYEES, ORG CHART, ONBOARDING/OFFBOARDING & S3 DOCUMENT VAULT
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  employee_code VARCHAR(40) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  work_email VARCHAR(255) NOT NULL UNIQUE,
  personal_email VARCHAR(255),
  phone VARCHAR(50),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  job_title VARCHAR(200) NOT NULL,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employment_type VARCHAR(30) NOT NULL DEFAULT 'Full-Time'
    CHECK (employment_type IN ('Full-Time', 'Part-Time', 'Contract', 'Intern')),
  work_mode VARCHAR(20) NOT NULL DEFAULT 'On-Site'
    CHECK (work_mode IN ('On-Site', 'Remote', 'Hybrid')),
  status VARCHAR(30) NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Probation', 'On Leave', 'Suspended', 'Terminated')),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  probation_end_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  date_of_birth DATE,
  nationality VARCHAR(100),
  address TEXT,
  emergency_contact_name VARCHAR(150),
  emergency_contact_phone VARCHAR(50),
  source_applicant_id UUID UNIQUE REFERENCES applicants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'Onboarding' CHECK (type IN ('Onboarding', 'Offboarding')),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(40) NOT NULL DEFAULT 'Paperwork'
    CHECK (category IN ('Paperwork', 'IT & Access', 'Training', 'Equipment', 'Exit', 'General')),
  assignee_role VARCHAR(30) NOT NULL DEFAULT 'HRManager',
  due_offset_days INTEGER NOT NULL DEFAULT 7,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employee_checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'Onboarding' CHECK (type IN ('Onboarding', 'Offboarding')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(40) NOT NULL DEFAULT 'Paperwork'
    CHECK (category IN ('Paperwork', 'IT & Access', 'Training', 'Equipment', 'Exit', 'General')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'Other'
    CHECK (category IN ('Contract', 'ID / Passport', 'NDA', 'Tax Form', 'Certificate', 'Offer Letter', 'Resume', 'Other')),
  s3_key TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_visible_to_employee BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default Onboarding & Offboarding templates if none exist
DO $$
DECLARE
  onb_id UUID;
  off_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM onboarding_templates WHERE name = 'Standard Employee Onboarding') THEN
    INSERT INTO onboarding_templates (name, type, description)
    VALUES ('Standard Employee Onboarding', 'Onboarding', 'Default checklist for all newly hired employees.')
    RETURNING id INTO onb_id;

    INSERT INTO onboarding_template_tasks (template_id, title, description, category, assignee_role, due_offset_days, sort_order) VALUES
      (onb_id, 'Sign employment contract & NDA', 'Upload signed contract and confidentiality agreement to document vault.', 'Paperwork', 'HRManager', 1, 1),
      (onb_id, 'Collect government ID & tax forms', 'Verify identity documentation and payroll tax forms.', 'Paperwork', 'Employee', 2, 2),
      (onb_id, 'Provision company email & workspace access', 'Create corporate email, SSO, and tool permissions.', 'IT & Access', 'HRManager', 1, 3),
      (onb_id, 'Issue laptop & work equipment', 'Prepare workstation, badge, and accessories.', 'Equipment', 'HRManager', 1, 4),
      (onb_id, 'Complete HR orientation & handbook review', 'Review company policies, leave rules, and benefits.', 'Training', 'Employee', 5, 5),
      (onb_id, 'Schedule 30-day manager check-in', 'Align on role expectations and initial 30/60/90 day goals.', 'General', 'HiringManager', 14, 6);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM onboarding_templates WHERE name = 'Standard Employee Offboarding') THEN
    INSERT INTO onboarding_templates (name, type, description)
    VALUES ('Standard Employee Offboarding', 'Offboarding', 'Default checklist for departing employees.')
    RETURNING id INTO off_id;

    INSERT INTO onboarding_template_tasks (template_id, title, description, category, assignee_role, due_offset_days, sort_order) VALUES
      (off_id, 'Conduct exit interview', 'Schedule and document feedback from departing team member.', 'Exit', 'HRManager', 3, 1),
      (off_id, 'Complete knowledge transfer handover', 'Document active projects and transfer ownership to manager.', 'General', 'Employee', 5, 2),
      (off_id, 'Collect laptop, keys & access badges', 'Verify return of all assigned company hardware.', 'Equipment', 'HRManager', 7, 3),
      (off_id, 'Revoke IT accounts & system access', 'Disable SSO, email, repositories, and cloud credentials.', 'IT & Access', 'Admin', 7, 4),
      (off_id, 'Process final payroll & unused leave payout', 'Confirm final settlement and issue exit paperwork.', 'Paperwork', 'HRManager', 7, 5);
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: ENHANCED ATS (REQUISITIONS, PIPELINE, INTERVIEWS, SCORECARDS, OFFERS)
-- ============================================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hiring_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type VARCHAR(30) NOT NULL DEFAULT 'Full-Time';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_mode VARCHAR(20) NOT NULL DEFAULT 'On-Site';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min NUMERIC(12, 2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max NUMERIC(12, 2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS headcount INTEGER NOT NULL DEFAULT 1;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS filled_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'Approved';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closing_date DATE;

ALTER TABLE applicants ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(30) NOT NULL DEFAULT 'Applied';
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS expected_salary NUMERIC(12, 2);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS notice_period VARCHAR(60);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Expand applicants status constraint to cover both legacy and full ATS stages
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'applicants'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE applicants DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE applicants
  ADD CONSTRAINT applicants_status_check
  CHECK (status IN ('Applied', 'Pending', 'Screening', 'In Review', 'Shortlisted', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected', 'Withdrawn'));

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  mode VARCHAR(20) NOT NULL DEFAULT 'Video' CHECK (mode IN ('Video', 'In-Person', 'Phone')),
  meeting_link TEXT NOT NULL DEFAULT '',
  interviewer_ids UUID[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  technical_score INTEGER NOT NULL CHECK (technical_score BETWEEN 1 AND 5),
  communication_score INTEGER NOT NULL CHECK (communication_score BETWEEN 1 AND 5),
  problem_solving_score INTEGER NOT NULL CHECK (problem_solving_score BETWEEN 1 AND 5),
  culture_fit_score INTEGER NOT NULL CHECK (culture_fit_score BETWEEN 1 AND 5),
  overall_recommendation VARCHAR(30) NOT NULL CHECK (overall_recommendation IN ('Strong Hire', 'Hire', 'Neutral', 'No Hire')),
  strengths_notes TEXT NOT NULL DEFAULT '',
  concerns_notes TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (interview_id, interviewer_id)
);

CREATE TABLE IF NOT EXISTS job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  proposed_salary NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  start_date DATE NOT NULL,
  employment_type VARCHAR(30) NOT NULL DEFAULT 'Full-Time',
  benefits_summary TEXT NOT NULL DEFAULT '',
  custom_terms TEXT NOT NULL DEFAULT '',
  offer_letter_text TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Declined', 'Expired', 'Withdrawn')),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applicant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PHASE 4: ATTENDANCE, SHIFTS, HOLIDAYS & LEAVE / PTO MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  work_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  daily_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO work_schedules (name, start_time, end_time, work_days, grace_period_minutes, daily_hours, is_default)
SELECT 'Standard 9-5 (Mon-Fri)', '09:00', '17:00', ARRAY[1, 2, 3, 4, 5], 15, 8.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM work_schedules);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
  work_mode VARCHAR(20) NOT NULL DEFAULT 'Office' CHECK (work_mode IN ('Office', 'Remote', 'Field')),
  status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Half-Day', 'Absent', 'On Leave', 'Holiday')),
  notes TEXT NOT NULL DEFAULT '',
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, work_date)
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_log_id UUID REFERENCES attendance_logs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  holiday_date DATE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  annual_allowance_days NUMERIC(5, 1) NOT NULL DEFAULT 15,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  max_carryover_days NUMERIC(5, 1) NOT NULL DEFAULT 5,
  color_hex VARCHAR(20) NOT NULL DEFAULT '#141824',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO leave_types (name, code, annual_allowance_days, is_paid, requires_document, max_carryover_days, color_hex)
SELECT v.name, v.code, v.days, v.paid, v.doc, v.carry, v.color
FROM (VALUES
  ('Annual Leave', 'ANN', 20.0, TRUE, FALSE, 5.0, '#0EA5E9'),
  ('Sick Leave', 'SICK', 10.0, TRUE, TRUE, 0.0, '#F59E0B'),
  ('Parental Leave', 'PAR', 60.0, TRUE, TRUE, 0.0, '#10B981'),
  ('Bereavement Leave', 'BER', 5.0, TRUE, FALSE, 0.0, '#64748B'),
  ('Unpaid Leave', 'UNP', 30.0, FALSE, FALSE, 0.0, '#EF4444')
) AS v(name, code, days, paid, doc, carry, color)
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE leave_types.code = v.code);

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  allocated_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  used_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  pending_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5, 1) NOT NULL,
  is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL DEFAULT '',
  attachment_s3_key TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  icon VARCHAR(60) NOT NULL DEFAULT 'Bell',
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'default' CHECK (type IN ('info', 'success', 'warning', 'default')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applicants_job_id ON applicants(job_id);
CREATE INDEX IF NOT EXISTS idx_applicants_user_id ON applicants(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_checklist_employee ON employee_checklist_tasks(employee_id, type);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interviews_applicant ON interviews(applicant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_offers_applicant ON job_offers(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_notes_app ON applicant_notes(applicant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_logs(employee_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'company_settings',
    'departments',
    'locations',
    'job_positions',
    'jobs',
    'applicants',
    'employees',
    'onboarding_templates',
    'employee_checklist_tasks',
    'interviews',
    'job_offers',
    'work_schedules',
    'attendance_logs',
    'leave_types',
    'leave_requests',
    'notifications'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || tbl || '_updated_at') THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END $$;
