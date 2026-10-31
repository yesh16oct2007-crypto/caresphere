import { Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createNotification } from '../services/notificationService.js';

// Helper to generate unique reference e.g. CS-2026-94812
function generateAppointmentReference(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `CS-${year}-${randomSuffix}`;
}

export function createAppointment(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required to book an appointment.' });
      return;
    }

    const { doctor_id, department_id, appointment_date, appointment_time, patient_notes } = req.body;

    if (!doctor_id || !appointment_date || !appointment_time) {
      res.status(400).json({ error: 'Doctor, appointment date, and time slot are required.' });
      return;
    }

    // Verify doctor is approved
    const doctor = db.prepare(`
      SELECT dp.id, dp.department_id, dp.verification_status, u.id as doctor_user_id, u.name as doctor_name, u.preferred_language as doctor_lang
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = ?
    `).get(doctor_id) as any;

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    if (!['approved', 'verified'].includes(doctor.verification_status)) {
      res.status(400).json({ error: 'This doctor is currently not approved or verified for patient bookings.' });
      return;
    }

    const targetDeptId = department_id || doctor.department_id;
    let appointmentRef = generateAppointmentReference();

    // Concurrency-safe atomic transaction
    const bookTransaction = db.transaction(() => {
      // 1. Check if the slot is currently booked by an active appointment
      const conflict = db.prepare(`
        SELECT id FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled'
      `).get(doctor_id, appointment_date, appointment_time);

      if (conflict) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      // Check if reference number collision occurs (extremely rare, but retry safe)
      let existingRef = db.prepare('SELECT id FROM appointments WHERE reference_no = ?').get(appointmentRef);
      while (existingRef) {
        appointmentRef = generateAppointmentReference();
        existingRef = db.prepare('SELECT id FROM appointments WHERE reference_no = ?').get(appointmentRef);
      }

      const insertStmt = db.prepare(`
        INSERT INTO appointments (
          reference_no, patient_id, doctor_id, department_id,
          appointment_date, appointment_time, status, patient_notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
      `);

      const result = insertStmt.run(
        appointmentRef,
        req.user!.id,
        doctor_id,
        targetDeptId,
        appointment_date,
        appointment_time,
        patient_notes || null
      );

      return Number(result.lastInsertRowid);
    });

    let newAppointmentId: number;
    try {
      newAppointmentId = bookTransaction();
    } catch (txErr: any) {
      if (txErr.message === 'SLOT_ALREADY_BOOKED' || (txErr.code && txErr.code.includes('SQLITE_CONSTRAINT'))) {
        res.status(409).json({ 
          error: 'This appointment slot was just reserved by another patient. Please select another available time.' 
        });
        return;
      }
      throw txErr;
    }

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'APPOINTMENT_BOOKED',
      'APPOINTMENTS',
      appointmentRef,
      `Booked with ${doctor.doctor_name} on ${appointment_date} at ${appointment_time}`,
      req.ip
    );

    // Multilingual In-App Notifications
    createNotification(
      req.user.id,
      'notif.appointment_booked_title',
      'notif.appointment_booked_msg',
      { reference: appointmentRef, doctor: doctor.doctor_name, date: appointment_date, time: appointment_time },
      'appointment'
    );

    createNotification(
      doctor.doctor_user_id,
      'notif.doctor_new_appointment_title',
      'notif.doctor_new_appointment_msg',
      { patientName: req.user.name, reference: appointmentRef, date: appointment_date, time: appointment_time },
      'appointment'
    );

    // Fetch full created appointment record
    const created = db.prepare(`
      SELECT 
        a.*,
        u.name as doctor_name,
        dp.specialization,
        d.name as department_name,
        d.floor as department_floor
      FROM appointments a
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `).get(newAppointmentId);

    res.status(201).json({
      message: 'Appointment booked and confirmed successfully!',
      reference_no: appointmentRef,
      appointment: created
    });
  } catch (err: any) {
    console.error('Error booking appointment:', err);
    res.status(500).json({ error: 'Failed to complete appointment booking.' });
  }
}

export function getMyAppointments(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    let appointments: any[] = [];

    if (req.user.role === 'patient') {
      appointments = db.prepare(`
        SELECT 
          a.id,
          a.reference_no,
          a.appointment_date,
          a.appointment_time,
          a.status,
          a.patient_notes,
          a.doctor_notes,
          a.cancellation_reason,
          a.created_at,
          u.name as doctor_name,
          dp.hospital_name,
          dp.hospital_location,
          dp.specialization,
          dp.consultation_fee,
          dp.room_number,
          dp.floor,
          dp.wing,
          dp.current_presence_status,
          dp.navigation_instructions,
          d.name as department_name,
          d.floor as department_floor
        FROM appointments a
        JOIN doctor_profiles dp ON a.doctor_id = dp.id
        JOIN users u ON dp.user_id = u.id
        JOIN departments d ON a.department_id = d.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `).all(req.user.id);
    } else if (req.user.role === 'doctor') {
      const doc = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
      if (doc) {
        appointments = db.prepare(`
          SELECT 
            a.id,
            a.reference_no,
            a.appointment_date,
            a.appointment_time,
            a.status,
            a.patient_notes,
            a.doctor_notes,
            a.cancellation_reason,
            a.created_at,
            u.name as patient_name,
            u.email as patient_email,
            u.phone as patient_phone,
            d.name as department_name
          FROM appointments a
          JOIN users u ON a.patient_id = u.id
          JOIN departments d ON a.department_id = d.id
          WHERE a.doctor_id = ?
          ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `).all(doc.id);
      }
    } else if (req.user.role === 'admin') {
      appointments = db.prepare(`
        SELECT 
          a.id,
          a.reference_no,
          a.appointment_date,
          a.appointment_time,
          a.status,
          a.patient_notes,
          a.doctor_notes,
          a.cancellation_reason,
          a.created_at,
          p.name as patient_name,
          docUser.name as doctor_name,
          d.name as department_name
        FROM appointments a
        JOIN users p ON a.patient_id = p.id
        JOIN doctor_profiles dp ON a.doctor_id = dp.id
        JOIN users docUser ON dp.user_id = docUser.id
        JOIN departments d ON a.department_id = d.id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
        LIMIT 100
      `).all();
    }

    res.json({ appointments });
  } catch (err: any) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
}

export function cancelAppointment(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const { reason = 'Cancelled by user request.' } = req.body;

    const appt = db.prepare(`
      SELECT 
        a.*,
        p.id as patient_user_id,
        p.name as patient_name,
        docUser.id as doctor_user_id,
        docUser.name as doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users docUser ON dp.user_id = docUser.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!appt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    // Role authorization check
    const isPatient = req.user.role === 'patient' && appt.patient_id === req.user.id;
    const isDoctor = req.user.role === 'doctor' && appt.doctor_user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: You do not have authorization to cancel this appointment.' });
      return;
    }

    if (appt.status === 'cancelled') {
      res.status(400).json({ error: 'This appointment is already cancelled.' });
      return;
    }

    db.prepare(`
      UPDATE appointments 
      SET status = 'cancelled', cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason, id);

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'APPOINTMENT_CANCELLED',
      'APPOINTMENTS',
      appt.reference_no,
      `Cancelled: ${reason}`,
      req.ip
    );

    // Notifications
    createNotification(
      appt.patient_user_id,
      'notif.appointment_cancelled_title',
      'notif.appointment_cancelled_msg',
      { reference: appt.reference_no, date: appt.appointment_date },
      'alert'
    );

    createNotification(
      appt.doctor_user_id,
      'notif.appointment_cancelled_title',
      'notif.doctor_appointment_cancelled_msg',
      { patientName: appt.patient_name, reference: appt.reference_no, date: appt.appointment_date },
      'alert'
    );

    res.json({
      message: 'Appointment cancelled successfully. The slot is now released.',
      reference_no: appt.reference_no,
      status: 'cancelled'
    });
  } catch (err: any) {
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
}

export function rescheduleAppointment(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const { new_date, new_time } = req.body;

    if (!new_date || !new_time) {
      res.status(400).json({ error: 'new_date and new_time are required.' });
      return;
    }

    const appt = db.prepare(`
      SELECT 
        a.*,
        p.id as patient_user_id,
        p.name as patient_name,
        docUser.id as doctor_user_id,
        docUser.name as doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users docUser ON dp.user_id = docUser.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!appt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    const isPatient = req.user.role === 'patient' && appt.patient_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: You do not have authorization to reschedule this appointment.' });
      return;
    }

    const rescheduleTx = db.transaction(() => {
      // Check conflict
      const conflict = db.prepare(`
        SELECT id FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled' AND id != ?
      `).get(appt.doctor_id, new_date, new_time, id);

      if (conflict) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      db.prepare(`
        UPDATE appointments 
        SET appointment_date = ?, appointment_time = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(new_date, new_time, id);
    });

    try {
      rescheduleTx();
    } catch (e: any) {
      if (e.message === 'SLOT_ALREADY_BOOKED') {
        res.status(409).json({ error: 'The requested new slot is not available. Please choose another time.' });
        return;
      }
      throw e;
    }

    logAudit(
      req.user.id,
      req.user.name,
      req.user.role,
      'APPOINTMENT_RESCHEDULED',
      'APPOINTMENTS',
      appt.reference_no,
      `Rescheduled from ${appt.appointment_date} ${appt.appointment_time} to ${new_date} ${new_time}`,
      req.ip
    );

    // Notifications
    createNotification(
      appt.patient_user_id,
      'notif.appointment_rescheduled_title',
      'notif.appointment_rescheduled_msg',
      { reference: appt.reference_no, newDate: new_date, newTime: new_time },
      'appointment'
    );

    createNotification(
      appt.doctor_user_id,
      'notif.appointment_rescheduled_title',
      'notif.doctor_rescheduled_msg',
      { patientName: appt.patient_name, reference: appt.reference_no, newDate: new_date, newTime: new_time },
      'appointment'
    );

    res.json({
      message: 'Appointment rescheduled successfully!',
      reference_no: appt.reference_no,
      appointment_date: new_date,
      appointment_time: new_time
    });
  } catch (err: any) {
    console.error('Error rescheduling appointment:', err);
    res.status(500).json({ error: 'Failed to reschedule appointment.' });
  }
}

export function updateAppointmentStatus(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || (req.user.role !== 'doctor' && req.user.role !== 'admin')) {
      res.status(403).json({ error: 'Forbidden: Only doctors and administrators can update appointment clinical status.' });
      return;
    }

    const { id } = req.params;
    const { status, doctor_notes } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be pending, confirmed, completed, or cancelled.' });
      return;
    }

    db.prepare(`
      UPDATE appointments
      SET status = ?, doctor_notes = COALESCE(?, doctor_notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, doctor_notes || null, id);

    res.json({ message: 'Appointment status updated successfully.', status });
  } catch (err: any) {
    console.error('Error updating appointment status:', err);
    res.status(500).json({ error: 'Failed to update appointment status.' });
  }
}
