import { Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// 1. Get List of Hospitals for Admin Selector
export function getAdminHospitals(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'superadmin', 'hospital_admin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      return;
    }

    let query = `
      SELECT h.*,
             (SELECT COUNT(*) FROM doctor_profiles WHERE hospital_id = h.id AND verification_status IN ('verified', 'approved')) as active_doctors,
             (SELECT COUNT(*) FROM appointments WHERE hospital_id = h.id) as total_appointments,
             (SELECT AVG(rating) FROM patient_feedback WHERE hospital_id = h.id) as avg_rating
      FROM hospitals h
      WHERE h.is_active = 1
    `;
    const params: any[] = [];

    // If hospital_admin, lock down strictly to assigned hospital
    if (req.user.role === 'hospital_admin' && req.user.hospital_id) {
      query += ` AND h.id = ?`;
      params.push(req.user.hospital_id);
    }

    query += ` ORDER BY h.name ASC`;
    const hospitals = db.prepare(query).all(...params);

    res.json({ hospitals });
  } catch (err: any) {
    console.error('Get admin hospitals error:', err);
    res.status(500).json({ error: 'Failed to retrieve hospitals.' });
  }
}

// 2. High-Level System Overview Analytics (Super Admin or Hospital Admin)
export function getAnalyticsOverview(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'superadmin', 'hospital_admin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      return;
    }

    const isHospitalAdmin = req.user.role === 'hospital_admin' && req.user.hospital_id;
    const hospitalId = isHospitalAdmin ? req.user.hospital_id : (req.query.hospital_id ? Number(req.query.hospital_id) : null);

    // Build scoped stats
    let doctorFilter = hospitalId ? `WHERE hospital_id = ${hospitalId}` : '';
    let apptFilter = hospitalId ? `WHERE hospital_id = ${hospitalId}` : '';

    const totalHospitals = db.prepare("SELECT COUNT(*) as count FROM hospitals WHERE is_active = 1").get() as any;
    const totalPatients = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'patient'").get() as any;
    
    const docStats = db.prepare(`
      SELECT 
        COUNT(*) as total_doctors,
        SUM(CASE WHEN verification_status IN ('verified', 'approved') THEN 1 ELSE 0 END) as approved_doctors,
        SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending_doctors,
        SUM(CASE WHEN verification_status IN ('rejected', 'suspended') THEN 1 ELSE 0 END) as rejected_doctors
      FROM doctor_profiles ${doctorFilter}
    `).get() as any;

    const apptStats = db.prepare(`
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appointments,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_appointments,
        SUM(CASE WHEN consultation_type = 'online_video' THEN 1 ELSE 0 END) as online_consultations,
        SUM(CASE WHEN consultation_type = 'in_person' THEN 1 ELSE 0 END) as in_person_appointments
      FROM appointments ${apptFilter}
    `).get() as any;

    // Hospital Comparison Matrix (Super Admin only, or single hospital for hospital admin)
    const comparisonQuery = `
      SELECT h.id, h.name, h.code, h.city, h.total_beds,
             (SELECT COUNT(*) FROM doctor_profiles WHERE hospital_id = h.id) as total_doctors,
             (SELECT COUNT(*) FROM doctor_profiles WHERE hospital_id = h.id AND verification_status IN ('verified', 'approved')) as approved_doctors,
             (SELECT COUNT(*) FROM appointments WHERE hospital_id = h.id) as total_appointments,
             (SELECT COUNT(*) FROM appointments WHERE hospital_id = h.id AND status = 'completed') as completed_appointments,
             (SELECT COUNT(*) FROM appointments WHERE hospital_id = h.id AND consultation_type = 'online_video') as online_consultations,
             COALESCE((SELECT ROUND(AVG(rating), 1) FROM patient_feedback WHERE hospital_id = h.id), 4.8) as patient_rating,
             COALESCE((SELECT SUM(available_count) FROM hospital_resources WHERE hospital_id = h.id AND resource_type IN ('general_beds', 'icu_beds', 'emergency_beds')), 0) as available_resources
      FROM hospitals h
      WHERE h.is_active = 1
      ${isHospitalAdmin ? 'AND h.id = ?' : ''}
      ORDER BY total_appointments DESC
    `;
    const hospitalComparison = isHospitalAdmin 
      ? db.prepare(comparisonQuery).all(req.user.hospital_id)
      : db.prepare(comparisonQuery).all();

    // Monthly Appointment Trends
    const monthlyTrends = db.prepare(`
      SELECT 
        strftime('%Y-%m', appointment_date) as month_key,
        COUNT(*) as total,
        SUM(CASE WHEN consultation_type = 'online_video' THEN 1 ELSE 0 END) as online_count,
        SUM(CASE WHEN consultation_type = 'in_person' THEN 1 ELSE 0 END) as in_person_count
      FROM appointments
      ${apptFilter}
      GROUP BY month_key
      ORDER BY month_key DESC
      LIMIT 6
    `).all();

    const statsObj = {
      total_hospitals: totalHospitals.count,
      total_patients: totalPatients.count,
      total_doctors: docStats.total_doctors || 0,
      approved_doctors: docStats.approved_doctors || 0,
      pending_doctors: docStats.pending_doctors || 0,
      rejected_doctors: docStats.rejected_doctors || 0,
      total_appointments: apptStats.total_appointments || 0,
      completed_appointments: apptStats.completed_appointments || 0,
      cancelled_appointments: apptStats.cancelled_appointments || 0,
      confirmed_appointments: apptStats.confirmed_appointments || 0,
      online_consultations: apptStats.online_consultations || 0,
      in_person_appointments: apptStats.in_person_appointments || 0
    };

    res.json({
      is_hospital_admin: Boolean(isHospitalAdmin),
      hospital_id: hospitalId,
      stats: statsObj,
      overview: statsObj,
      hospital_comparison: hospitalComparison,
      monthly_trends: monthlyTrends.reverse()
    });
  } catch (err: any) {
    console.error('Get analytics overview error:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics overview.' });
  }
}

// 3. Deep Hospital-Specific Analytics
export function getHospitalDetailedAnalytics(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'superadmin', 'hospital_admin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const requestedHospitalId = Number(req.params.hospitalId);

    // Strict authorization guard:
    // If user is a hospital_admin, they CANNOT view any hospital other than their assigned one
    if (req.user.role === 'hospital_admin' && req.user.hospital_id && req.user.hospital_id !== requestedHospitalId) {
      res.status(403).json({ error: 'Forbidden: You are only authorized to view analytics for your assigned hospital.' });
      return;
    }

    const hospital = db.prepare('SELECT * FROM hospitals WHERE id = ?').get(requestedHospitalId) as any;
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    // 1. Doctor Statistics for this Hospital
    const doctorStats = db.prepare(`
      SELECT 
        COUNT(*) as total_doctors,
        SUM(CASE WHEN verification_status IN ('verified', 'approved') THEN 1 ELSE 0 END) as approved_doctors,
        SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending_doctors,
        SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected_doctors,
        SUM(CASE WHEN verification_status = 'suspended' THEN 1 ELSE 0 END) as suspended_doctors,
        SUM(CASE WHEN teleconsultation_available = 1 THEN 1 ELSE 0 END) as teleconsult_doctors
      FROM doctor_profiles
      WHERE hospital_id = ?
    `).get(requestedHospitalId) as any;

    // 2. Total Associated Patients
    const patientStats = db.prepare(`
      SELECT COUNT(DISTINCT patient_id) as total_associated_patients
      FROM appointments
      WHERE hospital_id = ?
    `).get(requestedHospitalId) as any;

    // 3. Appointments Summary for this Hospital
    const apptSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appointments,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_appointments,
        SUM(CASE WHEN consultation_type = 'online_video' THEN 1 ELSE 0 END) as online_consultations,
        SUM(CASE WHEN consultation_type = 'in_person' THEN 1 ELSE 0 END) as in_person_appointments
      FROM appointments
      WHERE hospital_id = ?
    `).get(requestedHospitalId) as any;

    // 4. Department-Wise Breakdown
    const departmentBreakdown = db.prepare(`
      SELECT d.id, d.name as department_name, d.code,
             COUNT(a.id) as appointment_count,
             SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
             SUM(CASE WHEN a.consultation_type = 'online_video' THEN 1 ELSE 0 END) as online_count
      FROM departments d
      LEFT JOIN appointments a ON d.id = a.department_id AND a.hospital_id = ?
      GROUP BY d.id
      ORDER BY appointment_count DESC
    `).all(requestedHospitalId);

    // 5. Doctor-Wise Performance & Consultations (Subqueries avoid cartesian join)
    const doctorBreakdown = db.prepare(`
      SELECT dp.id as doctor_id, u.name as doctor_name, dp.specialization, dp.room_number,
             (SELECT COUNT(*) FROM appointments WHERE doctor_id = dp.id AND hospital_id = ?) as total_appointments,
             (SELECT COUNT(*) FROM appointments WHERE doctor_id = dp.id AND hospital_id = ? AND status = 'completed') as completed_appointments,
             (SELECT COUNT(*) FROM appointments WHERE doctor_id = dp.id AND hospital_id = ? AND consultation_type = 'online_video') as online_appointments,
             COALESCE((SELECT ROUND(AVG(rating), 1) FROM patient_feedback WHERE doctor_id = dp.id), 4.9) as rating
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.hospital_id = ?
      ORDER BY total_appointments DESC
      LIMIT 10
    `).all(requestedHospitalId, requestedHospitalId, requestedHospitalId, requestedHospitalId);

    // 6. Daily Appointment Volume
    const daysLimit = req.query.days ? Number(req.query.days) : (req.query.date_range === '7d' ? 7 : req.query.date_range === '90d' ? 90 : 30);
    const dailyTrends = db.prepare(`
      SELECT appointment_date as date,
             COUNT(*) as total,
             SUM(CASE WHEN consultation_type = 'online_video' THEN 1 ELSE 0 END) as online_count,
             SUM(CASE WHEN consultation_type = 'in_person' THEN 1 ELSE 0 END) as in_person_count
      FROM appointments
      WHERE hospital_id = ?
      GROUP BY appointment_date
      ORDER BY appointment_date DESC
      LIMIT ?
    `).all(requestedHospitalId, daysLimit);

    // 7. Resources & Bed Occupancy (Aggregated & deduplicated with unified capacity keys)
    const rawResources = db.prepare(`
      SELECT id, resource_type,
             MAX(total_capacity) as total_capacity,
             MAX(available_count) as available_count,
             MAX(occupied_count) as occupied_count,
             MAX(status) as status,
             MAX(updated_at) as updated_at
      FROM hospital_resources
      WHERE hospital_id = ?
      GROUP BY resource_type
    `).all(requestedHospitalId) as any[];

    const resources = rawResources.map(r => ({
      id: r.id,
      resource_type: r.resource_type,
      total_capacity: r.total_capacity || 0,
      available_count: r.available_count || 0,
      available_capacity: r.available_count || 0,
      occupied_count: r.occupied_count || 0,
      occupied_capacity: r.occupied_count || 0,
      status: r.status || 'available',
      updated_at: r.updated_at
    }));

    // 8. Recent Patient Feedback
    const recentFeedback = db.prepare(`
      SELECT pf.id, pf.rating, pf.review, pf.created_at,
             u.name as patient_name, u_doc.name as doctor_name
      FROM patient_feedback pf
      JOIN users u ON pf.patient_id = u.id
      LEFT JOIN doctor_profiles dp ON pf.doctor_id = dp.id
      LEFT JOIN users u_doc ON dp.user_id = u_doc.id
      WHERE pf.hospital_id = ?
      ORDER BY pf.created_at DESC
      LIMIT 5
    `).all(requestedHospitalId);

    res.json({
      hospital: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code,
        location: hospital.location,
        city: hospital.city,
        state: hospital.state,
        address: hospital.address || hospital.location,
        total_beds: hospital.total_beds || 250,
        icu_beds: hospital.icu_beds || Math.round((hospital.total_beds || 250) * 0.15),
        rating: hospital.rating || 4.8,
        emergency_hotline: hospital.emergency_hotline || '+91-80-CARE-911'
      },
      doctor_stats: doctorStats,
      patient_stats: patientStats,
      appointments_summary: {
        total_appointments: apptSummary?.total_appointments || 0,
        completed_appointments: apptSummary?.completed_appointments || 0,
        cancelled_appointments: apptSummary?.cancelled_appointments || 0,
        confirmed_appointments: apptSummary?.confirmed_appointments || 0,
        online_consultations: apptSummary?.online_consultations || 0,
        in_person_appointments: apptSummary?.in_person_appointments || 0
      },
      department_breakdown: departmentBreakdown,
      doctor_breakdown: doctorBreakdown,
      daily_trends: dailyTrends.reverse(),
      resources: resources,
      recent_feedback: recentFeedback
    });
  } catch (err: any) {
    console.error('Get detailed hospital analytics error:', err);
    res.status(500).json({ error: 'Failed to retrieve detailed hospital analytics.' });
  }
}

// 4. Export Analytics Report Data (CSV-ready / PDF-ready)
export function exportAnalyticsReport(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || !['admin', 'superadmin', 'hospital_admin'].includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const { format = 'csv', hospital_id } = req.query;
    const targetHospId = req.user.role === 'hospital_admin' ? req.user.hospital_id : (hospital_id ? Number(hospital_id) : null);

    let query = `
      SELECT a.reference_no, a.appointment_date, a.appointment_time, a.consultation_type, a.status,
             u_pat.name as patient_name, u_doc.name as doctor_name, dp.specialization,
             d.name as department_name, h.name as hospital_name
      FROM appointments a
      JOIN users u_pat ON a.patient_id = u_pat.id
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      JOIN departments d ON a.department_id = d.id
      LEFT JOIN hospitals h ON a.hospital_id = h.id
    `;
    const params: any[] = [];
    if (targetHospId) {
      query += ` WHERE a.hospital_id = ?`;
      params.push(targetHospId);
    }
    query += ` ORDER BY a.appointment_date DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    if (format === 'csv') {
      const headers = ['Reference No', 'Date', 'Time', 'Type', 'Status', 'Patient Name', 'Doctor Name', 'Department', 'Hospital'];
      const csvRows = [headers.join(',')];

      rows.forEach(r => {
        const row = [
          `"${r.reference_no}"`,
          `"${r.appointment_date}"`,
          `"${r.appointment_time}"`,
          `"${r.consultation_type}"`,
          `"${r.status}"`,
          `"${r.patient_name}"`,
          `"${r.doctor_name}"`,
          `"${r.department_name}"`,
          `"${r.hospital_name || ''}"`
        ];
        csvRows.push(row.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="caresphere_analytics_${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
      return;
    }

    // JSON format for PDF generator
    res.json({
      generated_at: new Date().toISOString(),
      report_title: 'CareSphere Hospital Operational Analytics Report',
      total_records: rows.length,
      data: rows
    });
  } catch (err: any) {
    console.error('Export report error:', err);
    res.status(500).json({ error: 'Failed to export report.' });
  }
}
