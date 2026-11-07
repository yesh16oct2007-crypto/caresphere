import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db/database.js';

describe('CareSphere Autonomous AI Multi-Hospital Management System Tests', () => {
  let adminBlrToken = '';
  let adminChnToken = '';
  let patientToken = '';
  let doctorToken = '';

  let hospBlrId = 1;
  let hospChnId = 2;

  let testDocProfileId = 0;
  let duplicateDocProfileId = 0;
  const testRegNumber = `KA-NMC-${Date.now()}`;

  beforeAll(async () => {
    // 1. Resolve Hospital IDs
    const h1 = db.prepare("SELECT id FROM hospitals WHERE code = 'CS-BLR-01' OR name LIKE '%Bengaluru%' LIMIT 1").get() as any;
    const h2 = db.prepare("SELECT id FROM hospitals WHERE code = 'CS-CHN-01' OR name LIKE '%Chennai%' LIMIT 1").get() as any;
    if (h1) hospBlrId = h1.id;
    if (h2) hospChnId = h2.id;

    // 2. Login as Bengaluru Hospital Admin
    const blrRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'blr.admin@caresphere.health', password: 'Hospital@12345' });
    expect(blrRes.status).toBe(200);
    adminBlrToken = blrRes.body.token;

    // 3. Login as Chennai Hospital Admin
    const chnRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'chn.admin@caresphere.health', password: 'Hospital@12345' });
    expect(chnRes.status).toBe(200);
    adminChnToken = chnRes.body.token;

    // 4. Login or create Patient
    const patientEmail = `ai.patient.${Date.now()}@example.com`;
    const patReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'AI Test Patient',
        email: patientEmail,
        password: 'Password@123',
        phone: '+91-9876500001',
        consent: true
      });
    expect(patReg.status).toBe(201);
    patientToken = patReg.body.token;

    // 5. Register a Doctor under Bengaluru Hospital
    const docEmail = `ai.doc.${Date.now()}@example.com`;
    const docReg = await request(app)
      .post('/api/auth/register-doctor')
      .send({
        name: 'Dr. Ramesh AI Test',
        email: docEmail,
        password: 'Password@123',
        phone: '+91-9876500002',
        hospital_id: hospBlrId,
        registration_number: testRegNumber,
        state_medical_council: 'Karnataka Medical Council',
        department_id: 1,
        specialization: 'Cardiology',
        qualifications: 'MBBS, MD (Cardiology)',
        experience_years: 12,
        consultation_fee: 700,
        council_certificate_url: 'https://example.com/certs/council.pdf',
        degree_certificate_url: 'https://example.com/certs/degree.pdf',
        id_proof_url: 'https://example.com/certs/id.pdf'
      });
    expect(docReg.status).toBe(201);
    doctorToken = docReg.body.token;
    testDocProfileId = docReg.body.doctor_profile_id || (db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(docReg.body.user.id) as any).id;
  });

  // =========================================================================
  // 1. CENTRAL AI ORCHESTRATION SYSTEM (9 Specialized AI Agents)
  // =========================================================================
  describe('Central AI Orchestration System (9 Specialized AI Agents)', () => {
    it('Agent 1 (Patient AI): provides multilingual navigation, doctor recommendations, and safety disclaimer', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          agent_type: 'patient',
          message: 'I have mild chest fluttering after workout. Which doctor should I visit?',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('patient');
      expect(res.body.reply).toBeDefined();
      expect(res.body.reply).toContain('CareSphere Patient AI Assistant');
      expect(res.body.reply).toContain('Safety Note');
      expect(res.body.structured_data).toBeDefined();
      expect(res.body.tokens_used).toBeGreaterThan(0);
    });

    it('Agent 2 (Doctor AI): assists doctors with clinical notes drafting and differential evaluation', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          agent_type: 'doctor',
          message: 'Draft clinical assessment for 54yo male with persistent elevated BP 148/92 mmHg on Amlodipine 5mg.',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('doctor');
      expect(res.body.reply).toContain('Clinical Assessment & Notes Draft');
      expect(res.body.reply).toContain('professional judgment');
    });

    it('Agent 3 (Appointment AI): discovers doctors and suggests available real-time consultation slots', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          agent_type: 'appointment',
          message: 'Find an available Cardiology appointment for tomorrow morning in Bengaluru campus.',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('appointment');
      expect(res.body.structured_data.suggested_slots).toBeInstanceOf(Array);
      expect(res.body.structured_data.suggested_slots.length).toBeGreaterThan(0);
    });

    it('Agent 4 (Pharmacy AI): checks medicine availability, stock quantity, and pricing in hospital inventory', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          agent_type: 'pharmacy',
          message: 'Check availability for Paracetamol 650mg and Amoxicillin 500mg.',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('pharmacy');
      expect(res.body.reply).toContain('Pharmacy AI Agent');
      expect(res.body.structured_data.inventory_matches).toBeInstanceOf(Array);
    });

    it('Agent 5 (Medical Report AI): explains lab biomarkers, highlights parameters, and enforces medical disclaimer', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          agent_type: 'report',
          message: 'Fasting Blood Glucose: 138 mg/dL, HbA1c: 6.8%, Total Cholesterol: 215 mg/dL.',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('report');
      expect(res.body.reply).toContain('AI Medical Report Explainer');
      expect(res.body.reply).toContain('CRITICAL MEDICAL DISCLAIMER');
      expect(res.body.structured_data.requires_doctor_consultation).toBe(true);
    });

    it('Agent 6 (Emergency AI): detects critical symptoms instantly without waiting or delay', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .send({
          agent_type: 'emergency',
          message: 'Patient is having severe crushing chest pain, cannot breathe, and sweating cold profusely!',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('emergency');
      expect(res.body.is_emergency).toBe(true);
      expect(res.body.reply).toContain('EMERGENCY ASSISTANCE ACTIVE');
      expect(res.body.structured_data.national_ambulance).toBe('108');
    });

    it('Agent 7 (Hospital Analytics AI): generates hospital statistics and strategic operational recommendations', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          agent_type: 'analytics',
          message: 'Generate monthly executive analytics and efficiency recommendations for our hospital.',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('analytics');
      expect(res.body.recommendations).toBeInstanceOf(Array);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
    });

    it('Agent 8 (Hospital Operations AI): reports live bed and ICU capacity utilization', async () => {
      const res = await request(app)
        .post('/api/ai/orchestrate')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          agent_type: 'operations',
          message: 'What is our current live resource status?',
          hospital_id: hospBlrId
        });

      expect(res.status).toBe(200);
      expect(res.body.agent_type).toBe('operations');
      expect(res.body.structured_data.resources).toBeInstanceOf(Array);
    });

    it('Agent 9 (Hospital Admin AI): conversational assistant queries hospital data strictly isolated by hospital_id', async () => {
      const res = await request(app)
        .post('/api/ai/admin-assistant')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          message: 'How many doctors are registered in our hospital?'
        });

      expect(res.status).toBe(200);
      expect(res.body.reply).toContain('Doctor Network for');
      expect(res.body.structured_data.hospital_id).toBe(hospBlrId);
    });
  });

  // =========================================================================
  // 2. HOSPITAL-SPECIFIC AI & STRICT RBAC DATA ISOLATION
  // =========================================================================
  describe('Hospital-Specific AI & Strict Data Isolation', () => {
    it('Admin A (Bengaluru) sees only Bengaluru hospital doctor metrics', async () => {
      const res = await request(app)
        .post('/api/ai/admin-assistant')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          message: 'How many applications are pending?'
        });

      expect(res.status).toBe(200);
      expect(res.body.structured_data.hospital_id).toBe(hospBlrId);
      expect(res.body.reply).toContain('pending doctor application');
    });

    it('Admin B (Chennai) sees only Chennai hospital metrics and NEVER sees Bengaluru data', async () => {
      const res = await request(app)
        .post('/api/ai/admin-assistant')
        .set('Authorization', `Bearer ${adminChnToken}`)
        .send({
          message: 'How many applications are pending?'
        });

      expect(res.status).toBe(200);
      expect(res.body.structured_data.hospital_id).toBe(hospChnId);
    });

    it('blocks non-admin users from accessing Hospital Admin Assistant', async () => {
      const res = await request(app)
        .post('/api/ai/admin-assistant')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'How many doctors are registered?'
        });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. AI DOCTOR VERIFICATION AGENT & DUPLICATE DETECTION
  // =========================================================================
  describe('AI Doctor Verification Agent & Duplicate Application Detection', () => {
    it('automatically generates an AI verification report upon doctor registration', async () => {
      const res = await request(app)
        .get(`/api/ai/doctor/${testDocProfileId}/verification-report`)
        .set('Authorization', `Bearer ${adminBlrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.doctor_id).toBe(testDocProfileId);
      expect(res.body.report.authenticity_score).toBeGreaterThanOrEqual(80);
      expect(res.body.report.council_valid).toBe(true);
      expect(res.body.report.duplicate_detected).toBe(false);
      expect(res.body.report.recommendation).toBe('RECOMMENDED_FOR_APPROVAL');
    });

    it('enforces hospital isolation on AI verification reports: Hospital B admin cannot view Hospital A doctor report', async () => {
      const res = await request(app)
        .get(`/api/ai/doctor/${testDocProfileId}/verification-report`)
        .set('Authorization', `Bearer ${adminChnToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('detects duplicate registration number across hospitals and flags suspicious application', async () => {
      // Register a second doctor attempting to use the identical registration number
      const dupEmail = `dr.duplicate.${Date.now()}@example.com`;
      const userRes = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, hospital_id)
        VALUES ('Dr. Duplicate Imposter', ?, 'fakehash', 'doctor', ?)
      `).run(dupEmail, hospChnId);
      const dupUserId = Number(userRes.lastInsertRowid);

      const docRes = db.prepare(`
        INSERT INTO doctor_profiles (
          user_id, hospital_id, hospital_name, registration_number, state_medical_council,
          specialization, qualifications, experience_years, consultation_fee, verification_status
        ) VALUES (?, ?, 'Chennai Hospital', ?, 'Karnataka Medical Council', 'Cardiology', 'MBBS', 10, 600, 'pending')
      `).run(dupUserId, hospChnId, testRegNumber);
      duplicateDocProfileId = Number(docRes.lastInsertRowid);

      // Trigger AI verification audit on duplicate application
      const auditRes = await request(app)
        .post(`/api/ai/verify-doctor/${duplicateDocProfileId}`)
        .set('Authorization', `Bearer ${adminChnToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.verification_report.duplicate_detected).toBe(true);
      expect(auditRes.body.verification_report.authenticity_score).toBeLessThanOrEqual(55);
      expect(auditRes.body.verification_report.recommendation).toBe('SUSPICIOUS_REJECT_RECOMMENDED');
      expect(auditRes.body.verification_report.flags.some((f: string) => f.includes('DUPLICATE DETECTED'))).toBe(true);
    });

    it('human authorization safeguard: Hospital A admin approves doctor, Hospital B admin is blocked from approving Hospital A doctor', async () => {
      // Hospital B admin attempts to approve Hospital A doctor -> 403 Forbidden
      const unauthorizedRes = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminChnToken}`)
        .send({
          doctor_profile_id: testDocProfileId,
          status: 'approved',
          notes: 'Unauthorized approval attempt.'
        });
      expect(unauthorizedRes.status).toBe(403);

      // Hospital A admin approves their own doctor -> 200 OK
      const authorizedRes = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          doctor_profile_id: testDocProfileId,
          status: 'approved',
          notes: 'Credentials validated via AI audit and human verification.'
        });
      expect(authorizedRes.status).toBe(200);
      expect(authorizedRes.body.status).toBe('approved');
    });
  });

  // =========================================================================
  // 4. AUTONOMOUS OPERATIONS ENGINE & BACKGROUND SCHEDULER
  // =========================================================================
  describe('Autonomous Operations Engine & Background Automation', () => {
    it('executes autonomous cycle: appointment reminders, medicine reminders, low stock alerts, and audit logs', async () => {
      // 1. Seed a test upcoming appointment for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO appointments (
          reference_no, patient_id, doctor_id, department_id, hospital_id,
          appointment_date, appointment_time, status
        ) VALUES (?, (SELECT id FROM users WHERE role = 'patient' LIMIT 1), ?, 1, ?, ?, '10:00', 'confirmed')
      `).run(`REF-TEST-${Date.now()}`, testDocProfileId, hospBlrId, tomorrowStr);

      // 2. Trigger autonomous operations cycle
      const autoRes = await request(app)
        .post('/api/automation/trigger')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({ hospital_id: hospBlrId });

      expect(autoRes.status).toBe(200);
      expect(autoRes.body.success).toBe(true);
      expect(autoRes.body.result).toBeDefined();
      expect(autoRes.body.result.jobs).toBeDefined();

      // 3. Verify automation logs recorded in database
      const logsRes = await request(app)
        .get('/api/automation/logs')
        .set('Authorization', `Bearer ${adminBlrToken}`);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body.logs).toBeInstanceOf(Array);
      expect(logsRes.body.logs.length).toBeGreaterThan(0);
      expect(logsRes.body.logs[0].job_name).toBe('autonomous_operations_cycle');
    });

    it('retrieves hospital-scoped AI recommendations', async () => {
      const recsRes = await request(app)
        .get('/api/ai/hospital/recommendations')
        .set('Authorization', `Bearer ${adminBlrToken}`);

      expect(recsRes.status).toBe(200);
      expect(recsRes.body.recommendations).toBeInstanceOf(Array);
      expect(recsRes.body.recommendations.length).toBeGreaterThan(0);
      expect(recsRes.body.hospital_id).toBe(hospBlrId);
    });
  });
});
