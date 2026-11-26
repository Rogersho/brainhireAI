import { Router } from 'express';
import authRoutes from './auth.routes.js';
import jobsRoutes from './jobs.routes.js';
import applicantsRoutes from './applicants.routes.js';
import screeningRoutes from './screening.routes.js';
import notificationsRoutes from './notifications.routes.js';
import uploadRoutes from './upload.routes.js';
import userRoutes from './user.routes.js';
import aiRoutes from './ai.routes.js';
import organizationRoutes from './organization.routes.js';
import adminRoutes from './admin.routes.js';
import employeesRoutes from './employees.routes.js';
import checklistsRoutes from './checklists.routes.js';
import documentsRoutes from './documents.routes.js';
import interviewsRoutes from './interviews.routes.js';
import offersRoutes from './offers.routes.js';
import attendanceRoutes from './attendance.routes.js';
import leaveRoutes from './leave.routes.js';
import payrollRoutes from './payroll.routes.js';
import expensesRoutes from './expenses.routes.js';
import assetsRoutes from './assets.routes.js';
import performanceRoutes from './performance.routes.js';
import communicationsRoutes from './communications.routes.js';
import helpdeskRoutes from './helpdesk.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', database: 'postgresql', product: 'Hoobe HR' });
});

router.use('/auth', authRoutes);
router.use('/jobs', jobsRoutes);
router.use('/applicants', applicantsRoutes);
router.use('/screening', screeningRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/upload', uploadRoutes);
router.use('/user', userRoutes);
router.use('/ai', aiRoutes);

// Phase 1: Company, Departments, Locations, Positions & Admin RBAC/Audit
router.use('/', organizationRoutes);
router.use('/admin', adminRoutes);

// Phase 2: Employee Directory, Org Chart, Checklists & S3 Document Vault
router.use('/employees', employeesRoutes);
router.use('/checklists', checklistsRoutes);
router.use('/documents', documentsRoutes);

// Phase 3: ATS Interviews, Scorecards & Job Offers
router.use('/interviews', interviewsRoutes);
router.use('/offers', offersRoutes);

// Phase 4: Daily HR Operations — Attendance & Leave / PTO
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);

// Phase 5: Payroll, Compensation, Expenses & Company Assets
router.use('/payroll', payrollRoutes);
router.use('/expenses', expensesRoutes);
router.use('/assets', assetsRoutes);

// Phase 6: Performance, Policies, Announcements, Helpdesk & Executive Analytics
router.use('/performance', performanceRoutes);
router.use('/communications', communicationsRoutes);
router.use('/helpdesk', helpdeskRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
