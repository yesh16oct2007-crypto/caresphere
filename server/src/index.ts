import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/database.js';
import { ensureDatabaseSeeded } from './db/seed.js';
import { authenticateToken, optionalAuthenticateToken, requireRole } from './middleware/authMiddleware.js';
import {
  registerPatient,
  registerDoctor,
  registerHospitalAdmin,
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
  deleteAnnouncement,
  getDoctorApprovalHistory,
  getDoctorDocuments
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
import {
  chatWithAssistant,
  orchestrateAgents,
  hospitalAdminAssistant,
  verifyDoctorAI,
  getDoctorVerificationReport,
  getHospitalRecommendations,
  triggerAutomationCycle,
  getAutomationLogs
} from './controllers/aiController.js';
import { startAutomationWorker } from './services/automationEngine.js';
import { uploadRecord, uploadReport, uploadMedicalRecordMiddleware } from './middleware/uploadMiddleware.js';
import {
  uploadMedicalRecord,
  getPatientMedicalRecords,
  getMedicalRecordById,
  downloadMedicalRecord,
  deleteMedicalRecord,
  shareMedicalRecord,
  revokeMedicalRecordShare,
  getMedicalRecordAccessLogs,
  getRecordsSharedWithDoctor
} from './controllers/medicalRecordController.js';
import {
  getTeleconsultationDoctors,
  bookOnlineConsultation,
  getConsultationRoom,
  postRoomSignalOrMessage,
  completeOnlineConsultation,
  getMyOnlineConsultations
} from './controllers/consultationController.js';
import {
  getAdminHospitals,
  getAnalyticsOverview,
  getHospitalDetailedAnalytics,
  exportAnalyticsReport
} from './controllers/analyticsController.js';
import {
  explainMedicalReport,
  getReportExplainerHistory
} from './controllers/aiReportExplainerController.js';
import {
  getLiveResources,
  getHospitalResources,
  updateHospitalResource
} from './controllers/resourceController.js';
import {
  getPatientMedicines,
  addMedicineReminder,
  logMedicineDose,
  deleteMedicineReminder,
  getMedicineHistory
} from './controllers/medicineReminderController.js';
import {
  getInsuranceProviders,
  getHospitalInsuranceInfo,
  getInsuranceComparison,
  getMyPolicies,
  saveMyPolicy,
  deleteMyPolicy
} from './controllers/insuranceController.js';
import {
  getNavigationHospitals,
  getHospitalFloorData,
  computeIndoorRoute
} from './controllers/navigationController.js';
import {
  getMyFollowUps,
  getDoctorFollowUps,
  scheduleFollowUp,
  submitPatientProgress,
  reviewPatientProgress
} from './controllers/followupController.js';
import {
  getAllHospitals,
  createHospital,
  updateHospital
} from './controllers/hospitalMgmtController.js';
import {
  getEmergencyHotlines,
  findNearbyHospitals,
  getMyEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  submitEmergencyRequest,
  getMyEmergencyRequests,
  getHospitalEmergencyRequests,
  updateEmergencyRequestStatus
} from './controllers/emergencyController.js';
import {
  createPrescription,
  getPrescriptionById,
  getMyPrescriptions,
  getDoctorPrescriptions,
  downloadPrescriptionPdf
} from './controllers/prescriptionController.js';
import {
  getLabCatalogue,
  getRecommendedLabTests,
  bookLabTest,
  getMyLabBookings,
  getHospitalLabBookings,
  updateLabBookingStatus,
  uploadLabReport,
  downloadLabReport
} from './controllers/laboratoryController.js';
import {
  getAllPharmacies,
  getPatientHospitalPharmacy,
  getMedicines,
  addMedicine,
  getPrescriptionMedicineAvailability,
  createPharmacyOrder,
  getMyPharmacyOrders,
  getPharmacyOrders,
  updateOrderStatus,
  getPharmacyInventory,
  updateInventoryStock,
  getPharmacySalesReport
} from './controllers/pharmacyController.js';

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
app.post('/api/auth/register-hospital-admin', simpleRateLimiter(10, 60000), registerHospitalAdmin);
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
app.get('/api/admin/doctor/:id/history', authenticateToken, requireRole(['admin']), getDoctorApprovalHistory);
app.get('/api/admin/doctor/:id/documents', authenticateToken, requireRole(['admin']), getDoctorDocuments);
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

// ----------------- AI ASSISTANT & AUTONOMOUS ORCHESTRATION -----------------
app.post('/api/ai/chat', simpleRateLimiter(40, 60000), optionalAuthenticateToken, chatWithAssistant);
app.post('/api/ai/orchestrate', simpleRateLimiter(40, 60000), optionalAuthenticateToken, orchestrateAgents);
app.post('/api/ai/admin-assistant', authenticateToken, requireRole(['admin', 'hospital_admin', 'superadmin']), hospitalAdminAssistant);
app.post('/api/ai/verify-doctor/:id', authenticateToken, requireRole(['admin', 'hospital_admin', 'superadmin']), verifyDoctorAI);
app.get('/api/ai/doctor/:id/verification-report', authenticateToken, getDoctorVerificationReport);
app.get('/api/ai/hospital/recommendations', authenticateToken, requireRole(['admin', 'hospital_admin', 'superadmin']), getHospitalRecommendations);

// ----------------- AUTONOMOUS OPERATIONS ENGINE -----------------
app.post('/api/automation/trigger', authenticateToken, requireRole(['admin', 'hospital_admin', 'superadmin']), triggerAutomationCycle);
app.get('/api/automation/logs', authenticateToken, requireRole(['admin', 'hospital_admin', 'superadmin']), getAutomationLogs);

// ----------------- 1. DIGITAL PATIENT MEDICAL RECORDS -----------------
// Primary frontend routes (/api/records)
app.post('/api/records', authenticateToken, uploadMedicalRecordMiddleware, uploadMedicalRecord);
app.get('/api/records', authenticateToken, getPatientMedicalRecords);
app.get('/api/records/shared-with-me', authenticateToken, requireRole(['doctor']), getRecordsSharedWithDoctor);
app.get('/api/records/:id', authenticateToken, getMedicalRecordById);
app.get('/api/records/:id/download', authenticateToken, downloadMedicalRecord);
app.delete('/api/records/:id', authenticateToken, deleteMedicalRecord);
app.post('/api/records/:id/share', authenticateToken, shareMedicalRecord);
app.delete('/api/records/:id/share/:doctorId', authenticateToken, revokeMedicalRecordShare);
app.get('/api/records/:id/logs', authenticateToken, getMedicalRecordAccessLogs);

// Compatibility alias routes (/api/medical-records)
app.post('/api/medical-records', authenticateToken, uploadMedicalRecordMiddleware, uploadMedicalRecord);
app.get('/api/medical-records', authenticateToken, getPatientMedicalRecords);
app.get('/api/medical-records/shared-with-me', authenticateToken, requireRole(['doctor']), getRecordsSharedWithDoctor);
app.get('/api/medical-records/:id', authenticateToken, getMedicalRecordById);
app.get('/api/medical-records/:id/download', authenticateToken, downloadMedicalRecord);
app.delete('/api/medical-records/:id', authenticateToken, deleteMedicalRecord);
app.post('/api/medical-records/:id/share', authenticateToken, shareMedicalRecord);
app.delete('/api/medical-records/:id/share/:doctorId', authenticateToken, revokeMedicalRecordShare);
app.get('/api/medical-records/:id/logs', authenticateToken, getMedicalRecordAccessLogs);

// ----------------- 2. ONLINE DOCTOR CONSULTATION -----------------
app.get('/api/consultations/doctors', getTeleconsultationDoctors);
app.post('/api/consultations/book', authenticateToken, bookOnlineConsultation);
app.get('/api/consultations/my', authenticateToken, getMyOnlineConsultations);
app.get('/api/consultations/room/:roomId', authenticateToken, getConsultationRoom);
app.post('/api/consultations/room/:roomId/signal', authenticateToken, postRoomSignalOrMessage);
app.post('/api/consultations/room/:roomId/complete', authenticateToken, requireRole(['doctor']), completeOnlineConsultation);

// ----------------- 3. HOSPITAL-WISE ADMIN ANALYTICS -----------------
app.get('/api/admin/analytics/overview', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), getAnalyticsOverview);
app.get('/api/admin/analytics/hospitals', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), getAdminHospitals);
app.get('/api/admin/analytics/hospital/:hospitalId', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), getHospitalDetailedAnalytics);
app.get('/api/admin/analytics/export', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), exportAnalyticsReport);

// Aliases for /api/analytics/...
app.get('/api/analytics/overview', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), getAnalyticsOverview);
app.get('/api/analytics/hospitals', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), getAdminHospitals);
app.get('/api/analytics/hospital/:hospitalId', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), getHospitalDetailedAnalytics);
app.get('/api/analytics/export', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), exportAnalyticsReport);

// ----------------- 4. AI MEDICAL REPORT EXPLAINER -----------------
app.post('/api/ai/explain-report', authenticateToken, uploadReport.single('file'), explainMedicalReport);
app.get('/api/ai/report-history', authenticateToken, getReportExplainerHistory);

// ----------------- 5. LIVE HOSPITAL RESOURCE AVAILABILITY -----------------
app.get('/api/resources', getLiveResources);
app.get('/api/resources/hospital/:hospitalId', getHospitalResources);
app.put('/api/resources/:id', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), updateHospitalResource);

// ----------------- 6. MEDICINE REMINDER SYSTEM -----------------
app.get('/api/medicines', authenticateToken, requireRole(['patient']), getPatientMedicines);
app.post('/api/medicines', authenticateToken, requireRole(['patient']), addMedicineReminder);
app.post('/api/medicines/:id/log', authenticateToken, requireRole(['patient']), logMedicineDose);
app.delete('/api/medicines/:id', authenticateToken, requireRole(['patient']), deleteMedicineReminder);
app.get('/api/medicines/history', authenticateToken, requireRole(['patient']), getMedicineHistory);

// ----------------- 7. HEALTH INSURANCE ASSISTANCE -----------------
app.get('/api/insurance/providers', getInsuranceProviders);
app.get('/api/insurance/hospitals', getInsuranceComparison);
app.get('/api/insurance/hospital/:hospitalId', getHospitalInsuranceInfo);
app.get('/api/insurance/comparison', getInsuranceComparison);
app.get('/api/insurance/my-policies', authenticateToken, requireRole(['patient']), getMyPolicies);
app.get('/api/insurance/policies', authenticateToken, requireRole(['patient']), getMyPolicies);
app.post('/api/insurance/my-policies', authenticateToken, requireRole(['patient']), saveMyPolicy);
app.post('/api/insurance/policies', authenticateToken, requireRole(['patient']), saveMyPolicy);
app.delete('/api/insurance/my-policies/:id', authenticateToken, requireRole(['patient']), deleteMyPolicy);
app.delete('/api/insurance/policies/:id', authenticateToken, requireRole(['patient']), deleteMyPolicy);

// ----------------- 8. HOSPITAL INDOOR NAVIGATION -----------------
app.get('/api/navigation/hospitals', getNavigationHospitals);
app.get('/api/navigation/hospital/:hospitalId/floors', getHospitalFloorData);
app.get('/api/navigation/route', computeIndoorRoute);

// ----------------- 9. REMOTE PATIENT FOLLOW-UP -----------------
app.get('/api/followups/my', authenticateToken, requireRole(['patient']), getMyFollowUps);
app.get('/api/followups/doctor', authenticateToken, requireRole(['doctor']), getDoctorFollowUps);
app.post('/api/followups', authenticateToken, requireRole(['doctor']), scheduleFollowUp);
app.put('/api/followups/:id/submit-progress', authenticateToken, requireRole(['patient']), submitPatientProgress);
app.put('/api/followups/:id/review', authenticateToken, requireRole(['doctor']), reviewPatientProgress);

// ----------------- 10. MULTI-HOSPITAL MANAGEMENT -----------------
app.get('/api/hospitals', getAllHospitals);
app.post('/api/admin/hospitals', authenticateToken, requireRole(['admin', 'superadmin']), createHospital);
app.put('/api/admin/hospitals/:id', authenticateToken, requireRole(['admin', 'superadmin', 'hospital_admin']), updateHospital);

// ----------------- 11. EMERGENCY SOS & CONTACT SYSTEM -----------------
app.get('/api/emergency/hotlines', getEmergencyHotlines);
app.get('/api/emergency/nearby-hospitals', findNearbyHospitals);
app.get('/api/emergency/contacts', authenticateToken, requireRole(['patient']), getMyEmergencyContacts);
app.post('/api/emergency/contacts', authenticateToken, requireRole(['patient']), addEmergencyContact);
app.put('/api/emergency/contacts/:id', authenticateToken, requireRole(['patient']), updateEmergencyContact);
app.delete('/api/emergency/contacts/:id', authenticateToken, requireRole(['patient']), deleteEmergencyContact);
app.post('/api/emergency/request', submitEmergencyRequest);
app.get('/api/emergency/my-requests', authenticateToken, requireRole(['patient']), getMyEmergencyRequests);
app.get('/api/emergency/hospital-requests', authenticateToken, requireRole(['admin', 'hospital_admin', 'superadmin']), getHospitalEmergencyRequests);
app.put('/api/emergency/requests/:id/status', authenticateToken, requireRole(['admin', 'hospital_admin', 'superadmin']), updateEmergencyRequestStatus);

// ----------------- 12. DIGITAL PRESCRIPTIONS -----------------
app.post('/api/prescriptions', authenticateToken, requireRole(['doctor']), createPrescription);
app.get('/api/prescriptions/my-prescriptions', authenticateToken, requireRole(['patient']), getMyPrescriptions);
app.get('/api/prescriptions/doctor-prescriptions', authenticateToken, requireRole(['doctor']), getDoctorPrescriptions);
app.get('/api/prescriptions/:id', authenticateToken, getPrescriptionById);
app.get('/api/prescriptions/:id/download', authenticateToken, downloadPrescriptionPdf);

// ----------------- 13. LABORATORY DIAGNOSTIC SYSTEM -----------------
app.get('/api/lab/catalogue', getLabCatalogue);
app.get('/api/lab/recommended', authenticateToken, requireRole(['patient']), getRecommendedLabTests);
app.post('/api/lab/book', authenticateToken, requireRole(['patient']), bookLabTest);
app.get('/api/lab/my-bookings', authenticateToken, requireRole(['patient']), getMyLabBookings);
app.get('/api/lab/hospital-bookings', authenticateToken, requireRole(['lab_staff', 'hospital_admin', 'admin', 'superadmin']), getHospitalLabBookings);
app.put('/api/lab/bookings/:id/status', authenticateToken, requireRole(['lab_staff', 'hospital_admin', 'admin', 'superadmin']), updateLabBookingStatus);
app.post('/api/lab/bookings/:id/upload-report', authenticateToken, requireRole(['lab_staff', 'hospital_admin', 'admin', 'superadmin']), uploadReport.single('file'), uploadLabReport);
app.get('/api/lab/bookings/:id/report', authenticateToken, downloadLabReport);

// ----------------- 14. ONLINE PHARMACY & MEDICINE ORDERS -----------------
app.get('/api/pharmacy/list', getAllPharmacies);
app.get('/api/pharmacy/hospital-pharmacy', getPatientHospitalPharmacy);
app.get('/api/pharmacy/medicines', getMedicines);
app.post('/api/pharmacy/medicines', authenticateToken, requireRole(['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin']), addMedicine);
app.get('/api/pharmacy/prescription-availability/:id', authenticateToken, getPrescriptionMedicineAvailability);
app.post('/api/pharmacy/orders', authenticateToken, requireRole(['patient']), createPharmacyOrder);
app.get('/api/pharmacy/my-orders', authenticateToken, requireRole(['patient']), getMyPharmacyOrders);
app.get('/api/pharmacy/hospital-orders', authenticateToken, requireRole(['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin']), getPharmacyOrders);
app.put('/api/pharmacy/orders/:id/status', authenticateToken, requireRole(['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin']), updateOrderStatus);
app.get('/api/pharmacy/inventory', authenticateToken, requireRole(['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin']), getPharmacyInventory);
app.put('/api/pharmacy/inventory/:id', authenticateToken, requireRole(['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin']), updateInventoryStock);
app.get('/api/pharmacy/sales-report', authenticateToken, requireRole(['pharmacy_staff', 'hospital_admin', 'admin', 'superadmin']), getPharmacySalesReport);

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
  startAutomationWorker(30);
  app.listen(PORT, () => {
    console.log(`CareSphere Backend Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}
