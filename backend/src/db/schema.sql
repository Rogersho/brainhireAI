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
