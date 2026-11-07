import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db, initDatabase } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';

describe('CareSphere 9 Advanced Features Integration Tests', () => {
  let adminToken: string;
  let blrAdminToken: string;
  let chnAdminToken: string;
  let patientToken: string;
  let doctorToken: string;
  let patientUserId: number;
  let doctorId: number;

  beforeAll(async () => {
    initDatabase();
    seedDatabase();

    // 1. Super Admin login
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@caresphere.health', password: 'Admin@12345' });
    adminToken = adminLogin.body.token;

    // 2. Bengaluru Hospital Admin login
    const blrLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'blr.admin@caresphere.health', password: 'Hospital@12345' });
    blrAdminToken = blrLogin.body.token;

    // 3. Chennai Hospital Admin login
    const chnLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'chn.admin@caresphere.health', password: 'Hospital@12345' });
    chnAdminToken = chnLogin.body.token;

    // 4. Doctor Dr. Rajesh Sharma login
    const docLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.sharma@caresphere.health', password: 'Doctor@12345' });
    doctorToken = docLogin.body.token;
    doctorId = docLogin.body.user.doctor.doctor_id;

    // 5. Patient Ravi Kumar login
    const patLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ravi.kumar@example.com', password: 'Patient@12345' });
    patientToken = patLogin.body.token;
    patientUserId = patLogin.body.user.id;
  });

  describe('Feature 1: Digital Patient Medical Records', () => {
    let uploadedRecordId: number;

    it('allows patient to upload a medical document securely', async () => {
      const res = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('title', 'Blood Routine Investigation Oct 2026')
        .field('document_type', 'lab_report')
        .field('hospital_name', 'CareSphere Super Specialty Hospital')
        .field('doctor_name', 'Dr. Rajesh Sharma')
        .field('record_date', '2026-10-20')
        .field('notes', 'Routine checkup lab values')
        .attach('file', Buffer.from('PDF_SAMPLE_MEDICAL_REPORT_BYTES'), 'lab_report_test.pdf');

      if (res.status !== 201) {
        console.error('BOOK FAILED BODY:', res.status, res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.record.title).toBe('Blood Routine Investigation Oct 2026');
      uploadedRecordId = res.body.record.id;
    });

    it('retrieves patient medical records with filters and share counts', async () => {
      const res = await request(app)
        .get('/api/medical-records')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.records)).toBe(true);
      expect(res.body.records.length).toBeGreaterThan(0);
    });

    it('allows patient to share medical record with an approved doctor', async () => {
      const res = await request(app)
        .post(`/api/medical-records/${uploadedRecordId}/share`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ doctor_id: doctorId, expires_days: 15 });

      if (res.status !== 201) {
        console.error('BOOK FAILED BODY:', res.status, res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Record shared successfully');
    });

    it('allows doctor to view shared patient records', async () => {
      const res = await request(app)
        .get('/api/medical-records/shared-with-me')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.records)).toBe(true);
    });

    it('logs access history when record details are accessed', async () => {
      // Doctor views the record
      await request(app)
        .get(`/api/medical-records/${uploadedRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      // Patient checks logs
      const logRes = await request(app)
        .get(`/api/medical-records/${uploadedRecordId}/logs`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(logRes.status).toBe(200);
      expect(logRes.body.logs.length).toBeGreaterThan(0);
      expect(logRes.body.logs[0].action).toBeDefined();

      // Test frontend primary /api/records routes
      const frontendRecordsRes = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(frontendRecordsRes.status).toBe(200);
      expect(frontendRecordsRes.body.records[0].document_date).toBeDefined();

      const docSharedRes = await request(app)
        .get('/api/records/shared-with-me')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(docSharedRes.status).toBe(200);
      expect(Array.isArray(docSharedRes.body.records)).toBe(true);
    });
  });

  describe('Feature 2: Online Doctor Consultation', () => {
    let videoRoomId: string;
    let appointmentId: number;

    it('lists approved doctors offering teleconsultation with fees', async () => {
      const res = await request(app).get('/api/consultations/doctors');
      expect(res.status).toBe(200);
      expect(res.body.doctors.length).toBeGreaterThan(0);
      expect(res.body.doctors[0].teleconsultation_available).toBe(1);
    });

    it('allows patient to book an online video consultation', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const uniqueTime = `21:${Math.floor(10 + Math.random() * 49)}`;
      const res = await request(app)
        .post('/api/consultations/book')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: doctorId,
          appointment_date: tomorrow,
          appointment_time: uniqueTime,
          patient_notes: 'Online follow-up consultation'
        });

      expect(res.status).toBe(201);
      expect(res.body.appointment.video_room_id).toBeDefined();
      videoRoomId = res.body.appointment.video_room_id;
      appointmentId = res.body.appointment.id;
    });

    it('provides consultation waiting room state and participant presence', async () => {
      const res = await request(app)
        .get(`/api/consultations/room/${videoRoomId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.room.id).toBe(videoRoomId);
      expect(res.body.room.patient.id).toBe(patientUserId);
    });

    it('allows doctor to complete online consultation and issue prescription', async () => {
      const res = await request(app)
        .post(`/api/consultations/room/${videoRoomId}/complete`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          diagnosis: 'Mild Hypertension (Controlled)',
          summary: 'Blood pressure readings are stabilizing. Prescribing maintenance dose.',
          prescription_items: [
            { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily', timings: ['08:00'] }
          ],
          follow_up_days: 14
        });

      expect(res.status).toBe(200);
      expect(res.body.prescription).toBeDefined();
      expect(res.body.prescription.prescription_id).toContain('RX-');
    });
  });

  describe('Feature 3: Hospital-Wise Admin Analytics Dashboard', () => {
    it('allows Super Admin to view overall and hospital comparison analytics', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.total_hospitals).toBeGreaterThanOrEqual(2);
      expect(res.body.hospital_comparison.length).toBeGreaterThanOrEqual(2);
    });

    it('enforces hospital isolation: Hospital Admin cannot view another hospital', async () => {
      // blrAdmin is hospital_id = 1; attempting to view hospital_id = 2 must be blocked with 403
      const res = await request(app)
        .get('/api/admin/analytics/hospital/2')
        .set('Authorization', `Bearer ${blrAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('only authorized to view analytics for your assigned hospital');
    });

    it('allows Hospital Admin to view their own hospital detailed statistics', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/hospital/1')
        .set('Authorization', `Bearer ${blrAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.hospital.id).toBe(1);
      expect(res.body.doctor_stats).toBeDefined();
      expect(res.body.department_breakdown).toBeDefined();
    });

    it('supports CSV analytics export', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Reference No');
    });

    it('automatically registers hospital and categorizes in analytics when doctor registers with custom hospital', async () => {
      const uniqueNum = `STJUDE-${Date.now()}`;
      const docEmail = `dr.stjude.${Date.now()}@health.org`;
      const regRes = await request(app)
        .post('/api/auth/register-doctor')
        .send({
          name: 'Dr. Sarah Mathews',
          email: docEmail,
          phone: '+91-9988776655',
          password: 'Password123!',
          hospital_name: 'St. Jude Specialist Center',
          hospital_location: 'Koramangala, Bengaluru',
          registration_number: uniqueNum,
          state_medical_council: 'Karnataka Medical Council',
          department_id: 1,
          specialization: 'Clinical Cardiology',
          qualifications: 'MBBS, MD'
        });

      expect(regRes.status).toBe(201);

      // Verify hospital was registered in database and analytics
      const analyticsRes = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(analyticsRes.status).toBe(200);
      const stJude = analyticsRes.body.hospital_comparison.find((h: any) => h.name === 'St. Jude Specialist Center');
      expect(stJude).toBeDefined();
      expect(stJude.network_category).toBe('Affiliated & Independent Hospitals');
      expect(stJude.total_doctors).toBe(1);
    });
  });

  describe('Feature 4: AI Medical Report Explainer', () => {
    it('analyzes laboratory report text, identifies abnormal values, and provides simple explanations', async () => {
      const reportText = `
        DIAGNOSTIC PATHOLOGY LABORATORY REPORT
        Patient: Ravi Kumar
        Hemoglobin: 11.0 g/dL
        Total Cholesterol: 235 mg/dL
        Fasting Blood Sugar: 122 mg/dL
        Serum Creatinine: 0.9 mg/dL
      `;

      const res = await request(app)
        .post('/api/ai/explain-report')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          raw_text: reportText,
          language: 'en',
          report_type: 'Comprehensive Metabolic Panel'
        });

      expect(res.status).toBe(200);
      expect(res.body.analysis.total_detected).toBeGreaterThanOrEqual(3);
      expect(res.body.analysis.disclaimer).toBeDefined();

      const parameters = res.body.analysis.parameters;
      const cholParam = parameters.find((p: any) => p.code === 'CHOL_TOTAL');
      expect(cholParam).toBeDefined();
      expect(cholParam.status).toBe('HIGH');
    });

    it('provides multi-language explanations (Tamil & Hindi)', async () => {
      const res = await request(app)
        .post('/api/ai/explain-report')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          raw_text: 'Hemoglobin: 10.5 g/dL',
          language: 'ta'
        });

      expect(res.status).toBe(200);
      const hgb = res.body.analysis.parameters.find((p: any) => p.code === 'HGB');
      expect(hgb.explanation).toContain('ஹீமோகுளோபின்');
    });
  });

  describe('Feature 5: Live Hospital Resource Availability', () => {
    it('retrieves live hospital resources with last updated timestamps', async () => {
      const res = await request(app).get('/api/resources?city=Bengaluru');
      expect(res.status).toBe(200);
      expect(res.body.resources.length).toBeGreaterThan(0);
      expect(res.body.resources[0].last_updated_human).toBeDefined();
      expect(res.body.resources[0].available_capacity).toBeDefined();
      expect(typeof res.body.resources[0].details).toBe('string');
    });

    it('allows Hospital Admin to update their own hospital resource availability', async () => {
      const res = await request(app)
        .put('/api/resources/1')
        .set('Authorization', `Bearer ${blrAdminToken}`)
        .send({
          available_capacity: 55,
          total_capacity: 200,
          status: 'available',
          details: 'Updated live capacity'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Resource availability updated successfully');
    });
  });

  describe('Feature 6: Medicine Reminder System', () => {
    let reminderId: number;

    it('allows patient to add a daily medicine reminder', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          medicine_name: 'Aspirin Cardio',
          dosage: '75 mg (1 tablet)',
          frequency: 'Once Daily',
          timing_slots: ['09:00'],
          food_relation: 'after_food',
          start_date: '2026-11-01',
          end_date: '2026-12-01',
          doctor_instructions: 'Take after breakfast for cardio protection'
        });

      if (res.status !== 201) {
        console.error('BOOK FAILED BODY:', res.status, res.body);
      }
      expect(res.status).toBe(201);
      reminderId = res.body.reminder_id;
    });

    it('returns today schedule and adherence rate', async () => {
      const res = await request(app)
        .get('/api/medicines')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reminders.length).toBeGreaterThan(0);
      expect(res.body.today_schedule).toBeDefined();
      expect(typeof res.body.adherence_rate).toBe('number');
    });

    it('allows patient to log dose as taken', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .post(`/api/medicines/${reminderId}/log`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          scheduled_date: today,
          scheduled_time: '09:00',
          status: 'taken',
          notes: 'Taken on time'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('taken');
    });
  });

  describe('Feature 7: Health Insurance Assistance', () => {
    let policyId: number;

    it('retrieves accepted insurance providers and cashless hospital status', async () => {
      const res = await request(app).get('/api/insurance/providers');
      expect(res.status).toBe(200);
      expect(res.body.providers.length).toBeGreaterThanOrEqual(4);
    });

    it('allows patient to save an insurance policy in the vault', async () => {
      const res = await request(app)
        .post('/api/insurance/my-policies')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          provider_name: 'HDFC ERGO General Insurance',
          policy_number: 'HDFC-HEALTH-84920',
          policy_holder_name: 'Ravi Kumar',
          tpa_id: 'TPA-9921',
          sum_insured: 750000,
          valid_until: '2027-10-31'
        });

      if (res.status !== 201) {
        console.error('BOOK FAILED BODY:', res.status, res.body);
      }
      expect(res.status).toBe(201);
      policyId = res.body.policy_id;
    });

    it('retrieves saved patient policies', async () => {
      const res = await request(app)
        .get('/api/insurance/my-policies')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.policies.length).toBeGreaterThan(0);
    });
  });

  describe('Feature 8: Hospital Indoor Navigation', () => {
    it('retrieves multi-floor layout and mapped locations for a hospital', async () => {
      const res = await request(app).get('/api/navigation/hospital/1/floors');
      expect(res.status).toBe(200);
      expect(res.body.floors.length).toBeGreaterThanOrEqual(3);
      expect(res.body.locations.length).toBeGreaterThanOrEqual(5);
    });

    it('computes wheelchair-accessible directions to a consultation chamber', async () => {
      const res = await request(app)
        .get('/api/navigation/route?hospital_id=1&to_id=9&wheelchair_accessible=true');

      expect(res.status).toBe(200);
      expect(res.body.directions.length).toBeGreaterThanOrEqual(3);
      expect(res.body.is_wheelchair_accessible).toBe(true);
    });
  });

  describe('Feature 9: Remote Patient Follow-Up', () => {
    let followUpId: number;

    it('allows doctor to schedule a remote patient follow-up', async () => {
      const res = await request(app)
        .post('/api/followups')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patientUserId,
          scheduled_date: '2026-11-15',
          instructions: 'Check blood pressure twice daily and report pulse.'
        });

      if (res.status !== 201) {
        console.error('BOOK FAILED BODY:', res.status, res.body);
      }
      expect(res.status).toBe(201);
      followUpId = res.body.followup_id;
    });

    it('allows patient to view their follow-up schedules', async () => {
      const res = await request(app)
        .get('/api/followups/my')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.followups.length).toBeGreaterThan(0);
    });

    it('allows patient to submit progress update with symptoms and vitals', async () => {
      const res = await request(app)
        .put(`/api/followups/${followUpId}/submit-progress`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patient_symptoms: 'Feeling healthy, morning headache gone.',
          patient_recovery_score: 9,
          vitals: { blood_pressure: '120/78', pulse: '70' }
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('submitted to your treating doctor');
    });

    it('allows doctor to review patient progress and submit feedback', async () => {
      const res = await request(app)
        .put(`/api/followups/${followUpId}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          doctor_feedback: 'Vitals are optimal. Continue same medication.',
          recommend_in_person: false
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('review submitted');
    });
  });
});
