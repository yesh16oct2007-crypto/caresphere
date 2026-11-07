import { Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createNotification } from '../services/notificationService.js';

export function getPendingDoctors(req: AuthenticatedRequest, res: Response): void {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const adminHospitalId = req.user?.hospital_id;

    let query = `
      SELECT 
        dp.id as doctor_profile_id,
        dp.hospital_id,
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
        dp.avatar_url,
        dp.document_url,
        dp.council_certificate_url,
        dp.degree_certificate_url,
        dp.id_proof_url,
        dp.verification_status,
        dp.verification_checklist,
        dp.verification_notes,
        dp.rejection_reason,
        dp.approved_by,
        dp.approved_at,
        dp.rejected_by,
        dp.rejected_at,
        dp.room_number,
        dp.floor,
        dp.wing,
        d.name as department_name,
        h.name as hospital_official_name,
        h.city as hospital_city,
        h.code as hospital_code
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON dp.department_id = d.id
      LEFT JOIN hospitals h ON dp.hospital_id = h.id
      WHERE dp.verification_status = 'pending'
    `;

    const params: any[] = [];

    // STRICT HOSPITAL ISOLATION: Hospital admin can ONLY see pending doctors for their hospital
    if (isHospitalAdmin) {
      query += ` AND dp.hospital_id = ?`;
      params.push(adminHospitalId);
    } else if (req.query.hospital_id) {
      query += ` AND dp.hospital_id = ?`;
      params.push(Number(req.query.hospital_id));
    }

    query += ` ORDER BY u.created_at ASC`;

    const pendingDoctors = db.prepare(query).all(...params);

    res.json({ pending_doctors: pendingDoctors });
  } catch (err: any) {
    console.error('Error fetching pending doctors:', err);
    res.status(500).json({ error: 'Failed to retrieve pending doctor applications.' });
  }
}

export function getAllDoctorsAdmin(req: AuthenticatedRequest, res: Response): void {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const adminHospitalId = req.user?.hospital_id;

    let query = `
      SELECT 
        dp.id as doctor_profile_id,
        dp.hospital_id,
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
        dp.avatar_url,
        dp.document_url,
        dp.council_certificate_url,
        dp.degree_certificate_url,
        dp.id_proof_url,
        dp.verification_status,
        dp.verification_checklist,
        dp.verification_notes,
        dp.rejection_reason,
        dp.approved_by,
        dp.approved_at,
        dp.rejected_by,
        dp.rejected_at,
        dp.verified_at,
        dp.room_number,
        dp.floor,
        dp.wing,
        dp.current_presence_status,
        d.name as department_name,
        h.name as hospital_official_name,
        h.city as hospital_city,
        h.code as hospital_code
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON dp.department_id = d.id
      LEFT JOIN hospitals h ON dp.hospital_id = h.id
    `;

    const params: any[] = [];

    // STRICT HOSPITAL ISOLATION: Hospital admin can ONLY see doctors for their hospital
    if (isHospitalAdmin) {
      query += ` WHERE dp.hospital_id = ?`;
      params.push(adminHospitalId);
    } else if (req.query.hospital_id) {
      query += ` WHERE dp.hospital_id = ?`;
      params.push(Number(req.query.hospital_id));
    }

    query += `
      ORDER BY 
        CASE dp.verification_status 
          WHEN 'pending' THEN 1 
          WHEN 'verified' THEN 2 
          WHEN 'approved' THEN 2 
          WHEN 'suspended' THEN 3 
          WHEN 'rejected' THEN 4
          ELSE 5 
        END,
        u.created_at DESC
    `;

    const doctors = db.prepare(query).all(...params);

    res.json({ doctors });
  } catch (err: any) {
    console.error('Error fetching all doctors for admin:', err);
    res.status(500).json({ error: 'Failed to retrieve doctors list.' });
  }
}

export function verifyDoctor(req: AuthenticatedRequest, res: Response): void {
  try {
    const {
      doctor_profile_id,
      status,
      notes,
      checklist,
      rejection_reason,
      room_number,
      floor,
      wing
    } = req.body;

    const validStatuses = ['verified', 'approved', 'rejected', 'suspended', 'pending'];
    if (!doctor_profile_id || !validStatuses.includes(status)) {
      res.status(400).json({ 
        error: `doctor_profile_id and valid status (${validStatuses.join(', ')}) are required.` 
      });
      return;
    }

    const doc = db.prepare(`
      SELECT dp.id, dp.user_id, dp.hospital_id, dp.hospital_name, u.name, u.email,
             dp.registration_number, dp.state_medical_council
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = ?
    `).get(doctor_profile_id) as any;

    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    // STRICT HOSPITAL-WISE ACCESS CONTROL:
    // A hospital admin can ONLY approve or reject doctors registered under their assigned hospital!
    if (req.user!.role === 'hospital_admin') {
      if (!req.user!.hospital_id || doc.hospital_id !== req.user!.hospital_id) {
        res.status(403).json({ 
          error: 'Access denied: You are only authorized to approve or reject doctors registered for your assigned hospital.' 
        });
        return;
      }
    }

    const checklistStr = typeof checklist === 'object' ? JSON.stringify(checklist) : (checklist || null);
    const finalReason = status === 'rejected'
      ? (rejection_reason || notes || 'Application does not meet the hospital credential requirements.').trim()
      : null;

    if (status === 'verified' || status === 'approved') {
      db.prepare(`
        UPDATE doctor_profiles 
        SET verification_status = ?,
            verification_notes = ?,
            verification_checklist = COALESCE(?, verification_checklist),
            verified_at = CURRENT_TIMESTAMP,
            verified_by = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = NULL,
            room_number = COALESCE(?, room_number),
            floor = COALESCE(?, floor),
            wing = COALESCE(?, wing)
        WHERE id = ?
      `).run(status, notes || null, checklistStr, req.user!.id, req.user!.id, room_number || null, floor || null, wing || null, doctor_profile_id);

      // Record approval in history
      try {
        db.prepare(`
          INSERT INTO doctor_approval_history (doctor_id, hospital_id, action, acted_by, acted_by_name, notes)
          VALUES (?, ?, 'approved', ?, ?, ?)
        `).run(doctor_profile_id, doc.hospital_id, req.user!.id, req.user!.name, notes || 'Doctor credentials approved.');
      } catch (hErr) {
        console.error('Failed to record approval history:', hErr);
      }

      // Ensure default availability schedule exists
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
    } else if (status === 'rejected') {
      db.prepare(`
        UPDATE doctor_profiles 
        SET verification_status = 'rejected',
            verification_notes = ?,
            rejection_reason = ?,
            rejected_by = ?,
            rejected_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(notes || null, finalReason, req.user!.id, doctor_profile_id);

      // Record rejection in history
      try {
        db.prepare(`
          INSERT INTO doctor_approval_history (doctor_id, hospital_id, action, acted_by, acted_by_name, reason, notes)
          VALUES (?, ?, 'rejected', ?, ?, ?, ?)
        `).run(doctor_profile_id, doc.hospital_id, req.user!.id, req.user!.name, finalReason, notes || null);
      } catch (hErr) {
        console.error('Failed to record rejection history:', hErr);
      }
    } else {
      // suspended or reset to pending
      db.prepare(`
        UPDATE doctor_profiles 
        SET verification_status = ?,
            verification_notes = ?,
            verification_checklist = COALESCE(?, verification_checklist)
        WHERE id = ?
      `).run(status, notes || null, checklistStr, doctor_profile_id);

      try {
        db.prepare(`
          INSERT INTO doctor_approval_history (doctor_id, hospital_id, action, acted_by, acted_by_name, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(doctor_profile_id, doc.hospital_id, status, req.user!.id, req.user!.name, notes || null);
      } catch (hErr) {
        console.error('Failed to record status change history:', hErr);
      }
    }

    logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      `DOCTOR_STATUS_${status.toUpperCase()}`,
      'DOCTOR_PROFILES',
      String(doctor_profile_id),
      `Doctor ${doc.name} (Reg: ${doc.registration_number}, Hospital: ${doc.hospital_name || doc.hospital_id}) status set to ${status}. ${finalReason ? 'Reason: ' + finalReason : ''}`,
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
      { doctorName: doc.name, status, notes: finalReason || notes || '' },
      (status === 'verified' || status === 'approved') ? 'success' : 'alert'
    );

    res.json({
      message: `Doctor status updated to ${status} successfully.`,
      doctor_profile_id,
      status,
      rejection_reason: finalReason,
      checklist: checklist || null
    });
  } catch (err: any) {
    console.error('Error verifying doctor:', err);
    res.status(500).json({ error: 'Failed to update doctor verification status.' });
  }
}

export function getDoctorApprovalHistory(req: AuthenticatedRequest, res: Response): void {
  try {
    const doctorId = Number(req.params.id);
    if (!doctorId) {
      res.status(400).json({ error: 'Valid doctor profile ID required.' });
      return;
    }

    const doc = db.prepare('SELECT id, hospital_id FROM doctor_profiles WHERE id = ?').get(doctorId) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    // Hospital admin isolation
    if (req.user?.role === 'hospital_admin' && req.user.hospital_id && doc.hospital_id !== req.user.hospital_id) {
      res.status(403).json({ error: 'Access denied: You can only view history for doctors belonging to your hospital.' });
      return;
    }

    const history = db.prepare(`
      SELECT * FROM doctor_approval_history
      WHERE doctor_id = ?
      ORDER BY created_at DESC
    `).all(doctorId);

    res.json({ history });
  } catch (err: any) {
    console.error('Error fetching doctor approval history:', err);
    res.status(500).json({ error: 'Failed to retrieve approval history.' });
  }
}

export function getDoctorDocuments(req: AuthenticatedRequest, res: Response): void {
  try {
    const doctorId = Number(req.params.id);
    if (!doctorId) {
      res.status(400).json({ error: 'Valid doctor profile ID required.' });
      return;
    }

    const doc = db.prepare(`
      SELECT id, hospital_id, council_certificate_url, degree_certificate_url, id_proof_url, document_url
      FROM doctor_profiles WHERE id = ?
    `).get(doctorId) as any;

    if (!doc) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    // Hospital admin isolation
    if (req.user?.role === 'hospital_admin' && req.user.hospital_id && doc.hospital_id !== req.user.hospital_id) {
      res.status(403).json({ error: 'Access denied: You can only view documents for doctors belonging to your hospital.' });
      return;
    }

    const documents = db.prepare(`
      SELECT * FROM doctor_documents
      WHERE doctor_id = ?
      ORDER BY uploaded_at DESC
    `).all(doctorId);

    res.json({
      doctor_id: doctorId,
      profile_documents: {
        council_certificate_url: doc.council_certificate_url,
        degree_certificate_url: doc.degree_certificate_url,
        id_proof_url: doc.id_proof_url,
        document_url: doc.document_url
      },
      documents
    });
  } catch (err: any) {
    console.error('Error fetching doctor documents:', err);
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
}

export function getSystemStats(req: AuthenticatedRequest, res: Response): void {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const adminHospitalId = req.user?.hospital_id;

    if (isHospitalAdmin && adminHospitalId) {
      // Scoped strictly to assigned hospital
      const approvedDoctors = (db.prepare(`
        SELECT COUNT(*) as count FROM doctor_profiles
        WHERE verification_status IN ('approved', 'verified') AND hospital_id = ?
      `).get(adminHospitalId) as any).count;

      const pendingDoctors = (db.prepare(`
        SELECT COUNT(*) as count FROM doctor_profiles
        WHERE verification_status = 'pending' AND hospital_id = ?
      `).get(adminHospitalId) as any).count;

      const rejectedDoctors = (db.prepare(`
        SELECT COUNT(*) as count FROM doctor_profiles
        WHERE verification_status = 'rejected' AND hospital_id = ?
      `).get(adminHospitalId) as any).count;

      const suspendedDoctors = (db.prepare(`
        SELECT COUNT(*) as count FROM doctor_profiles
        WHERE verification_status = 'suspended' AND hospital_id = ?
      `).get(adminHospitalId) as any).count;

      const totalDoctors = (db.prepare(`
        SELECT COUNT(*) as count FROM doctor_profiles WHERE hospital_id = ?
      `).get(adminHospitalId) as any).count;

      const totalAppointments = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments a
        WHERE a.hospital_id = ? OR a.doctor_id IN (SELECT id FROM doctor_profiles WHERE hospital_id = ?)
      `).get(adminHospitalId, adminHospitalId) as any).count;

      const activeAppointments = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments a
        WHERE (a.hospital_id = ? OR a.doctor_id IN (SELECT id FROM doctor_profiles WHERE hospital_id = ?))
          AND a.status = 'confirmed'
      `).get(adminHospitalId, adminHospitalId) as any).count;

      const todayDate = new Date().toISOString().slice(0, 10);
      const todayAppointments = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments a
        WHERE (a.hospital_id = ? OR a.doctor_id IN (SELECT id FROM doctor_profiles WHERE hospital_id = ?))
          AND a.appointment_date = ?
      `).get(adminHospitalId, adminHospitalId, todayDate) as any).count;

      const totalPatients = (db.prepare(`
        SELECT COUNT(DISTINCT a.patient_id) as count FROM appointments a
        WHERE a.hospital_id = ? OR a.doctor_id IN (SELECT id FROM doctor_profiles WHERE hospital_id = ?)
      `).get(adminHospitalId, adminHospitalId) as any).count;

      const hosp = db.prepare('SELECT id, name, code, city, location, emergency_hotline, rating, total_beds FROM hospitals WHERE id = ?').get(adminHospitalId) as any;

      res.json({
        stats: {
          total_patients: totalPatients,
          total_doctors: totalDoctors,
          approved_doctors: approvedDoctors,
          pending_doctors: pendingDoctors,
          rejected_doctors: rejectedDoctors,
          suspended_doctors: suspendedDoctors,
          total_appointments: totalAppointments,
          active_appointments: activeAppointments,
          today_appointments: todayAppointments,
          is_hospital_scoped: true,
          hospital: hosp
        }
      });
      return;
    }

    // Superadmin / global view
    const totalPatients = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'patient'").get() as any).count;
    const totalDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles").get() as any).count;
    const approvedDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles WHERE verification_status IN ('approved', 'verified')").get() as any).count;
    const pendingDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles WHERE verification_status = 'pending'").get() as any).count;
    const rejectedDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles WHERE verification_status = 'rejected'").get() as any).count;
    const suspendedDoctors = (db.prepare("SELECT COUNT(*) as count FROM doctor_profiles WHERE verification_status = 'suspended'").get() as any).count;
    const totalAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments").get() as any).count;
    const activeAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'").get() as any).count;

    const todayDate = new Date().toISOString().slice(0, 10);
    const todayAppointments = (db.prepare('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?').get(todayDate) as any).count;

    res.json({
      stats: {
        total_patients: totalPatients,
        total_doctors: totalDoctors,
        approved_doctors: approvedDoctors,
        pending_doctors: pendingDoctors,
        rejected_doctors: rejectedDoctors,
        suspended_doctors: suspendedDoctors,
        total_appointments: totalAppointments,
        active_appointments: activeAppointments,
        today_appointments: todayAppointments,
        is_hospital_scoped: false
      }
    });
  } catch (err: any) {
    console.error('Error getting system stats:', err);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
}

export function getAllUsers(req: AuthenticatedRequest, res: Response): void {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const adminHospitalId = req.user?.hospital_id;

    let users;
    if (isHospitalAdmin && adminHospitalId) {
      users = db.prepare(`
        SELECT DISTINCT u.id, u.name, u.email, u.phone, u.role, u.preferred_language, u.hospital_id, u.created_at
        FROM users u
        LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
        LEFT JOIN appointments a ON a.patient_id = u.id
        WHERE u.hospital_id = ? 
           OR dp.hospital_id = ?
           OR a.hospital_id = ?
           OR a.doctor_id IN (SELECT id FROM doctor_profiles WHERE hospital_id = ?)
        ORDER BY u.created_at DESC
      `).all(adminHospitalId, adminHospitalId, adminHospitalId, adminHospitalId);
    } else {
      users = db.prepare(`
        SELECT id, name, email, phone, role, preferred_language, hospital_id, created_at
        FROM users
        ORDER BY created_at DESC
      `).all();
    }

    res.json({ users });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

export function getAuditLogs(req: AuthenticatedRequest, res: Response): void {
  try {
    const isHospitalAdmin = req.user?.role === 'hospital_admin';
    const adminHospitalId = req.user?.hospital_id;

    let logs;
    if (isHospitalAdmin && adminHospitalId) {
      logs = db.prepare(`
        SELECT al.* FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE u.hospital_id = ? 
           OR al.user_id = ?
           OR al.details LIKE '%' || (SELECT name FROM hospitals WHERE id = ?) || '%'
        ORDER BY al.created_at DESC
        LIMIT 100
      `).all(adminHospitalId, req.user!.id, adminHospitalId);
    } else {
      logs = db.prepare(`
        SELECT * FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 100
      `).all();
    }

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
