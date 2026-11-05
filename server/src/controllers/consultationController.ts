import { Request, Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createNotification } from '../services/notificationService.js';

// In-memory WebRTC signaling & message store per consultation room
interface RoomSignalState {
  waitingPatients: Set<number>;
  activeDoctors: Set<number>;
  messages: Array<{
    id: string;
    senderId: number;
    senderName: string;
    senderRole: string;
    text: string;
    timestamp: string;
  }>;
  webrtcSignals: Array<{
    senderId: number;
    data: any;
    timestamp: number;
  }>;
}

const roomStates = new Map<string, RoomSignalState>();

function getOrCreateRoomState(roomId: string): RoomSignalState {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      waitingPatients: new Set(),
      activeDoctors: new Set(),
      messages: [],
      webrtcSignals: []
    });
  }
  return roomStates.get(roomId)!;
}

// 1. Get Approved Doctors offering Teleconsultation
export function getTeleconsultationDoctors(req: Request, res: Response): void {
  try {
    const { department_id, hospital_id, search } = req.query;

    let query = `
      SELECT dp.id as doctor_id, dp.user_id, u.name, u.email, u.phone,
             dp.hospital_id, dp.hospital_name, dp.hospital_location,
             dp.registration_number, dp.specialization, dp.qualifications,
             dp.experience_years, dp.consultation_fee,
             dp.teleconsultation_available, dp.teleconsultation_fee,
             dp.bio, dp.avatar_url, dp.room_number, dp.current_presence_status,
             dp.verification_status, d.id as department_id, d.name as department_name,
             h.name as hospital_title, h.city as hospital_city
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON dp.department_id = d.id
      LEFT JOIN hospitals h ON dp.hospital_id = h.id
      WHERE dp.verification_status IN ('verified', 'approved')
        AND dp.teleconsultation_available = 1
    `;
    const params: any[] = [];

    if (department_id) {
      query += ` AND dp.department_id = ?`;
      params.push(department_id);
    }
    if (hospital_id) {
      query += ` AND dp.hospital_id = ?`;
      params.push(hospital_id);
    }
    if (search) {
      query += ` AND (u.name LIKE ? OR dp.specialization LIKE ? OR d.name LIKE ? OR dp.hospital_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY dp.experience_years DESC, u.name ASC`;

    const doctors = db.prepare(query).all(...params);
    res.json({ doctors });
  } catch (err: any) {
    console.error('Get teleconsult doctors error:', err);
    res.status(500).json({ error: 'Failed to retrieve teleconsultation doctors.' });
  }
}

// 2. Book Online Video Consultation
export function bookOnlineConsultation(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Only registered patients can book online consultations.' });
      return;
    }

    const { doctor_id, appointment_date, appointment_time, patient_notes } = req.body;

    if (!doctor_id || !appointment_date || !appointment_time) {
      res.status(400).json({ error: 'doctor_id, appointment_date, and appointment_time are required.' });
      return;
    }

    const doctor = db.prepare(`
      SELECT dp.id, dp.department_id, dp.hospital_id, dp.teleconsultation_fee, u.name as doctor_name
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = ? AND dp.verification_status IN ('verified', 'approved') AND dp.teleconsultation_available = 1
    `).get(doctor_id) as any;

    if (!doctor) {
      res.status(404).json({ error: 'Selected doctor is not available for online consultation.' });
      return;
    }

    // Check slot collision
    const existing = db.prepare(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled'
    `).get(doctor_id, appointment_date, appointment_time);

    if (existing) {
      res.status(409).json({ error: 'This teleconsultation slot is already booked. Please choose another time slot.' });
      return;
    }

    // Generate unique reference and video room id
    const refNo = `CS-VC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const videoRoomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;

    const stmt = db.prepare(`
      INSERT INTO appointments (
        reference_no, patient_id, doctor_id, department_id, hospital_id,
        appointment_date, appointment_time, consultation_type, status,
        video_room_id, video_session_status, meeting_link, patient_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'online_video', 'confirmed', ?, 'scheduled', ?, ?)
    `);

    const meetingLink = `/consultations/room/${videoRoomId}`;
    const result = stmt.run(
      refNo,
      req.user.id,
      doctor.id,
      doctor.department_id,
      doctor.hospital_id || 1,
      appointment_date,
      appointment_time,
      videoRoomId,
      meetingLink,
      patient_notes || 'Online Video Consultation'
    );

    const apptId = Number(result.lastInsertRowid);

    // Notify patient
    createNotification(
      req.user.id,
      'notif.teleconsult_booked_title',
      'notif.teleconsult_booked_msg',
      { refNo, doctorName: doctor.doctor_name, date: appointment_date, time: appointment_time },
      'success'
    );

    logAudit(
      req.user.id,
      req.user.name,
      'patient',
      'BOOK_ONLINE_CONSULTATION',
      'APPOINTMENTS',
      String(apptId),
      `Booked video consultation with ${doctor.doctor_name} for ${appointment_date} at ${appointment_time}`,
      req.ip
    );

    res.status(201).json({
      message: 'Online consultation booked successfully.',
      appointment: {
        id: apptId,
        reference_no: refNo,
        video_room_id: videoRoomId,
        meeting_link: meetingLink,
        appointment_date,
        appointment_time,
        doctor_name: doctor.doctor_name,
        consultation_fee: doctor.teleconsultation_fee
      }
    });
  } catch (err: any) {
    console.error('Book online consult error:', err);
    res.status(500).json({ error: 'Failed to book online consultation.' });
  }
}

// 3. Get Consultation Room Info & State
export function getConsultationRoom(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const roomId = String(req.params.roomId);

    const appointment = db.prepare(`
      SELECT a.*, 
             u_pat.name as patient_name, u_pat.email as patient_email, u_pat.phone as patient_phone,
             u_doc.name as doctor_name, u_doc.email as doctor_email,
             dp.specialization, dp.hospital_name, dp.qualifications, dp.room_number,
             d.name as department_name
      FROM appointments a
      JOIN users u_pat ON a.patient_id = u_pat.id
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      JOIN departments d ON a.department_id = d.id
      WHERE a.video_room_id = ?
    `).get(roomId) as any;

    if (!appointment) {
      res.status(404).json({ error: 'Consultation room not found or expired.' });
      return;
    }

    // Role check: Only the patient or the doctor or admin can access
    const isPatient = req.user.id === appointment.patient_id;
    const isDoctor = req.user.role === 'doctor';
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'hospital_admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      res.status(403).json({ error: 'Access denied: You are not authorized to enter this consultation chamber.' });
      return;
    }

    const roomState = getOrCreateRoomState(roomId);

    // Update presence
    if (isPatient) {
      roomState.waitingPatients.add(req.user.id);
      if (appointment.video_session_status === 'scheduled') {
        db.prepare("UPDATE appointments SET video_session_status = 'waiting' WHERE id = ?").run(appointment.id);
        appointment.video_session_status = 'waiting';
      }
    } else if (isDoctor) {
      roomState.activeDoctors.add(req.user.id);
    }

    res.json({
      room: {
        id: roomId,
        appointment_id: appointment.id,
        reference_no: appointment.reference_no,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        consultation_type: appointment.consultation_type,
        video_session_status: appointment.video_session_status,
        patient: {
          id: appointment.patient_id,
          name: appointment.patient_name,
          email: appointment.patient_email,
          phone: appointment.patient_phone
        },
        doctor: {
          id: appointment.doctor_id,
          name: appointment.doctor_name,
          specialization: appointment.specialization,
          hospital_name: appointment.hospital_name,
          qualifications: appointment.qualifications
        },
        patient_notes: appointment.patient_notes,
        doctor_notes: appointment.doctor_notes,
        prescription_url: appointment.prescription_url,
        waiting_patient_present: roomState.waitingPatients.size > 0,
        doctor_present: roomState.activeDoctors.size > 0,
        messages: roomState.messages.slice(-50)
      }
    });
  } catch (err: any) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Failed to access consultation room.' });
  }
}

// 4. WebRTC Signaling / Status Update / Chat in Room
export function postRoomSignalOrMessage(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const roomId = String(req.params.roomId);
    const { type, payload } = req.body;

    const roomState = getOrCreateRoomState(roomId);

    if (type === 'chat') {
      const msg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        senderId: req.user.id,
        senderName: req.user.name,
        senderRole: req.user.role,
        text: String(payload.text || '').trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      roomState.messages.push(msg);
      res.json({ success: true, message: msg });
      return;
    }

    if (type === 'status_change') {
      const newStatus = payload.status;
      if (['waiting', 'in_progress', 'completed', 'cancelled'].includes(newStatus)) {
        db.prepare('UPDATE appointments SET video_session_status = ? WHERE video_room_id = ?').run(newStatus, roomId);
        res.json({ success: true, status: newStatus });
        return;
      }
    }

    if (type === 'signal') {
      roomState.webrtcSignals.push({
        senderId: req.user.id,
        data: payload,
        timestamp: Date.now()
      });
      // Keep only recent 20 signals
      if (roomState.webrtcSignals.length > 20) {
        roomState.webrtcSignals.shift();
      }
      res.json({ success: true });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Room signal error:', err);
    res.status(500).json({ error: 'Failed to process signal.' });
  }
}

// 5. Doctor: Complete Online Consultation and Save Prescription / Summary
export function completeOnlineConsultation(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Only doctors can complete consultations and issue prescriptions.' });
      return;
    }

    const roomId = String(req.params.roomId);
    const { summary, diagnosis, prescription_items, follow_up_days, recommended_tests } = req.body;

    const appointment = db.prepare(`
      SELECT a.*, u_pat.id as patient_user_id, u_pat.name as patient_name
      FROM appointments a
      JOIN users u_pat ON a.patient_id = u_pat.id
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      WHERE a.video_room_id = ? AND dp.user_id = ?
    `).get(roomId, req.user.id) as any;

    if (!appointment) {
      res.status(404).json({ error: 'Active consultation not found or you are not the treating doctor.' });
      return;
    }

    // Build structured digital prescription data
    const prescriptionData = {
      prescription_id: `RX-${Date.now().toString(36).toUpperCase()}`,
      issued_date: new Date().toISOString(),
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name,
      doctor_id: appointment.doctor_id,
      doctor_name: req.user.name,
      diagnosis: diagnosis || 'General Health Consultation',
      summary: summary || 'Online video consultation completed successfully.',
      medicines: prescription_items || [],
      recommended_tests: recommended_tests || [],
      follow_up_recommendation: follow_up_days ? `${follow_up_days} days` : 'As needed'
    };

    const prescriptionJson = JSON.stringify(prescriptionData);

    db.prepare(`
      UPDATE appointments
      SET status = 'completed',
          video_session_status = 'completed',
          doctor_notes = ?,
          prescription_url = ?
      WHERE id = ?
    `).run(summary || diagnosis, prescriptionJson, appointment.id);

    // Optionally auto-create follow-up task if follow_up_days > 0
    if (follow_up_days && Number(follow_up_days) > 0) {
      const followUpDate = new Date(Date.now() + Number(follow_up_days) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      db.prepare(`
        INSERT INTO patient_followups (
          appointment_id, doctor_id, patient_id, hospital_id, scheduled_date, instructions, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        appointment.id,
        appointment.doctor_id,
        appointment.patient_id,
        appointment.hospital_id || 1,
        followUpDate,
        `Post-teleconsultation check: Monitor recovery regarding ${diagnosis || 'treatment'}.`
      );
    }

    // Also auto-add prescribed medicines to medicine_reminders for the patient!
    if (Array.isArray(prescription_items) && prescription_items.length > 0) {
      const insertReminder = db.prepare(`
        INSERT INTO medicine_reminders (
          patient_id, doctor_id, medicine_name, dosage, frequency, timing_slots,
          food_relation, start_date, end_date, doctor_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      prescription_items.forEach((item: any) => {
        if (item.name) {
          insertReminder.run(
            appointment.patient_id,
            appointment.doctor_id,
            item.name,
            item.dosage || '1 tablet',
            item.frequency || 'Daily',
            JSON.stringify(item.timings || ['09:00', '21:00']),
            item.food_relation || 'after_food',
            today,
            endDate,
            item.instructions || 'Follow doctor teleconsult prescription'
          );
        }
      });
    }

    createNotification(
      appointment.patient_id,
      'notif.consultation_completed_title',
      'notif.consultation_completed_msg',
      { doctorName: req.user.name, refNo: appointment.reference_no },
      'success'
    );

    logAudit(
      req.user.id,
      req.user.name,
      'doctor',
      'COMPLETE_TELECONSULTATION',
      'APPOINTMENTS',
      String(appointment.id),
      `Completed video consultation with patient ${appointment.patient_name}`,
      req.ip
    );

    res.json({
      message: 'Consultation marked as completed. Digital prescription generated and delivered to patient.',
      prescription: prescriptionData
    });
  } catch (err: any) {
    console.error('Complete consult error:', err);
    res.status(500).json({ error: 'Failed to complete consultation.' });
  }
}

// 6. Get User's Online Consultations
export function getMyOnlineConsultations(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    let query = `
      SELECT a.id, a.reference_no, a.appointment_date, a.appointment_time,
             a.consultation_type, a.status, a.video_room_id, a.video_session_status,
             a.meeting_link, a.prescription_url, a.patient_notes, a.doctor_notes,
             u_pat.name as patient_name, u_pat.phone as patient_phone,
             u_doc.name as doctor_name, dp.specialization, dp.hospital_name, dp.room_number,
             d.name as department_name, h.name as hospital_title
      FROM appointments a
      JOIN users u_pat ON a.patient_id = u_pat.id
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      JOIN departments d ON a.department_id = d.id
      LEFT JOIN hospitals h ON a.hospital_id = h.id
      WHERE a.consultation_type = 'online_video'
    `;
    const params: any[] = [];

    if (req.user.role === 'patient') {
      query += ` AND a.patient_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'doctor') {
      const doc = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
      if (!doc) {
        res.json({ consultations: [] });
        return;
      }
      query += ` AND a.doctor_id = ?`;
      params.push(doc.id);
    } else if (req.user.role === 'hospital_admin' && req.user.hospital_id) {
      query += ` AND a.hospital_id = ?`;
      params.push(req.user.hospital_id);
    }

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC`;

    const consultations = db.prepare(query).all(...params);

    res.json({ consultations });
  } catch (err: any) {
    console.error('Get my consultations error:', err);
    res.status(500).json({ error: 'Failed to retrieve online consultations.' });
  }
}
