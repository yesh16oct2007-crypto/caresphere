import { Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createNotification } from '../services/notificationService.js';

export function getPendingDoctors(req: AuthenticatedRequest, res: Response): void {
  try {
    const pendingDoctors = db.prepare(`
      SELECT 
        dp.id as doctor_profile_id,
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.created_at,
        dp.hospital_name,
        dp.hospital_location,
        dp.registration_number,
        dp.state_medical_council,
        dp.specialization,
        dp.qualifications,
        dp.experience_years,
        dp.consultation_fee,
        dp.bio,
        dp.document_url,
        dp.council_certificate_url,
        dp.degree_certificate_url,
        dp.id_proof_url,
        dp.verification_status,
        dp.verification_checklist,
        dp.verification_notes,
        dp.room_number,
        dp.floor,
        dp.wing,
        d.name as department_name
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON dp.department_id = d.id
      WHERE dp.verification_status = 'pending'
      ORDER BY u.created_at ASC
    `).all();

    res.json({ pending_doctors: pendingDoctors });
  } catch (err: any) {
    console.error('Error fetching pending doctors:', err);
    res.status(500).json({ error: 'Failed to retrieve pending doctor applications.' });
  }
}

export function getAllDoctorsAdmin(req: AuthenticatedRequest, res: Response): void {
  try {
    const doctors = db.prepare(`
      SELECT 
        dp.id as doctor_profile_id,
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.created_at,
        dp.hospital_name,
        dp.hospital_location,
        dp.registration_number,
        dp.state_medical_council,
        dp.specialization,
        dp.qualifications,
        dp.experience_years,
        dp.consultation_fee,
        dp.bio,
        dp.document_url,
        dp.council_certificate_url,
        dp.degree_certificate_url,
        dp.id_proof_url,
        dp.verification_status,
        dp.verification_checklist,
        dp.verification_notes,
        dp.verified_at,
        dp.room_number,
        dp.floor,
        dp.wing,
        dp.current_presence_status,
        d.name as department_name
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON dp.department_id = d.id
      ORDER BY 
        CASE dp.verification_status 
          WHEN 'pending' THEN 1 
          WHEN 'verified' THEN 2 
          WHEN 'approved' THEN 2 
          WHEN 'suspended' THEN 3 
          ELSE 4 
        END,
        u.created_at DESC
    `).all();

    res.json({ doctors });
  } catch (err: any) {
    console.error('Error fetching all doctors for admin:', err);
    res.status(500).json({ error: 'Failed to retrieve doctors list.' });
  }
}

export function verifyDoctor(req: AuthenticatedRequest, res: Response): void {
  try {
    const { doctor_profile_id, status, notes, checklist } = req.body;

    const validStatuses = ['verified', 'approved', 'rejected', 'suspended', 'pending'];
    if (!doctor_profile_id || !validStatuses.includes(status)) {
      res.status(400).json({ 
        error: `doctor_profile_id and valid status (${validStatuses.join(', ')}) are required.` 
      });
      return;
    }

    const doc = db.prepare(`
      SELECT dp.id, dp.user_id, u.name, u.email, dp.registration_number, dp.state_medical_council
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = ?
    `).get(doctor_profile_id) as any;

    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const checklistStr = typeof checklist === 'object' ? JSON.stringify(checklist) : (checklist || null);

    db.prepare(`
      UPDATE doctor_profiles 
      SET verification_status = ?,
          verification_notes = ?,
          verification_checklist = COALESCE(?, verification_checklist),
          verified_at = CASE WHEN ? IN ('verified', 'approved') THEN CURRENT_TIMESTAMP ELSE verified_at END,
          verified_by = ?
      WHERE id = ?
    `).run(status, notes || null, checklistStr, status, req.user!.id, doctor_profile_id);

    // If verified or approved, ensure default availability schedule exists
    if (status === 'verified' || status === 'approved') {
      const existingAvail = db.prepare('SELECT id FROM doctor_availability WHERE doctor_id = ?').get(doctor_profile_id);
      if (!existingAvail) {
        const insertAvail = db.prepare(`
          INSERT OR IGNORE INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (let day = 1; day <= 5; day++) {
          insertAvail.run(doctor_profile_id, day, '09:00', '13:00', 30);
          insertAvail.run(doctor_profile_id, day, '14:00', '17:00', 30);
        }
        insertAvail.run(doctor_profile_id, 6, '09:00', '12:00', 30);
      }
    }

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      `DOCTOR_STATUS_${status.toUpperCase()}`,
      'DOCTOR_PROFILES',
      String(doctor_profile_id),
      `Doctor ${doc.name} (Reg: ${doc.registration_number}, Council: ${doc.state_medical_council || 'NMC'}) status set to ${status}. Notes: ${notes || 'None'}`,
      req.ip
    );

    // Notify doctor
    const titleKey = (status === 'verified' || status === 'approved') 
      ? 'notif.doctor_approved_title' 
      : status === 'suspended'
      ? 'notif.doctor_suspended_title'
      : 'notif.doctor_rejected_title';

    const msgKey = (status === 'verified' || status === 'approved')
      ? 'notif.doctor_approved_msg'
      : status === 'suspended'
      ? 'notif.doctor_suspended_msg'
      : 'notif.doctor_rejected_msg';

    createNotification(
      doc.user_id,
      titleKey,
      msgKey,
      { doctorName: doc.name, status, notes: notes || '' },
      (status === 'verified' || status === 'approved') ? 'success' : 'alert'
    );

    res.json({
      message: `Doctor status updated to ${status} successfully.`,
      doctor_profile_id,
      status,
      checklist: checklist || null
    });
  } catch (err: any) {
    console.error('Error verifying doctor:', err);
    res.status(500).json({ error: 'Failed to update doctor verification status.' });
  }
}

export function getSystemStats(req: AuthenticatedRequest, res: Response): void {
  try {
    const totalPatients = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'patient'").get() as any).count;
    const approvedDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles WHERE verification_status IN ('approved', 'verified')").get() as any).count;
    const pendingDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles WHERE verification_status = 'pending'").get() as any).count;
    const suspendedDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles WHERE verification_status = 'suspended'").get() as any).count;
    const totalAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments").get() as any).count;
    const activeAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'").get() as any).count;

    const todayDate = new Date().toISOString().slice(0, 10);
    const todayAppointments = (db.prepare('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?').get(todayDate) as any).count;

    res.json({
      stats: {
        total_patients: totalPatients,
        approved_doctors: approvedDoctors,
        pending_doctors: pendingDoctors,
        suspended_doctors: suspendedDoctors,
        total_appointments: totalAppointments,
        active_appointments: activeAppointments,
        today_appointments: todayAppointments
      }
    });
  } catch (err: any) {
    console.error('Error getting system stats:', err);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
}

export function getAllUsers(req: AuthenticatedRequest, res: Response): void {
  try {
    const users = db.prepare(`
      SELECT id, name, email, phone, role, preferred_language, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json({ users });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

export function getAuditLogs(req: AuthenticatedRequest, res: Response): void {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    res.json({ audit_logs: logs });
  } catch (err: any) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}

export function createAnnouncement(req: AuthenticatedRequest, res: Response): void {
  try {
    const { title, content, priority = 'normal' } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required.' });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO announcements (title, content, priority)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(title, content, priority);

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_ANNOUNCEMENT',
      'ANNOUNCEMENTS',
      String(result.lastInsertRowid),
      `Title: ${title}`,
      req.ip
    );

    res.status(201).json({ message: 'Announcement created successfully.', id: result.lastInsertRowid });
  } catch (err: any) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Failed to create announcement.' });
  }
}

export function deleteAnnouncement(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
    res.json({ message: 'Announcement deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
}
