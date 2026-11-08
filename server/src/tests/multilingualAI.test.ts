import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db/database.js';
import { detectLanguage } from '../services/languageDetector.js';
import { parseMultilingualIntent } from '../services/multilingualIntentParser.js';

describe('CareSphere Multilingual AI Understanding & Real Action Execution Tests', () => {
  let patientToken = '';
  let patientId = 0;
  let adminBlrToken = '';
  let adminChnToken = '';
  let hospBlrId = 1;
  let hospChnId = 2;

  let approvedDoctorUserId = 0;
  let approvedDoctorName = '';

  const testSessionId = `test_session_${Date.now()}`;

  beforeAll(async () => {
    // 1. Resolve Hospital IDs
    const h1 = db.prepare("SELECT id FROM hospitals WHERE code = 'CS-BLR-01' OR name LIKE '%Bengaluru%' LIMIT 1").get() as any;
    const h2 = db.prepare("SELECT id FROM hospitals WHERE code = 'CS-CHN-01' OR name LIKE '%Chennai%' LIMIT 1").get() as any;
    if (h1) hospBlrId = h1.id;
    if (h2) hospChnId = h2.id;

    // 2. Login Admins
    const blrRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'blr.admin@caresphere.health', password: 'Hospital@12345' });
    expect(blrRes.status).toBe(200);
    adminBlrToken = blrRes.body.token;

    const chnRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'chn.admin@caresphere.health', password: 'Hospital@12345' });
    expect(chnRes.status).toBe(200);
    adminChnToken = chnRes.body.token;

    // 3. Register Patient
    const patEmail = `multi.ai.patient.${Date.now()}@example.com`;
    const patRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Multilingual Test Patient',
        email: patEmail,
        password: 'Password@123',
        phone: '+91-9988776655',
        consent: true
      });
    expect(patRes.status).toBe(201);
    patientToken = patRes.body.token;
    patientId = patRes.body.user.id;

    // 4. Find an approved doctor in DB
    const docRow = db.prepare(`
      SELECT dp.user_id, u.name, dp.specialization
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.verification_status = 'approved'
      LIMIT 1
    `).get() as any;

    if (docRow) {
      approvedDoctorUserId = docRow.user_id;
      approvedDoctorName = docRow.name;
    } else {
      // Seed a doctor if none
      const docEmail = `dr.multi.${Date.now()}@example.com`;
      const regDoc = await request(app)
        .post('/api/auth/register-doctor')
        .send({
          name: 'Dr. Multi AI Specialist',
          email: docEmail,
          password: 'Password@123',
          phone: '+91-9988776600',
          hospital_id: hospBlrId,
          specialization: 'Cardiology',
          medical_council_reg_number: `REG-AI-${Date.now()}`,
          experience_years: 10,
          consultation_fee: 600,
          qualifications: 'MBBS, MD'
        });
      approvedDoctorUserId = regDoc.body.user.id;
      approvedDoctorName = 'Dr. Multi AI Specialist';
      db.prepare("UPDATE doctor_profiles SET verification_status = 'approved' WHERE user_id = ?").run(approvedDoctorUserId);
    }
  });

  // ==========================================
  // 1. LANGUAGE DETECTION & SCRIPT RECOGNITION
  // ==========================================
  describe('Language Detection & Script Recognition', () => {
    it('detects native Tamil script', () => {
      const res = detectLanguage('எனது அப்பாய்ன்ட்மென்ட் விவரங்களை காட்டவும்');
      expect(res.lang).toBe('ta');
    });

    it('detects native Telugu script', () => {
      const res = detectLanguage('నా అపాయింట్‌మెంట్లు చూపించు');
      expect(res.lang).toBe('te');
    });

    it('detects native Hindi (Devanagari) script', () => {
      const res = detectLanguage('मेरी अपॉइंटमेंट कब है?');
      expect(res.lang).toBe('hi');
    });

    it('detects native Malayalam script', () => {
      const res = detectLanguage('ഡോക്ടറെ കാണാൻ എപ്പോഴാണ് സമയം?');
      expect(res.lang).toBe('ml');
    });

    it('detects native Kannada script', () => {
      const res = detectLanguage('ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ವಿವರಗಳನ್ನು ತೋರಿಸಿ');
      expect(res.lang).toBe('kn');
    });

    it('detects transliterated Tanglish (Tamil in English script)', () => {
      const res = detectLanguage('ennoda appointments kaatunga doctor');
      expect(res.lang).toBe('ta');
    });

    it('detects transliterated Hinglish (Hindi in English script)', () => {
      const res = detectLanguage('meri appointment kab ki hai batao');
      expect(res.lang).toBe('hi');
    });

    it('detects transliterated Tenglish (Telugu in English script)', () => {
      const res = detectLanguage('doctor appointments chupinchu repu');
      expect(res.lang).toBe('te');
    });

    it('defaults standard English to en', () => {
      const res = detectLanguage('Show my doctor appointments for tomorrow');
      expect(res.lang).toBe('en');
    });
  });

  // ==========================================
  // 2. INTENT PARSER & TYPO TOLERANCE
  // ==========================================
  describe('Intent Parsing & Typo Tolerance', () => {
    it('parses appointment request with severe typos', () => {
      const res = parseMultilingualIntent('bok apointmnt docter priya');
      expect(res.intent).toBe('BOOK_APPOINTMENT');
      expect(res.entities.doctor_name).toBeDefined();
    });

    it('parses cancel appointment with typos', () => {
      const res = parseMultilingualIntent('cancl my apointmnt please');
      expect(res.intent).toBe('CANCEL_APPOINTMENT');
    });

    it('parses index ordinals across multiple languages', () => {
      const firstEn = parseMultilingualIntent('cancel the first appointment');
      expect(firstEn.entities.target_index).toBe(0);

      const secondEn = parseMultilingualIntent('cancel second one');
      expect(secondEn.entities.target_index).toBe(1);

      const secondTa = parseMultilingualIntent('rendavathu appointment cancel pannu');
      expect(secondTa.entities.target_index).toBe(1);

      const firstHi = parseMultilingualIntent('pehla appointment cancel kardo');
      expect(firstHi.entities.target_index).toBe(0);
    });

    it('detects confirmation in English, Tamil, and Hindi', () => {
      expect(parseMultilingualIntent('yes, please confirm').intent).toBe('CONFIRM_ACTION');
      expect(parseMultilingualIntent('sari confirm pannunga').intent).toBe('CONFIRM_ACTION');
      expect(parseMultilingualIntent('haan kardo').intent).toBe('CONFIRM_ACTION');
    });

    it('detects rejections / abortions', () => {
      expect(parseMultilingualIntent('no, do not cancel').intent).toBe('REJECT_ACTION');
      expect(parseMultilingualIntent('vendaam').intent).toBe('REJECT_ACTION');
      expect(parseMultilingualIntent('nahi mat karo').intent).toBe('REJECT_ACTION');
    });
  });

  // ==========================================
  // 3. REAL USER ACTION EXECUTION: PATIENT APPOINTMENTS
  // ==========================================
  describe('Patient Real Task Execution via AI Chat', () => {
    it('shows empty appointment list for new patient in natural language', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Show my appointments',
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('SHOW_MY_APPOINTMENTS');
      expect(Array.isArray(res.body.action_data.appointments)).toBe(true);
      expect(res.body.reply).toBeDefined();
    });

    it('books a real doctor appointment through natural language request', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 10 + Math.floor(Math.random() * 30));
      const dateStr = tomorrow.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: `Book appointment with ${approvedDoctorName} on ${dateStr} at 10:00 AM`,
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('BOOK_APPOINTMENT');
      expect(res.body.action_data.appointment).toBeDefined();
      expect(res.body.action_data.appointment.reference_number).toBeDefined();
      expect(res.body.reply).toBeDefined();

      // Verify insertion in database
      const dbAppt = db.prepare('SELECT * FROM appointments WHERE patient_id = ?').get(patientId) as any;
      expect(dbAppt).toBeDefined();
      expect(dbAppt.status).toBe('confirmed');
    });

    it('books a second appointment in Tamil/Tanglish', async () => {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 50 + Math.floor(Math.random() * 30));
      const dateStr = dayAfter.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: `ennoda doctor appointment book pannunga ${approvedDoctorName} kooda ${dateStr} 11:00 AM`,
          language: 'ta',
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('BOOK_APPOINTMENT');
      expect(res.body.action_data.appointment).toBeDefined();
    });

    it('shows the 2 booked appointments in Tamil', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'என் அப்பாய்ன்ட்மென்ட் விவரங்களை காட்டு',
          language: 'ta',
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('SHOW_MY_APPOINTMENTS');
      expect(res.body.action_data.appointments.length).toBeGreaterThanOrEqual(2);
      expect(res.body.reply).toBeDefined();
    });
  });

  // ==========================================
  // 4. MULTI-TURN CONVERSATION & CONFIRMATION SAFEGUARD
  // ==========================================
  describe('Multi-turn Context Memory & Confirmation Safeguard', () => {
    it('understands ordinal follow-up "Cancel the first one" and prompts for confirmation', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Cancel the first one',
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.requires_confirmation).toBe(true);
      expect(res.body.reply).toBeDefined();
    });

    it('cancels appointment in database upon user confirmation "Yes, confirm"', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Yes, please confirm',
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('CANCEL_APPOINTMENT');
      expect(res.body.reply).toBeDefined();

      // Verify at least one appointment is cancelled in DB
      const cancelledAppt = db.prepare("SELECT * FROM appointments WHERE patient_id = ? AND status = 'cancelled'").get(patientId) as any;
      expect(cancelledAppt).toBeDefined();
    });
  });

  // ==========================================
  // 5. PHARMACY MEDICINES & MEDICAL RECORDS
  // ==========================================
  describe('Pharmacy Inventory & Medical Records Queries', () => {
    it('shows available medicines in hospital pharmacy via AI chat', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Show available medicines in pharmacy',
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('SHOW_AVAILABLE_MEDICINES');
      expect(Array.isArray(res.body.action_data.medicines)).toBe(true);
    });

    it('shows medical records for patient', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Show my medical records',
          sessionId: testSessionId
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('SHOW_MEDICAL_RECORDS');
      expect(Array.isArray(res.body.action_data.records)).toBe(true);
    });
  });

  // ==========================================
  // 6. HOSPITAL ADMIN ACTION & STRICT ISOLATION
  // ==========================================
  describe('Hospital Admin Actions & Hospital Data Isolation', () => {
    it('Bengaluru Admin gets pending doctors for Bengaluru only', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          message: 'Show pending doctor registrations',
          sessionId: `blr_admin_${Date.now()}`
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('SHOW_PENDING_DOCTORS');
      expect(Array.isArray(res.body.action_data.doctors)).toBe(true);

      // All returned doctors must belong to Bengaluru hospital
      for (const d of res.body.action_data.doctors) {
        expect(d.hospital_id).toBe(hospBlrId);
      }
    });

    it('Chennai Admin does not see Bengaluru pending doctors', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${adminChnToken}`)
        .send({
          message: 'Show pending doctor registrations',
          sessionId: `chn_admin_${Date.now()}`
        });

      expect(res.status).toBe(200);
      expect(res.body.action_executed).toBe('SHOW_PENDING_DOCTORS');
      for (const d of res.body.action_data.doctors) {
        expect(d.hospital_id).toBe(hospChnId);
      }
    });
  });

  // ==========================================
  // 7. URGENT EMERGENCY DETECTION ACROSS LANGUAGES
  // ==========================================
  describe('Urgent Medical Emergency Detection', () => {
    it('detects English emergency and returns 24/7 hotline', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'I am experiencing severe chest pain and breathlessness'
        });

      expect(res.status).toBe(200);
      expect(res.body.is_emergency).toBe(true);
      expect(res.body.emergency_contacts).toBeDefined();
      expect(res.body.emergency_contacts.length).toBeGreaterThan(0);
    });

    it('detects Tamil emergency keywords and provides Tamil hotline response', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'எனக்கு கடுமையான நெஞ்சு வலி உள்ளது, மூச்சு விட முடியவில்லை'
        });

      expect(res.status).toBe(200);
      expect(res.body.is_emergency).toBe(true);
      expect(res.body.language).toBe('ta');
      expect(res.body.reply).toContain('அவசர');
    });

    it('detects Hindi emergency keywords and provides Hindi hotline response', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'मुझे सीने में दर्द हो रहा है और सांस लेने में तकलीफ है'
        });

      expect(res.status).toBe(200);
      expect(res.body.is_emergency).toBe(true);
      expect(res.body.language).toBe('hi');
      expect(res.body.reply).toContain('आपातकालीन');
    });
  });
});
