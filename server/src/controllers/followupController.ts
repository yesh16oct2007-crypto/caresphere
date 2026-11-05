import { Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createNotification } from '../services/notificationService.js';

// 1. Patient: Get My Remote Follow-Ups
export function getMyFollowUps(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const followups = db.prepare(`
      SELECT pf.*,
             u_doc.name as doctor_name, u_doc.email as doctor_email,
             dp.specialization, dp.hospital_name,
             a.reference_no, a.appointment_date as original_consult_date
      FROM patient_followups pf
      JOIN doctor_profiles dp ON pf.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      LEFT JOIN appointments a ON pf.appointment_id = a.id
      WHERE pf.patient_id = ?
      ORDER BY pf.scheduled_date DESC, pf.created_at DESC
    `).all(req.user.id) as any[];

    const formatted = followups.map(f => ({
      ...f,
      vitals: f.vitals_data ? JSON.parse(f.vitals_data) : null
    }));

    res.json({ followups: formatted });
  } catch (err: any) {
    console.error('Get patient followups error:', err);
    res.status(500).json({ error: 'Failed to retrieve follow-up schedules.' });
  }
}

// 2. Doctor: Get Follow-Ups for My Patients
export function getDoctorFollowUps(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Only doctors can access patient follow-up rosters.' });
      return;
    }

    const doc = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const followups = db.prepare(`
      SELECT pf.*,
             u_pat.name as patient_name, u_pat.email as patient_email, u_pat.phone as patient_phone,
             a.reference_no, a.appointment_date as original_consult_date
      FROM patient_followups pf
      JOIN users u_pat ON pf.patient_id = u_pat.id
      LEFT JOIN appointments a ON pf.appointment_id = a.id
      WHERE pf.doctor_id = ?
      ORDER BY 
        CASE WHEN pf.status = 'submitted' THEN 1 WHEN pf.status = 'pending' THEN 2 ELSE 3 END,
        pf.scheduled_date ASC
    `).all(doc.id) as any[];

    const formatted = followups.map(f => ({
      ...f,
      vitals: f.vitals_data ? JSON.parse(f.vitals_data) : null
    }));

    res.json({ followups: formatted });
  } catch (err: any) {
    console.error('Get doctor followups error:', err);
    res.status(500).json({ error: 'Failed to retrieve patient follow-up list.' });
  }
}

// 3. Doctor: Schedule New Remote Follow-Up
export function scheduleFollowUp(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Only doctors can schedule patient follow-ups.' });
      return;
    }

    const doc = db.prepare('SELECT id, hospital_id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const { patient_id, appointment_id, scheduled_date, instructions } = req.body;

    if (!patient_id || !scheduled_date || !instructions) {
      res.status(400).json({ error: 'patient_id, scheduled_date, and instructions are required.' });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO patient_followups (
        appointment_id, doctor_id, patient_id, hospital_id, scheduled_date, instructions, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(
      appointment_id || null,
      doc.id,
      patient_id,
      doc.hospital_id || 1,
      scheduled_date,
      instructions.trim()
    );

    const followUpId = Number(result.lastInsertRowid);

    createNotification(
      patient_id,
      'notif.followup_scheduled_title',
      'notif.followup_scheduled_msg',
      { doctorName: req.user.name, date: scheduled_date },
      'info'
    );

    logAudit(
      req.user.id,
      req.user.name,
      'doctor',
      'SCHEDULE_FOLLOWUP',
      'PATIENT_FOLLOWUPS',
      String(followUpId),
      `Scheduled follow-up for patient ${patient_id} on ${scheduled_date}`,
      req.ip
    );

    res.status(201).json({
      message: 'Remote follow-up scheduled successfully.',
      followup_id: followUpId
    });
  } catch (err: any) {
    console.error('Schedule followup error:', err);
    res.status(500).json({ error: 'Failed to schedule remote follow-up.' });
  }
}

// 4. Patient: Submit Progress Update
export function submitPatientProgress(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Only patients can submit their health progress.' });
      return;
    }

    const followUpId = Number(req.params.id);
    const { patient_symptoms, patient_recovery_score, vitals, patient_report_url } = req.body;

    const followup = db.prepare('SELECT * FROM patient_followups WHERE id = ? AND patient_id = ?').get(followUpId, req.user.id) as any;
    if (!followup) {
      res.status(404).json({ error: 'Follow-up task not found or unauthorized.' });
      return;
    }

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE patient_followups
      SET status = 'submitted',
          patient_symptoms = ?,
          patient_recovery_score = ?,
          vitals_data = ?,
          patient_report_url = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      patient_symptoms || 'Symptoms improving as expected.',
      patient_recovery_score ? Number(patient_recovery_score) : 8,
      vitals ? JSON.stringify(vitals) : null,
      patient_report_url || null,
      nowIso,
      followUpId
    );

    // Notify doctor
    const doctorUser = db.prepare(`
      SELECT dp.user_id FROM doctor_profiles dp WHERE dp.id = ?
    `).get(followup.doctor_id) as any;

    if (doctorUser) {
      createNotification(
        doctorUser.user_id,
        'notif.followup_submitted_title',
        'notif.followup_submitted_msg',
        { patientName: req.user.name },
        'info'
      );
    }

    logAudit(
      req.user.id,
      req.user.name,
      'patient',
      'SUBMIT_PROGRESS',
      'PATIENT_FOLLOWUPS',
      String(followUpId),
      `Submitted recovery progress (score: ${patient_recovery_score}/10)`,
      req.ip
    );

    res.json({ message: 'Progress update submitted to your treating doctor for review.' });
  } catch (err: any) {
    console.error('Submit progress error:', err);
    res.status(500).json({ error: 'Failed to submit progress update.' });
  }
}

// 5. Doctor: Review Progress & Provide Feedback
export function reviewPatientProgress(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Only doctors can review and sign off on follow-ups.' });
      return;
    }

    const followUpId = Number(req.params.id);
    const { doctor_feedback, recommend_in_person = false } = req.body;

    const doc = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const followup = db.prepare('SELECT * FROM patient_followups WHERE id = ? AND doctor_id = ?').get(followUpId, doc.id) as any;
    if (!followup) {
      res.status(404).json({ error: 'Follow-up task not found or you are not the treating physician.' });
      return;
    }

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE patient_followups
      SET status = 'reviewed',
          doctor_feedback = ?,
          doctor_reviewed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      doctor_feedback || 'Recovery progress looks satisfactory. Continue prescribed routine.',
      nowIso,
      nowIso,
      followUpId
    );

    // Notify patient
    createNotification(
      followup.patient_id,
      'notif.followup_reviewed_title',
      'notif.followup_reviewed_msg',
      { doctorName: req.user.name, recommendation: recommend_in_person ? 'Please book an in-person consultation.' : 'Recovery looks good.' },
      'success'
    );

    logAudit(
      req.user.id,
      req.user.name,
      'doctor',
      'REVIEW_FOLLOWUP',
      'PATIENT_FOLLOWUPS',
      String(followUpId),
      `Reviewed follow-up for patient ${followup.patient_id}`,
      req.ip
    );

    res.json({ message: 'Doctor clinical review submitted and sent to patient.' });
  } catch (err: any) {
    console.error('Review progress error:', err);
    res.status(500).json({ error: 'Failed to record doctor review.' });
  }
}
