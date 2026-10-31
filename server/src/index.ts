import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/database.js';
import { ensureDatabaseSeeded } from './db/seed.js';
import { authenticateToken, requireRole } from './middleware/authMiddleware.js';
import {
  registerPatient,
  registerDoctor,
  login,
  getCurrentUser,
  updateLanguagePreference,
  updateProfile
} from './controllers/authController.js';
import {
  getApprovedDoctors,
  getDoctorById,
  getDoctorAvailableSlots,
  getDoctorSchedule,
  updateDoctorAvailability,
  updateDoctorPresence
} from './controllers/doctorController.js';
import {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus
} from './controllers/appointmentController.js';
import {
  getPendingDoctors,
  getAllDoctorsAdmin,
  verifyDoctor,
  getSystemStats,
  getAllUsers,
  getAuditLogs,
  createAnnouncement,
  deleteAnnouncement
} from './controllers/adminController.js';
import {
  getHospitalInfo,
  getDepartments,
  getFacilities,
  getFaqs,
  getAnnouncements,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from './controllers/hospitalController.js';
import { chatWithAssistant } from './controllers/aiController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema and auto-seed if fresh
initDatabase();
ensureDatabaseSeeded();

export const app = express();
const PORT = process.env.PORT || 5001;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts and font CDN for demo ease
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve uploaded certificates and documents statically (persistent disk support for Render)
const uploadCandidates = [
  fs.existsSync('/var/data') ? '/var/data/uploads' : '',
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(__dirname, '../../uploads'),
  path.resolve(__dirname, '../uploads')
].filter(Boolean);
const uploadsDir = uploadCandidates.find(d => fs.existsSync(d)) || (fs.existsSync('/var/data') ? '/var/data/uploads' : path.resolve(process.cwd(), 'uploads'));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// In-memory simple rate limiter for public sensitive endpoints
const requestCounts = new Map<string, { count: number; resetTime: number }>();
function simpleRateLimiter(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (entry.count >= limit) {
      res.status(429).json({ error: 'Too many requests. Please try again after a few moments.' });
      return;
    }

    entry.count++;
    next();
  };
}

// ----------------- HEALTH & SYSTEM -----------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CareSphere API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    supported_languages: ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa']
  });
});

// ----------------- AUTHENTICATION -----------------
app.post('/api/auth/register', simpleRateLimiter(15, 60000), registerPatient);
app.post('/api/auth/register-doctor', simpleRateLimiter(10, 60000), registerDoctor);
app.post('/api/auth/login', simpleRateLimiter(20, 60000), login);
app.get('/api/auth/me', authenticateToken, getCurrentUser);
app.put('/api/auth/update-language', authenticateToken, updateLanguagePreference);
app.put('/api/auth/profile', authenticateToken, updateProfile);

// ----------------- DOCTORS -----------------
app.get('/api/doctors', getApprovedDoctors);
app.get('/api/doctors/:id', getDoctorById);
app.get('/api/doctors/:id/availability', getDoctorAvailableSlots);
app.get('/api/doctors/me/schedule', authenticateToken, requireRole(['doctor']), getDoctorSchedule);
app.put('/api/doctors/me/availability', authenticateToken, requireRole(['doctor']), updateDoctorAvailability);
app.put('/api/doctors/me/presence', authenticateToken, requireRole(['doctor']), updateDoctorPresence);

// ----------------- APPOINTMENTS -----------------
app.post('/api/appointments', authenticateToken, createAppointment);
app.get('/api/appointments/my', authenticateToken, getMyAppointments);
app.put('/api/appointments/:id/cancel', authenticateToken, cancelAppointment);
app.put('/api/appointments/:id/reschedule', authenticateToken, rescheduleAppointment);
app.put('/api/appointments/:id/status', authenticateToken, updateAppointmentStatus);

// ----------------- ADMINISTRATOR -----------------
app.get('/api/admin/pending-doctors', authenticateToken, requireRole(['admin']), getPendingDoctors);
app.get('/api/admin/doctors', authenticateToken, requireRole(['admin']), getAllDoctorsAdmin);
app.post('/api/admin/verify-doctor', authenticateToken, requireRole(['admin']), verifyDoctor);
app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), getSystemStats);
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), getAllUsers);
app.get('/api/admin/audit-logs', authenticateToken, requireRole(['admin']), getAuditLogs);
app.post('/api/admin/announcements', authenticateToken, requireRole(['admin']), createAnnouncement);
app.delete('/api/admin/announcements/:id', authenticateToken, requireRole(['admin']), deleteAnnouncement);

// ----------------- HOSPITAL INFO & CONTENT -----------------
app.get('/api/hospital/info', getHospitalInfo);
app.get('/api/hospital/departments', getDepartments);
app.get('/api/hospital/facilities', getFacilities);
app.get('/api/hospital/faqs', getFaqs);
app.get('/api/hospital/announcements', getAnnouncements);

// ----------------- NOTIFICATIONS -----------------
app.get('/api/notifications', authenticateToken, getUserNotifications);
app.put('/api/notifications/:id/read', authenticateToken, markNotificationRead);
app.put('/api/notifications/read-all', authenticateToken, markAllNotificationsRead);

// ----------------- AI ASSISTANT -----------------
app.post('/api/ai/chat', simpleRateLimiter(40, 60000), chatWithAssistant);

// ----------------- SERVE STATIC FRONTEND (IN PRODUCTION) -----------------
const clientDistCandidates = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist')
];
const clientDistPath = clientDistCandidates.find(p => fs.existsSync(p)) || path.resolve(process.cwd(), 'client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Global 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: `Endpoint ${req.originalUrl} not found.` });
    return;
  }
  if (fs.existsSync(clientDistPath)) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
    return;
  }
  next();
});

// Start listening if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`CareSphere Backend Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}
