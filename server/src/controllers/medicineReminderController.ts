import { Response } from 'express';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// 1. Get Patient's Medicine Reminders & Today's Schedule
export function getPatientMedicines(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Only registered patients can manage medicine reminders.' });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    const reminders = db.prepare(`
      SELECT mr.*, u_doc.name as prescribing_doctor_name
      FROM medicine_reminders mr
      LEFT JOIN doctor_profiles dp ON mr.doctor_id = dp.id
      LEFT JOIN users u_doc ON dp.user_id = u_doc.id
      WHERE mr.patient_id = ? AND mr.is_active = 1
      ORDER BY mr.created_at DESC
    `).all(req.user.id) as any[];

    // Fetch today's logs
    const todayLogs = db.prepare(`
      SELECT * FROM medicine_logs
      WHERE patient_id = ? AND scheduled_date = ?
    `).all(req.user.id, todayStr) as any[];

    const logsMap = new Map<string, any>();
    todayLogs.forEach(l => {
      logsMap.set(`${l.reminder_id}_${l.scheduled_time}`, l);
    });

    // Build today's structured schedule
    const todaySchedule: any[] = [];
    let takenCount = 0;
    let totalDosesToday = 0;

    reminders.forEach(r => {
      // Check if today is within active range
      if (r.start_date <= todayStr && (!r.end_date || r.end_date >= todayStr)) {
        let times: string[] = [];
        try {
          times = JSON.parse(r.timing_slots);
        } catch {
          times = ['09:00', '21:00'];
        }

        times.forEach(t => {
          totalDosesToday++;
          const existingLog = logsMap.get(`${r.id}_${t}`);
          const status = existingLog ? existingLog.status : 'pending';
          if (status === 'taken') takenCount++;

          // Categorize slot
          const hour = parseInt(t.split(':')[0], 10);
          let period = 'morning';
          if (hour >= 12 && hour < 17) period = 'afternoon';
          else if (hour >= 17 && hour < 21) period = 'evening';
          else if (hour >= 21 || hour < 5) period = 'night';

          todaySchedule.push({
            reminder_id: r.id,
            medicine_name: r.medicine_name,
            dosage: r.dosage,
            food_relation: r.food_relation,
            doctor_instructions: r.doctor_instructions,
            time: t,
            period,
            status,
            log_id: existingLog ? existingLog.id : null,
            logged_at: existingLog ? existingLog.logged_at : null
          });
        });
      }
    });

    // Sort today schedule by time
    todaySchedule.sort((a, b) => a.time.localeCompare(b.time));

    // Calculate adherence rate
    const adherenceRate = totalDosesToday > 0 ? Math.round((takenCount / totalDosesToday) * 100) : 100;

    // Check missed doses (time earlier than now, still pending)
    const nowTimeStr = new Date().toTimeString().slice(0, 5);
    const missedDoses = todaySchedule.filter(s => s.status === 'pending' && s.time < nowTimeStr);

    res.json({
      reminders: reminders.map(r => ({ ...r, timing_slots: JSON.parse(r.timing_slots) })),
      today_schedule: todaySchedule,
      adherence_rate: adherenceRate,
      missed_doses: missedDoses,
      today_date: todayStr
    });
  } catch (err: any) {
    console.error('Get medicines error:', err);
    res.status(500).json({ error: 'Failed to retrieve medicine reminders.' });
  }
}

// 2. Add New Medicine Reminder
export function addMedicineReminder(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Only registered patients can add medicine reminders.' });
      return;
    }

    const {
      medicine_name,
      dosage,
      frequency = 'Daily',
      timing_slots = ['09:00', '21:00'],
      food_relation = 'after_food',
      start_date = new Date().toISOString().slice(0, 10),
      end_date,
      doctor_instructions,
      doctor_id
    } = req.body;

    if (!medicine_name || !dosage) {
      res.status(400).json({ error: 'Medicine name and dosage are required.' });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO medicine_reminders (
        patient_id, doctor_id, medicine_name, dosage, frequency,
        timing_slots, food_relation, start_date, end_date, doctor_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.id,
      doctor_id || null,
      medicine_name.trim(),
      dosage.trim(),
      frequency,
      JSON.stringify(timing_slots),
      food_relation,
      start_date,
      end_date || null,
      doctor_instructions || null
    );

    const reminderId = Number(result.lastInsertRowid);

    logAudit(
      req.user.id,
      req.user.name,
      'patient',
      'ADD_MEDICINE_REMINDER',
      'MEDICINE_REMINDERS',
      String(reminderId),
      `Added reminder for ${medicine_name} (${dosage})`,
      req.ip
    );

    res.status(201).json({
      message: 'Medicine reminder scheduled successfully.',
      reminder_id: reminderId
    });
  } catch (err: any) {
    console.error('Add medicine error:', err);
    res.status(500).json({ error: 'Failed to schedule reminder.' });
  }
}

// 3. Log Dose Status (Taken, Skipped, Pending)
export function logMedicineDose(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Only patients can log doses.' });
      return;
    }

    const reminderId = Number(req.params.id);
    const { scheduled_date, scheduled_time, status = 'taken', notes } = req.body;

    if (!scheduled_date || !scheduled_time) {
      res.status(400).json({ error: 'scheduled_date and scheduled_time are required.' });
      return;
    }

    const reminder = db.prepare('SELECT id, medicine_name FROM medicine_reminders WHERE id = ? AND patient_id = ?').get(reminderId, req.user.id);
    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found or unauthorized.' });
      return;
    }

    const nowIso = new Date().toISOString();

    const existingLog = db.prepare(`
      SELECT id FROM medicine_logs
      WHERE reminder_id = ? AND patient_id = ? AND scheduled_date = ? AND scheduled_time = ?
    `).get(reminderId, req.user.id, scheduled_date, scheduled_time) as any;

    if (existingLog) {
      db.prepare(`
        UPDATE medicine_logs
        SET status = ?, logged_at = ?, notes = ?
        WHERE id = ?
      `).run(status, nowIso, notes || null, existingLog.id);
    } else {
      db.prepare(`
        INSERT INTO medicine_logs (reminder_id, patient_id, scheduled_date, scheduled_time, status, logged_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(reminderId, req.user.id, scheduled_date, scheduled_time, status, nowIso, notes || null);
    }

    res.json({
      message: `Dose marked as ${status}.`,
      status,
      logged_at: nowIso
    });
  } catch (err: any) {
    console.error('Log dose error:', err);
    res.status(500).json({ error: 'Failed to record dose status.' });
  }
}

// 4. Update / Delete Reminder
export function deleteMedicineReminder(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Unauthorized.' });
      return;
    }

    const reminderId = Number(req.params.id);
    db.prepare('DELETE FROM medicine_reminders WHERE id = ? AND patient_id = ?').run(reminderId, req.user.id);

    res.json({ message: 'Medicine reminder removed successfully.' });
  } catch (err: any) {
    console.error('Delete medicine error:', err);
    res.status(500).json({ error: 'Failed to remove reminder.' });
  }
}

// 5. Past 30 Days Adherence History
export function getMedicineHistory(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'patient') {
      res.status(403).json({ error: 'Unauthorized.' });
      return;
    }

    const logs = db.prepare(`
      SELECT ml.*, mr.medicine_name, mr.dosage
      FROM medicine_logs ml
      JOIN medicine_reminders mr ON ml.reminder_id = mr.id
      WHERE ml.patient_id = ?
      ORDER BY ml.scheduled_date DESC, ml.scheduled_time DESC
      LIMIT 50
    `).all(req.user.id);

    res.json({ logs });
  } catch (err: any) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to retrieve medicine history.' });
  }
}
