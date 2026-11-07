import { db } from '../db/database.js';
import { createNotification } from './notificationService.js';

export interface AutomationCycleResult {
  executed_at: string;
  total_processed: number;
  jobs: {
    appointment_reminders: number;
    followup_reminders: number;
    medicine_reminders: number;
    pending_doctor_alerts: number;
    pharmacy_stock_alerts: number;
  };
  details: string[];
}

let automationTimer: NodeJS.Timeout | null = null;

/**
 * Executes a full autonomous operations cycle across all hospitals
 */
export async function runAutomationCycle(targetHospitalId?: number): Promise<AutomationCycleResult> {
  const startTime = new Date().toISOString();
  let totalProcessed = 0;
  const details: string[] = [];

  const jobCounts = {
    appointment_reminders: 0,
    followup_reminders: 0,
    medicine_reminders: 0,
    pending_doctor_alerts: 0,
    pharmacy_stock_alerts: 0
  };

  // 1. APPOINTMENT REMINDERS (Today and Tomorrow)
  try {
    const upcomingAppts = db.prepare(`
      SELECT 
        a.id,
        a.patient_id,
        a.appointment_date,
        a.appointment_time,
        a.hospital_id,
        u_doc.name as doctor_name,
        h.name as hospital_name,
        dp.room_number,
        dp.floor
      FROM appointments a
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      LEFT JOIN hospitals h ON a.hospital_id = h.id
      WHERE a.status IN ('scheduled', 'confirmed')
        AND a.appointment_date >= date('now')
        AND a.appointment_date <= date('now', '+1 day')
        AND (? IS NULL OR a.hospital_id = ?)
    `).all(targetHospitalId || null, targetHospitalId || null) as any[];

    for (const appt of upcomingAppts) {
      // Check if reminder was already sent today for this appointment
      const alreadySent = db.prepare(`
        SELECT id FROM notifications 
        WHERE user_id = ? AND title_key LIKE '%Appointment Reminder%'
          AND params LIKE ?
          AND date(created_at) = date('now')
      `).get(appt.patient_id, `%"appointment_id":${appt.id}%`);

      if (!alreadySent) {
        createNotification(
          appt.patient_id,
          `Appointment Reminder: Today/Tomorrow with Dr. ${appt.doctor_name}`,
          `Reminder: Your consultation with Dr. ${appt.doctor_name} is scheduled for ${appt.appointment_date} at ${appt.appointment_time} (${appt.floor}, ${appt.room_number} at ${appt.hospital_name || 'CareSphere'}). Please arrive 15 minutes early.`,
          { appointment_id: appt.id, date: appt.appointment_date, time: appt.appointment_time },
          'appointment'
        );
        jobCounts.appointment_reminders++;
        totalProcessed++;
      }
    }
    details.push(`Sent ${jobCounts.appointment_reminders} appointment reminders.`);
  } catch (err) {
    console.error('Error running appointment reminders:', err);
    details.push('Appointment reminder job encountered an error.');
  }

  // 2. PATIENT FOLLOW-UP NOTIFICATIONS
  try {
    const dueFollowups = db.prepare(`
      SELECT pf.id, pf.patient_id, pf.scheduled_date, u_doc.name as doctor_name
      FROM patient_followups pf
      JOIN users u_doc ON pf.doctor_id = u_doc.id
      WHERE pf.status = 'pending'
        AND pf.scheduled_date <= date('now')
      LIMIT 25
    `).all() as any[];

    for (const f of dueFollowups) {
      const alreadySent = db.prepare(`
        SELECT id FROM notifications
        WHERE user_id = ? AND title_key LIKE '%Follow-Up Due%' AND date(created_at) = date('now')
      `).get(f.patient_id);

      if (!alreadySent) {
        createNotification(
          f.patient_id,
          'CareSphere Post-Consultation Follow-Up Due',
          `Your scheduled follow-up with Dr. ${f.doctor_name} is due. Please log your recovery progress or book a review visit.`,
          { followup_id: f.id },
          'info'
        );
        jobCounts.followup_reminders++;
        totalProcessed++;
      }
    }
    details.push(`Dispatched ${jobCounts.followup_reminders} patient follow-up reminders.`);
  } catch (err) {
    console.error('Error running follow-up reminders:', err);
  }

  // 3. MEDICINE REMINDERS
  try {
    const activeMedReminders = db.prepare(`
      SELECT mr.id, mr.patient_id, mr.medicine_name, mr.dosage, mr.timing_slots
      FROM medicine_reminders mr
      WHERE mr.is_active = 1
      LIMIT 50
    `).all() as any[];

    for (const mr of activeMedReminders) {
      const alreadySent = db.prepare(`
        SELECT id FROM notifications
        WHERE user_id = ? AND title_key LIKE '%Medicine Reminder%'
          AND params LIKE ?
          AND date(created_at) = date('now')
      `).get(mr.patient_id, `%"reminder_id":${mr.id}%`);

      if (!alreadySent) {
        createNotification(
          mr.patient_id,
          `Medicine Reminder: ${mr.medicine_name}`,
          `Time to take your prescribed dose of ${mr.medicine_name} (${mr.dosage}). Stay on schedule for effective recovery!`,
          { reminder_id: mr.id, medicine: mr.medicine_name },
          'info'
        );
        jobCounts.medicine_reminders++;
        totalProcessed++;
      }
    }
    details.push(`Processed ${jobCounts.medicine_reminders} active medicine schedule reminders.`);
  } catch (err) {
    console.error('Error running medicine reminders:', err);
  }

  // 4. PENDING DOCTOR APPLICATION NOTIFICATIONS TO ASSIGNED HOSPITAL ADMINS
  try {
    const pendingHospitals = db.prepare(`
      SELECT dp.hospital_id, COUNT(*) as pending_count, h.name as hospital_name
      FROM doctor_profiles dp
      JOIN hospitals h ON dp.hospital_id = h.id
      WHERE dp.verification_status = 'pending'
        AND (? IS NULL OR dp.hospital_id = ?)
      GROUP BY dp.hospital_id
    `).all(targetHospitalId || null, targetHospitalId || null) as any[];

    for (const ph of pendingHospitals) {
      // Find hospital admin for this hospital
      const admins = db.prepare(`
        SELECT id, name FROM users WHERE role = 'hospital_admin' AND hospital_id = ?
      `).all(ph.hospital_id) as any[];

      for (const adm of admins) {
        const alreadyNotifiedToday = db.prepare(`
          SELECT id FROM notifications
          WHERE user_id = ? AND title_key LIKE '%Doctor Approvals Pending%' AND date(created_at) = date('now')
        `).get(adm.id);

        if (!alreadyNotifiedToday) {
          createNotification(
            adm.id,
            `Doctor Approvals Pending (${ph.pending_count})`,
            `You have ${ph.pending_count} doctor credential application(s) awaiting review for ${ph.hospital_name}. Inspect the AI verification report and take action.`,
            { hospital_id: ph.hospital_id, count: ph.pending_count },
            'alert'
          );
          jobCounts.pending_doctor_alerts++;
          totalProcessed++;
        }
      }
    }
    details.push(`Alerted assigned hospital admins for ${pendingHospitals.length} hospitals with pending doctor applications.`);
  } catch (err) {
    console.error('Error running pending doctor notifications:', err);
  }

  // 5. PHARMACY LOW-STOCK ALERTS
  try {
    const lowStockItems = db.prepare(`
      SELECT 
        pi.id,
        pi.pharmacy_id,
        pi.stock_quantity,
        pi.low_stock_threshold,
        m.name as medicine_name,
        p.hospital_id,
        h.name as hospital_name
      FROM pharmacy_inventory pi
      JOIN medicines m ON pi.medicine_id = m.id
      JOIN pharmacies p ON pi.pharmacy_id = p.id
      JOIN hospitals h ON p.hospital_id = h.id
      WHERE pi.stock_quantity <= pi.low_stock_threshold
        AND (? IS NULL OR p.hospital_id = ?)
      LIMIT 30
    `).all(targetHospitalId || null, targetHospitalId || null) as any[];

    if (lowStockItems.length > 0) {
      // Group by hospital and alert admins
      const byHospital = new Map<number, any[]>();
      for (const item of lowStockItems) {
        const list = byHospital.get(item.hospital_id) || [];
        list.push(item);
        byHospital.set(item.hospital_id, list);
      }

      for (const [hId, items] of byHospital.entries()) {
        const admins = db.prepare(`
          SELECT id FROM users WHERE role IN ('hospital_admin', 'pharmacy_staff') AND hospital_id = ?
        `).all(hId) as any[];

        for (const adm of admins) {
          const alreadyNotified = db.prepare(`
            SELECT id FROM notifications
            WHERE user_id = ? AND title_key LIKE '%Pharmacy Low-Stock Alert%' AND date(created_at) = date('now')
          `).get(adm.id);

          if (!alreadyNotified) {
            const medSample = items.slice(0, 3).map(i => `${i.medicine_name} (${i.stock_quantity} left)`).join(', ');
            createNotification(
              adm.id,
              `Pharmacy Low-Stock Alert (${items.length} items)`,
              `Critical low stock warning: ${medSample}. Replenishment order recommended.`,
              { hospital_id: hId, low_count: items.length },
              'alert'
            );
            jobCounts.pharmacy_stock_alerts++;
            totalProcessed++;
          }
        }
      }
    }
    details.push(`Evaluated inventory and created ${jobCounts.pharmacy_stock_alerts} low-stock alerts.`);
  } catch (err) {
    console.error('Error running pharmacy inventory alerts:', err);
  }

  // Record into automation_job_logs
  try {
    db.prepare(`
      INSERT INTO automation_job_logs (job_name, hospital_id, processed_count, details, status)
      VALUES ('autonomous_operations_cycle', ?, ?, ?, 'completed')
    `).run(
      targetHospitalId || null,
      totalProcessed,
      JSON.stringify({ jobCounts, details })
    );
  } catch (logErr) {
    console.error('Failed to log automation run:', logErr);
  }

  return {
    executed_at: startTime,
    total_processed: totalProcessed,
    jobs: jobCounts,
    details
  };
}

/**
 * Start the recurring background automation worker
 */
export function startAutomationWorker(intervalMinutes: number = 30): void {
  if (automationTimer) {
    clearInterval(automationTimer);
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[CareSphere Automation Engine] Autonomous background worker initialized. Cycle interval: ${intervalMinutes} minutes.`);

  // Initial immediate lightweight run
  setTimeout(() => {
    runAutomationCycle().catch(err => console.error('[CareSphere Automation Engine] Error in initial cycle:', err));
  }, 5000);

  automationTimer = setInterval(() => {
    runAutomationCycle().catch(err => console.error('[CareSphere Automation Engine] Error in scheduled cycle:', err));
  }, intervalMs);
}

/**
 * Stop the automation worker
 */
export function stopAutomationWorker(): void {
  if (automationTimer) {
    clearInterval(automationTimer);
    automationTimer = null;
    console.log('[CareSphere Automation Engine] Background worker stopped.');
  }
}
