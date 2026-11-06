import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db, initDatabase } from '../db/database.js';

describe('CareSphere Healthcare Platform API Tests', () => {
  let adminToken: string;
  let patientToken: string;
  let patientUserId: number;
  let doctorToken: string;
  let approvedDoctorId: number;

  beforeAll(async () => {
    initDatabase();

    // Ensure clean test admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@caresphere.health', password: 'Admin@12345' });

    if (loginRes.status === 200) {
      adminToken = loginRes.body.token;
    } else {
      // Re-seed if needed
      const { seedDatabase } = await import('../db/seed.js');
      seedDatabase();
      const retryLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@caresphere.health', password: 'Admin@12345' });
      adminToken = retryLogin.body.token;
    }

    // Get an approved doctor
    const docRes = await request(app).get('/api/doctors');
    expect(docRes.status).toBe(200);
    expect(docRes.body.doctors.length).toBeGreaterThan(0);
    approvedDoctorId = docRes.body.doctors[0].doctor_id;
  });

  describe('1. Health Check & Public Information', () => {
    it('returns healthy status and supported languages', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.supported_languages).toContain('ta');
      expect(res.body.supported_languages).toContain('hi');
    });

    it('returns hospital information and emergency hotlines', async () => {
      const res = await request(app).get('/api/hospital/info');
      expect(res.status).toBe(200);
      expect(res.body.hospital.emergency_phone).toBe('+91-80-CARE-911');
      expect(res.body.hospital.tagline).toBe('Your Health, Your Language, Your Care');
    });

    it('returns verified departments', async () => {
      const res = await request(app).get('/api/hospital/departments');
      expect(res.status).toBe(200);
      expect(res.body.departments.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('2. Authentication & Multilingual Profile', () => {
    const testPatientEmail = `test.patient.${Date.now()}@example.com`;

    it('registers a new patient with language preference', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Meera Krishnan',
          email: testPatientEmail,
          phone: '+91-9876501234',
          password: 'Password@123',
          preferred_language: 'ta',
          date_of_birth: '1992-04-15',
          gender: 'Female',
          blood_group: 'O+',
          consent: true
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('patient');
      expect(res.body.user.preferred_language).toBe('ta');

      patientToken = res.body.token;
      patientUserId = res.body.user.id;
    });

    it('prevents registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Patient',
          email: testPatientEmail,
          password: 'Password@123',
          consent: true
        });

      expect(res.status).toBe(409);
    });

    it('authenticates patient and preserves preferred language', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testPatientEmail,
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.preferred_language).toBe('ta');
    });

    it('updates patient preferred language in database', async () => {
      const res = await request(app)
        .put('/api/auth/update-language')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ preferred_language: 'hi' });

      expect(res.status).toBe(200);

      // Verify via /api/auth/me
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.preferred_language).toBe('hi');
    });

    it('allows a hospital administrator to register and links them to their hospital', async () => {
      const email = `admin.hosp.${Date.now()}@hospital.health`;
      const res = await request(app)
        .post('/api/auth/register-hospital-admin')
        .send({
          name: 'Hospital Administrator Test',
          email,
          phone: '+91-9876543299',
          password: 'HospitalAdmin@12345',
          hospital_id: 1,
          preferred_language: 'en'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('hospital_admin');
      expect(res.body.user.hospital_id).toBe(1);
    });
  });

  describe('3. Role-Based Access Control (RBAC) & Doctor Approval Process', () => {
    it('denies patient access to admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('allows admin to view system stats', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.total_patients).toBeGreaterThanOrEqual(1);
    });

    it('allows a doctor to register with pending status', async () => {
      const uniqueReg = `REG-${Date.now()}`;
      const docEmail = `dr.new.${Date.now()}@caresphere.health`;

      const regRes = await request(app)
        .post('/api/auth/register-doctor')
        .send({
          name: 'Dr. Vikram Malhotra',
          email: docEmail,
          phone: '+91-9988776655',
          password: 'Doctor@12345',
          hospital_name: 'CareSphere Children Medical Center',
          hospital_location: 'Indiranagar, Bengaluru',
          registration_number: uniqueReg,
          department_id: 1,
          specialization: 'Pediatric Cardiology',
          qualifications: 'MBBS, MD, FACC',
          experience_years: 7,
          consultation_fee: 700,
          preferred_language: 'hi'
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.verification_status).toBe('pending');

      // Check admin pending queue
      const pendingRes = await request(app)
        .get('/api/admin/pending-doctors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pendingRes.status).toBe(200);
      const pendingDoc = pendingRes.body.pending_doctors.find((d: any) => d.registration_number === uniqueReg);
      expect(pendingDoc).toBeDefined();
      expect(pendingDoc.hospital_name).toBe('CareSphere Children Medical Center');
      expect(pendingDoc.hospital_location).toBe('Indiranagar, Bengaluru');

      // Admin approves the doctor with Authoritative Verification Checklist
      const approveRes = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctor_profile_id: pendingDoc.doctor_profile_id,
          status: 'verified',
          notes: 'Full authoritative check passed against state medical council database.',
          checklist: {
            council_reg_verified: true,
            id_verified: true,
            degree_verified: true,
            background_cleared: true,
            chamber_assigned: true
          }
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('verified');
      expect(approveRes.body.checklist.council_reg_verified).toBe(true);
    });

    it('allows a doctor to update their real-time hospital presence and chamber location', async () => {
      // Login as Dr. Rajesh Sharma
      const docLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dr.sharma@caresphere.health', password: 'Doctor@12345' });

      expect(docLogin.status).toBe(200);
      const docToken = docLogin.body.token;

      // Update presence
      const presenceRes = await request(app)
        .put('/api/doctors/me/presence')
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          current_presence_status: 'in_consultation',
          room_number: 'Chamber 305',
          floor: 'Floor 3',
          wing: 'North Wing Cardiac OPD',
          navigation_instructions: 'Take elevator B to floor 3. Turn right to Chamber 305.'
        });

      expect(presenceRes.status).toBe(200);
      expect(presenceRes.body.presence.current_presence_status).toBe('in_consultation');
      expect(presenceRes.body.presence.room_number).toBe('Chamber 305');

      // Verify doctor schedule returns updated location and presence
      const scheduleRes = await request(app)
        .get('/api/doctors/me/schedule')
        .set('Authorization', `Bearer ${docToken}`);

      expect(scheduleRes.status).toBe(200);
      expect(scheduleRes.body.room_number).toBe('Chamber 305');
      expect(scheduleRes.body.current_presence_status).toBe('in_consultation');
    });

    it('prevents patient from booking an unverified or suspended doctor', async () => {
      // Find or create a doctor that is suspended
      const suspendedDoctor = db.prepare("SELECT id FROM doctor_profiles WHERE verification_status = 'suspended'").get() as any;
      if (suspendedDoctor) {
        const bookRes = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            doctor_id: suspendedDoctor.id,
            appointment_date: '2026-11-20',
            appointment_time: '11:00',
            patient_notes: 'Trying to book suspended doctor'
          });

        expect(bookRes.status).toBe(400);
        expect(bookRes.body.error).toContain('not approved or verified');
      }
    });
  });

  describe('4. Appointment Booking, Concurrency Prevention & Cancellation', () => {
    const randomDay = String((Date.now() % 25) + 1).padStart(2, '0');
    const testDate = `2026-12-${randomDay}`;
    const testTime = `${String(10 + (Date.now() % 6))}:15`;
    let bookedRefNo: string;
    let appointmentId: number;

    it('successfully books an appointment with unique reference code', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: approvedDoctorId,
          appointment_date: testDate,
          appointment_time: testTime,
          patient_notes: 'Initial checkup for cardiac consultation.'
        });

      expect(res.status).toBe(201);
      expect(res.body.reference_no).toMatch(/^CS-\d{4}-\d{5}$/);
      bookedRefNo = res.body.reference_no;
      appointmentId = res.body.appointment.id;
    });

    it('strictly prevents duplicate booking on the exact same slot (concurrency guard)', async () => {
      // Attempting to book the SAME doctor, SAME date, and SAME time slot
      const conflictRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: approvedDoctorId,
          appointment_date: testDate,
          appointment_time: testTime,
          patient_notes: 'Attempting to double book.'
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error).toContain('reserved by another patient');
    });

    it('shows the appointment in patient dashboard list', async () => {
      const res = await request(app)
        .get('/api/appointments/my')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      const found = res.body.appointments.find((a: any) => a.reference_no === bookedRefNo);
      expect(found).toBeDefined();
      expect(found.status).toBe('confirmed');
    });

    it('cancels appointment and releases slot for re-booking', async () => {
      const cancelRes = await request(app)
        .put(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Personal scheduling conflict' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');

      // Now that the prior appointment is cancelled, the slot can be booked again!
      const rebookRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: approvedDoctorId,
          appointment_date: testDate,
          appointment_time: testTime,
          patient_notes: 'Rebooking the released slot.'
        });

      expect(rebookRes.status).toBe(201);
    });
  });

  describe('5. AI Assistant & Multilingual Safety', () => {
    it('detects medical emergency and immediately returns urgent warning and emergency numbers', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'My father has severe chest pain and cannot breathe, please help!',
          language: 'en'
        });

      expect(res.status).toBe(200);
      expect(res.body.is_emergency).toBe(true);
      expect(res.body.reply).toContain('+91-80-CARE-911');
      expect(res.body.reply).toContain('108');
    });

    it('detects emergency in regional language (Tamil)', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'எனக்கு நெஞ்சு வலி அதிகமாக உள்ளது மற்றும் மயக்கம் வருகிறது',
          language: 'ta'
        });

      expect(res.status).toBe(200);
      expect(res.body.is_emergency).toBe(true);
      expect(res.body.reply).toContain('அவசர எச்சரிக்கை');
      expect(res.body.reply).toContain('+91-80-CARE-911');
    });

    it('answers general hospital inquiry in user preferred language (Hindi)', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'अस्पताल के ओपीडी और मिलने का क्या समय है?',
          language: 'hi'
        });

      expect(res.status).toBe(200);
      expect(res.body.is_emergency).toBe(false);
      expect(res.body.reply).toContain('ओपीडी');
    });
  });

  afterAll(async () => {
    try {
      if (patientUserId) {
        db.prepare('DELETE FROM appointments WHERE patient_id = ?').run(patientUserId);
        db.prepare('DELETE FROM users WHERE id = ?').run(patientUserId);
      }
      db.prepare("DELETE FROM users WHERE email LIKE 'dr.new.%'").run();
      db.prepare("DELETE FROM users WHERE email LIKE 'test.patient.%'").run();
    } catch (e) {
      // test cleanup
    }
  });
});
