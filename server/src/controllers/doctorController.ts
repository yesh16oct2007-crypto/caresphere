import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export function getApprovedDoctors(req: Request, res: Response): void {
  try {
    const { department_id, hospital_id, search, limit = 50 } = req.query;

    let query = `
      SELECT 
        dp.id as doctor_id,
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.preferred_language,
        dp.hospital_id,
        COALESCE(h.name, dp.hospital_name) as hospital_name,
        COALESCE(h.location, dp.hospital_location) as hospital_location,
        COALESCE(h.city, 'Bengaluru') as hospital_city,
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
        dp.current_presence_status,
        d.id as department_id,
        d.name as department_name,
        d.code as department_code
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON dp.department_id = d.id
      LEFT JOIN hospitals h ON dp.hospital_id = h.id
      WHERE dp.verification_status IN ('approved', 'verified')
    `;

    const params: any[] = [];

    if (department_id) {
      query += ` AND dp.department_id = ?`;
      params.push(department_id);
    }

    if (hospital_id) {
      query += ` AND dp.hospital_id = ?`;
      params.push(Number(hospital_id));
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR dp.specialization LIKE ? OR d.name LIKE ? OR COALESCE(h.name, dp.hospital_name) LIKE ? OR COALESCE(h.location, dp.hospital_location) LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY dp.experience_years DESC LIMIT ?`;
    params.push(Number(limit));

    const doctors = db.prepare(query).all(...params);
    res.json({ doctors });
  } catch (err: any) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'Failed to fetch doctor directory.' });
  }
}

export function getDoctorById(req: Request, res: Response): void {
  try {
    const { id } = req.params;

    const doctor = db.prepare(`
      SELECT 
        dp.id as doctor_id,
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.preferred_language,
        dp.hospital_id,
        COALESCE(h.name, dp.hospital_name) as hospital_name,
        COALESCE(h.location, dp.hospital_location) as hospital_location,
        COALESCE(h.city, 'Bengaluru') as hospital_city,
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
        dp.current_presence_status,
        d.id as department_id,
        d.name as department_name,
        d.code as department_code
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      JOIN departments d ON dp.department_id = d.id
      LEFT JOIN hospitals h ON dp.hospital_id = h.id
      WHERE dp.id = ?
    `).get(id) as any;

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    // Availability rules
    const availability = db.prepare(`
      SELECT DISTINCT day_of_week, start_time, end_time, slot_duration_minutes
      FROM doctor_availability
      WHERE doctor_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).all(id);

    res.json({ doctor, availability });
  } catch (err: any) {
    console.error('Error fetching doctor details:', err);
    res.status(500).json({ error: 'Failed to fetch doctor details.' });
  }
}

export function getDoctorAvailableSlots(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'Query parameter "date" (YYYY-MM-DD) is required.' });
      return;
    }

    const doctor = db.prepare('SELECT id, verification_status FROM doctor_profiles WHERE id = ?').get(id) as any;
    if (!doctor || !['approved', 'verified'].includes(doctor.verification_status)) {
      res.status(404).json({ error: 'Doctor is not available or pending verification.' });
      return;
    }

    // Find day of week for this date (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const targetDate = new Date(`${date}T00:00:00Z`);
    if (isNaN(targetDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }
    const dayOfWeek = targetDate.getUTCDay();

    // Get doctor availability windows for that day of week
    const windows = db.prepare(`
      SELECT start_time, end_time, slot_duration_minutes
      FROM doctor_availability
      WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1
    `).all(id, dayOfWeek) as { start_time: string; end_time: string; slot_duration_minutes: number }[];

    // If no specific day configuration, provide standard default morning/afternoon schedule for weekdays
    let activeWindows = windows;
    if (activeWindows.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      activeWindows = [
        { start_time: '09:00', end_time: '13:00', slot_duration_minutes: 30 },
        { start_time: '14:00', end_time: '17:00', slot_duration_minutes: 30 }
      ];
    } else if (activeWindows.length === 0 && dayOfWeek === 6) {
      activeWindows = [
        { start_time: '09:00', end_time: '12:00', slot_duration_minutes: 30 }
      ];
    }

    // Generate potential slots
    const generatedSlots: string[] = [];
    activeWindows.forEach(w => {
      const [startHour, startMin] = w.start_time.split(':').map(Number);
      const [endHour, endMin] = w.end_time.split(':').map(Number);
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      const duration = w.slot_duration_minutes || 30;

      for (let time = startTotal; time + duration <= endTotal; time += duration) {
        const h = Math.floor(time / 60).toString().padStart(2, '0');
        const m = (time % 60).toString().padStart(2, '0');
        generatedSlots.push(`${h}:${m}`);
      }
    });

    // Query booked appointments on this date for this doctor that are NOT cancelled
    const bookedRows = db.prepare(`
      SELECT appointment_time 
      FROM appointments 
      WHERE doctor_id = ? AND appointment_date = ? AND status != 'cancelled'
    `).all(id, date) as { appointment_time: string }[];

    const bookedTimes = new Set(bookedRows.map(b => b.appointment_time));

    // Deduplicate and sort generated slots chronologically
    const uniqueSlots = Array.from(new Set(generatedSlots)).sort();

    const availableSlots = uniqueSlots.map(time => ({
      time,
      isAvailable: !bookedTimes.has(time)
    }));

    res.json({
      date,
      day_of_week: dayOfWeek,
      doctor_id: Number(id),
      total_slots: availableSlots.length,
      available_count: availableSlots.filter(s => s.isAvailable).length,
      slots: availableSlots
    });
  } catch (err: any) {
    console.error('Error calculating slots:', err);
    res.status(500).json({ error: 'Failed to retrieve available slots.' });
  }
}

export function getDoctorSchedule(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Unauthorized. Doctor role required.' });
      return;
    }

    const doctorProfile = db.prepare(`
      SELECT 
        id, verification_status, state_medical_council, hospital_name, hospital_location,
        room_number, floor, wing, current_presence_status, navigation_instructions
      FROM doctor_profiles 
      WHERE user_id = ?
    `).get(req.user.id) as any;
    if (!doctorProfile) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const appointments = db.prepare(`
      SELECT 
        a.id,
        a.reference_no,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.patient_notes,
        a.doctor_notes,
        u.id as patient_id,
        u.name as patient_name,
        u.email as patient_email,
        u.phone as patient_phone,
        u.preferred_language as patient_language,
        p.gender as patient_gender,
        p.date_of_birth as patient_dob,
        p.blood_group as patient_blood_group,
        p.medical_history_summary as patient_history
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      LEFT JOIN patient_profiles p ON u.id = p.user_id
      WHERE a.doctor_id = ?
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
    `).all(doctorProfile.id);

    const availability = db.prepare(`
      SELECT DISTINCT day_of_week, start_time, end_time, slot_duration_minutes, is_active
      FROM doctor_availability
      WHERE doctor_id = ?
      ORDER BY day_of_week, start_time
    `).all(doctorProfile.id);

    res.json({
      doctor_profile_id: doctorProfile.id,
      verification_status: doctorProfile.verification_status,
      state_medical_council: doctorProfile.state_medical_council,
      hospital_name: doctorProfile.hospital_name || 'CareSphere Super Specialty Hospital',
      hospital_location: doctorProfile.hospital_location || 'Main Campus, Bengaluru',
      room_number: doctorProfile.room_number,
      floor: doctorProfile.floor,
      wing: doctorProfile.wing,
      current_presence_status: doctorProfile.current_presence_status,
      navigation_instructions: doctorProfile.navigation_instructions,
      appointments,
      availability
    });
  } catch (err: any) {
    console.error('Error fetching doctor schedule:', err);
    res.status(500).json({ error: 'Failed to fetch doctor schedule.' });
  }
}

export function updateDoctorAvailability(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Unauthorized. Doctor role required.' });
      return;
    }

    const doctorProfile = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
    if (!doctorProfile) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const { schedule } = req.body; // Array of { day_of_week, start_time, end_time, slot_duration_minutes }

    if (!Array.isArray(schedule)) {
      res.status(400).json({ error: 'Schedule must be an array of time window objects.' });
      return;
    }

    const updateTx = db.transaction(() => {
      db.prepare('DELETE FROM doctor_availability WHERE doctor_id = ?').run(doctorProfile.id);

      const insertStmt = db.prepare(`
        INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `);

      schedule.forEach((slot: any) => {
        insertStmt.run(
          doctorProfile.id,
          Number(slot.day_of_week),
          slot.start_time,
          slot.end_time,
          Number(slot.slot_duration_minutes || 30)
        );
      });
    });

    updateTx();

    res.json({ message: 'Availability schedule updated successfully.' });
  } catch (err: any) {
    console.error('Error updating doctor availability:', err);
    res.status(500).json({ error: 'Failed to update availability schedule.' });
  }
}

export function updateDoctorPresence(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Unauthorized. Doctor role required.' });
      return;
    }

    const { current_presence_status, room_number, floor, wing, navigation_instructions, hospital_name, hospital_location } = req.body;

    const validStatuses = ['in_opd', 'in_consultation', 'on_rounds', 'in_surgery', 'off_duty'];
    if (current_presence_status && !validStatuses.includes(current_presence_status)) {
      res.status(400).json({ error: `Invalid presence status. Allowed: ${validStatuses.join(', ')}` });
      return;
    }

    const doc = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (hospital_name) {
      updates.push('hospital_name = ?');
      params.push(hospital_name);
    }
    if (hospital_location) {
      updates.push('hospital_location = ?');
      params.push(hospital_location);
    }
    if (current_presence_status) {
      updates.push('current_presence_status = ?');
      params.push(current_presence_status);
    }
    if (room_number) {
      updates.push('room_number = ?');
      params.push(room_number);
    }
    if (floor) {
      updates.push('floor = ?');
      params.push(floor);
    }
    if (wing) {
      updates.push('wing = ?');
      params.push(wing);
    }
    if (navigation_instructions) {
      updates.push('navigation_instructions = ?');
      params.push(navigation_instructions);
    }

    if (updates.length > 0) {
      params.push(doc.id);
      db.prepare(`UPDATE doctor_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare(`
      SELECT dp.*, u.name, u.email
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = ?
    `).get(doc.id);

    res.json({ 
      message: 'Presence status and location updated successfully.', 
      doctor: updated,
      presence: updated 
    });
  } catch (err: any) {
    console.error('Error updating doctor presence:', err);
    res.status(500).json({ error: 'Failed to update presence status.' });
  }
}
