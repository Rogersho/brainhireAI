================================================================================
HOOBE HR — COMPANY INTERNAL HR MANAGEMENT SYSTEM (HRMS + ATS)
MASTER ARCHITECTURE & PHASED IMPLEMENTATION PLAN
================================================================================

VISION
------
Transform Hoobe HR from an AI-powered recruiting portal into a complete,
minimalist, security-first Company Internal HR Management System that handles
the full employee lifecycle — from job requisition and AI candidate screening
through hiring, onboarding, daily attendance & leave, payroll & expenses,
performance reviews, company policies, and executive HR analytics.

CURRENT TECH STACK (PRESERVED & EXTENDED)
-----------------------------------------
- Frontend  : Next.js 16 (App Router, TypeScript, Tailwind CSS, Redux Toolkit) in root/
- Backend   : Express 5 + TypeScript in backend/ (routes, controllers, middleware, services, db)
- Database  : Neon PostgreSQL (relational schema with UUIDs, foreign keys, indexes, triggers)
- Storage   : Neon S3-compatible Object Storage (presigned URLs, strict prefix IDOR checks)
- AI Engine : NVIDIA NIM API (nvidia/nemotron-3.5-lightning-30b-a3b) + unpdf
- Auth      : JWT (HttpOnly cookie + Bearer header), bcryptjs, helmet, rate limiting, Zod

SYSTEM ROLE MODEL (RBAC)
------------------------
1. Admin         : Full system & company configuration, billing/settings, role assignment,
                   audit logs, full access to all HR & payroll modules.
2. HRManager     : Daily HR operations — jobs, screening, employees, onboarding/offboarding,
                   leave approvals, attendance, payroll runs, policies, helpdesk, analytics.
3. HiringManager : Department lead / team manager — create job requisitions, interview &
                   score candidates, approve team leave/timesheets/expenses, run team 1:1s & reviews.
4. Employee      : Internal worker self-service — view profile/org chart, clock in/out,
                   request leave, view payslips, submit expenses, read policies, open HR tickets,
                   track own goals/reviews.
5. Candidate     : External job applicant — browse open positions, upload CV, apply, track
                   application status & interviews.

(Note: Existing 'Recruiter' accounts will seamlessly map to 'HRManager' during Phase 1 migration.)

PHASES OVERVIEW
---------------
- phase1.txt : Foundation, Company Structure, Departments, Multi-Role RBAC & Audit Logs
- phase2.txt : Employee Directory, Org Chart, Hire-to-Employee Conversion, Onboarding/Offboarding & S3 Document Vault
- phase3.txt : Complete Hiring & ATS Suite (Requisitions, Pipeline, Interviews, Scorecards, Offer Letters & AI Copilot)
- phase4.txt : Daily HR Operations (Attendance, Clock-In/Out, Shifts, Leave/PTO Policies, Approvals & Team Calendar)
- phase5.txt : Payroll Engine, Compensation History, Payslips, Expense Claims & Company Assets
- phase6.txt : Performance Reviews & OKRs, Training, Announcements & Policies, HR Helpdesk & Executive Analytics

EXECUTION PRINCIPLE
-------------------
Every phase is independently deployable, fully typechecked (backend + frontend),
migrated cleanly on Neon PostgreSQL, secured with endpoint-level authorization,
and verified before moving to the next phase.
================================================================================
