import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db/database.js';

describe('Hospital-Wise Separate Admin Portals and Doctor Approval RBAC Tests', () => {
  let adminBlrToken = '';
  let adminChnToken = '';
  let adminHydToken = '';

  let hospBlrId = 1;
  let hospChnId = 2;
  let hospHydId = 3;

  let docBlrProfileId = 0;
  let docChnProfileId = 0;
  let docHydProfileId = 0;

  let docBlrEmail = `dr.blr.test.${Date.now()}@example.com`;
  let docChnEmail = `dr.chn.test.${Date.now()}@example.com`;
  let docHydEmail = `dr.hyd.test.${Date.now()}@example.com`;

  beforeAll(async () => {
    // 1. Resolve Hospital IDs from DB
    const h1 = db.prepare("SELECT id FROM hospitals WHERE code = 'CS-BLR-01' OR name LIKE '%Bengaluru%' LIMIT 1").get() as any;
    const h2 = db.prepare("SELECT id FROM hospitals WHERE code = 'CS-CHN-01' OR name LIKE '%Chennai%' LIMIT 1").get() as any;
    const h3 = db.prepare("SELECT id FROM hospitals WHERE code = 'CS-HYD-01' OR name LIKE '%Hyderabad%' LIMIT 1").get() as any;

    if (h1) hospBlrId = h1.id;
    if (h2) hospChnId = h2.id;
    if (h3) hospHydId = h3.id;

    // 2. Login as Bengaluru Hospital Admin
    const blrRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'blr.admin@caresphere.health', password: 'Hospital@12345' });
    expect(blrRes.status).toBe(200);
    expect(blrRes.body.user.role).toBe('hospital_admin');
    expect(blrRes.body.user.hospital_id).toBe(hospBlrId);
    adminBlrToken = blrRes.body.token;

    // 3. Login as Chennai Hospital Admin
    const chnRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'chn.admin@caresphere.health', password: 'Hospital@12345' });
    expect(chnRes.status).toBe(200);
    expect(chnRes.body.user.role).toBe('hospital_admin');
    expect(chnRes.body.user.hospital_id).toBe(hospChnId);
    adminChnToken = chnRes.body.token;

    // 4. Login as Hyderabad Hospital Admin
    const hydRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hyd.admin@caresphere.health', password: 'Hospital@12345' });
    expect(hydRes.status).toBe(200);
    expect(hydRes.body.user.role).toBe('hospital_admin');
    expect(hydRes.body.user.hospital_id).toBe(hospHydId);
    adminHydToken = hydRes.body.token;
  });

  // =========================================================================
  // REQUIREMENT 1 & 2: HOSPITAL-WISE DOCTOR REGISTRATION
  // =========================================================================
  describe('Hospital-Wise Doctor Registration', () => {
    it('should register Doctor A assigned to Hospital 1 (Bengaluru)', async () => {
      const res = await request(app)
        .post('/api/auth/register-doctor')
        .send({
          name: 'Dr. Aarav Patel',
          email: docBlrEmail,
          password: 'Doctor@12345',
          hospital_id: hospBlrId,
          hospital_name: 'CareSphere Super Specialty Hospital',
          hospital_location: 'Bellandur, Bengaluru',
          registration_number: `KMC-BLR-${Date.now().toString().slice(-6)}`,
          state_medical_council: 'Karnataka Medical Council (KMC)',
          department_id: 1,
          specialization: 'Interventional Cardiology',
          qualifications: 'MBBS, MD, DM (Cardiology)',
          experience_years: 10,
          consultation_fee: 700,
          council_certificate_url: 'https://example.com/certs/kmc-aarav.pdf',
          degree_certificate_url: 'https://example.com/certs/degree-aarav.pdf',
          id_proof_url: 'https://example.com/certs/id-aarav.pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.verification_status).toBe('pending');
      expect(res.body.user.role).toBe('doctor');

      const profile = db.prepare('SELECT id, hospital_id FROM doctor_profiles WHERE user_id = ?').get(res.body.user.id) as any;
      expect(profile).toBeDefined();
      expect(profile.hospital_id).toBe(hospBlrId);
      docBlrProfileId = profile.id;
    });

    it('should register Doctor B assigned to Hospital 2 (Chennai)', async () => {
      const res = await request(app)
        .post('/api/auth/register-doctor')
        .send({
          name: 'Dr. Priya Sundaram',
          email: docChnEmail,
          password: 'Doctor@12345',
          hospital_id: hospChnId,
          hospital_name: 'CareSphere Multi-Specialty Hospital',
          hospital_location: 'Greams Road, Chennai',
          registration_number: `TMC-CHN-${Date.now().toString().slice(-6)}`,
          state_medical_council: 'Tamil Nadu Medical Council',
          department_id: 2,
          specialization: 'Neurologist',
          qualifications: 'MBBS, MD, DM (Neurology)',
          experience_years: 8,
          consultation_fee: 800,
          council_certificate_url: 'https://example.com/certs/tmc-priya.pdf',
          degree_certificate_url: 'https://example.com/certs/degree-priya.pdf',
          id_proof_url: 'https://example.com/certs/id-priya.pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.verification_status).toBe('pending');

      const profile = db.prepare('SELECT id, hospital_id FROM doctor_profiles WHERE user_id = ?').get(res.body.user.id) as any;
      expect(profile.hospital_id).toBe(hospChnId);
      docChnProfileId = profile.id;
    });

    it('should register Doctor C assigned to Hospital 3 (Hyderabad)', async () => {
      const res = await request(app)
        .post('/api/auth/register-doctor')
        .send({
          name: 'Dr. Suresh Reddy',
          email: docHydEmail,
          password: 'Doctor@12345',
          hospital_id: hospHydId,
          hospital_name: 'CareSphere Advanced Healthcare Center',
          hospital_location: 'Hitec City, Hyderabad',
          registration_number: `TSMC-HYD-${Date.now().toString().slice(-6)}`,
          state_medical_council: 'Telangana State Medical Council',
          department_id: 3,
          specialization: 'Pediatric Specialist',
          qualifications: 'MBBS, MD (Pediatrics)',
          experience_years: 7,
          consultation_fee: 650
        });

      expect(res.status).toBe(201);
      expect(res.body.verification_status).toBe('pending');

      const profile = db.prepare('SELECT id, hospital_id FROM doctor_profiles WHERE user_id = ?').get(res.body.user.id) as any;
      expect(profile.hospital_id).toBe(hospHydId);
      docHydProfileId = profile.id;
    });
  });

  // =========================================================================
  // REQUIREMENT 3 & 4: STRICT HOSPITAL-WISE VISIBILITY & ACCESS CONTROL (RBAC)
  // =========================================================================
  describe('Strict Hospital-Wise Access Control & Isolation', () => {
    it('Admin BLR sees ONLY Doctor BLR and NOT Doctor CHN or Doctor HYD', async () => {
      const res = await request(app)
        .get('/api/admin/pending-doctors')
        .set('Authorization', `Bearer ${adminBlrToken}`);

      expect(res.status).toBe(200);
      const pending = res.body.pending_doctors as any[];
      const docIds = pending.map(d => d.doctor_profile_id);

      expect(docIds).toContain(docBlrProfileId);
      expect(docIds).not.toContain(docChnProfileId);
      expect(docIds).not.toContain(docHydProfileId);

      // Verify all returned doctors belong to Hospital 1
      pending.forEach(d => {
        expect(d.hospital_id).toBe(hospBlrId);
      });
    });

    it('Admin CHN sees ONLY Doctor CHN and NOT Doctor BLR or Doctor HYD', async () => {
      const res = await request(app)
        .get('/api/admin/pending-doctors')
        .set('Authorization', `Bearer ${adminChnToken}`);

      expect(res.status).toBe(200);
      const pending = res.body.pending_doctors as any[];
      const docIds = pending.map(d => d.doctor_profile_id);

      expect(docIds).toContain(docChnProfileId);
      expect(docIds).not.toContain(docBlrProfileId);
      expect(docIds).not.toContain(docHydProfileId);

      pending.forEach(d => {
        expect(d.hospital_id).toBe(hospChnId);
      });
    });

    it('Admin HYD sees ONLY Doctor HYD and NOT Doctor BLR or Doctor CHN', async () => {
      const res = await request(app)
        .get('/api/admin/pending-doctors')
        .set('Authorization', `Bearer ${adminHydToken}`);

      expect(res.status).toBe(200);
      const pending = res.body.pending_doctors as any[];
      const docIds = pending.map(d => d.doctor_profile_id);

      expect(docIds).toContain(docHydProfileId);
      expect(docIds).not.toContain(docBlrProfileId);
      expect(docIds).not.toContain(docChnProfileId);
    });

    it('Admin BLR attempting to approve Doctor CHN receives 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          doctor_profile_id: docChnProfileId,
          status: 'verified',
          notes: 'Unauthorized approval attempt across hospitals'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/authorized to approve or reject doctors registered for your assigned hospital/i);

      // Verify status in DB remains pending
      const checkDoc = db.prepare('SELECT verification_status FROM doctor_profiles WHERE id = ?').get(docChnProfileId) as any;
      expect(checkDoc.verification_status).toBe('pending');
    });

    it('Admin BLR attempting to reject Doctor HYD receives 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          doctor_profile_id: docHydProfileId,
          status: 'rejected',
          notes: 'Unauthorized cross-hospital rejection attempt',
          rejection_reason: 'Testing cross hospital blocking'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/authorized to approve or reject/i);

      const checkDoc = db.prepare('SELECT verification_status FROM doctor_profiles WHERE id = ?').get(docHydProfileId) as any;
      expect(checkDoc.verification_status).toBe('pending');
    });

    it('Admin CHN attempting to approve Doctor BLR receives 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminChnToken}`)
        .send({
          doctor_profile_id: docBlrProfileId,
          status: 'verified',
          notes: 'Illegal approval'
        });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // REQUIREMENT 3 & 7: LEGITIMATE APPROVAL & REJECTION (WITH AUDIT & REASON)
  // =========================================================================
  describe('Doctor Approval, Rejection, and Audit Trail', () => {
    it('Admin BLR approves Doctor BLR successfully', async () => {
      const res = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminBlrToken}`)
        .send({
          doctor_profile_id: docBlrProfileId,
          status: 'approved',
          notes: 'Credentials and KMC registry successfully authenticated.',
          room_number: 'Chamber 205',
          floor: '2nd Floor',
          wing: 'Block B - Cardiac Wing'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');

      const checkDoc = db.prepare('SELECT verification_status, approved_by, approved_at, room_number FROM doctor_profiles WHERE id = ?').get(docBlrProfileId) as any;
      expect(checkDoc.verification_status).toBe('approved');
      expect(checkDoc.approved_by).toBeDefined();
      expect(checkDoc.approved_at).toBeDefined();
      expect(checkDoc.room_number).toBe('Chamber 205');
    });

    it('Admin CHN rejects Doctor CHN with official rejection reason', async () => {
      const rejectionReason = 'Medical registration number could not be validated against Tamil Nadu Medical Council online database. Please re-apply with original certificate.';
      const res = await request(app)
        .post('/api/admin/verify-doctor')
        .set('Authorization', `Bearer ${adminChnToken}`)
        .send({
          doctor_profile_id: docChnProfileId,
          status: 'rejected',
          notes: 'Application declined after audit check.',
          rejection_reason: rejectionReason
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('rejected');
      expect(res.body.rejection_reason).toBe(rejectionReason);

      const checkDoc = db.prepare('SELECT verification_status, rejection_reason, rejected_by, rejected_at FROM doctor_profiles WHERE id = ?').get(docChnProfileId) as any;
      expect(checkDoc.verification_status).toBe('rejected');
      expect(checkDoc.rejection_reason).toBe(rejectionReason);
      expect(checkDoc.rejected_by).toBeDefined();
      expect(checkDoc.rejected_at).toBeDefined();
    });

    it('Admin BLR can view Doctor BLR approval history but receives 403 on Doctor CHN history', async () => {
      // 1. Own doctor history -> 200 OK
      const ownRes = await request(app)
        .get(`/api/admin/doctor/${docBlrProfileId}/history`)
        .set('Authorization', `Bearer ${adminBlrToken}`);
      expect(ownRes.status).toBe(200);
      expect(Array.isArray(ownRes.body.history)).toBe(true);
      expect(ownRes.body.history.length).toBeGreaterThan(0);

      // 2. Cross-hospital doctor history -> 403 Forbidden
      const crossRes = await request(app)
        .get(`/api/admin/doctor/${docChnProfileId}/history`)
        .set('Authorization', `Bearer ${adminBlrToken}`);
      expect(crossRes.status).toBe(403);
    });
  });

  // =========================================================================
  // REQUIREMENT 8: DOCTOR LOGIN ACCESS GATES
  // =========================================================================
  describe('Doctor Login Access Gates', () => {
    it('Approved doctor receives full access to the doctor dashboard', async () => {
      // Login as Doctor BLR (Approved)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: docBlrEmail, password: 'Doctor@12345' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.verification_status).toBe('approved');

      const docToken = loginRes.body.token;

      // Access doctor schedule/dashboard API
      const schedRes = await request(app)
        .get('/api/doctors/me/schedule')
        .set('Authorization', `Bearer ${docToken}`);

      expect(schedRes.status).toBe(200);
      expect(schedRes.body.is_approved).toBe(true);
      expect(schedRes.body.verification_status).toBe('approved');
      expect(schedRes.body.hospital_name).toMatch(/CareSphere Super Specialty/i);
    });

    it('Rejected doctor receives rejection status and the exact rejection reason', async () => {
      // Login as Doctor CHN (Rejected)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: docChnEmail, password: 'Doctor@12345' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.verification_status).toBe('rejected');
      expect(loginRes.body.user.rejection_reason).toMatch(/Tamil Nadu Medical Council/i);

      const docToken = loginRes.body.token;

      // Access schedule API: must return is_approved: false and empty appointments
      const schedRes = await request(app)
        .get('/api/doctors/me/schedule')
        .set('Authorization', `Bearer ${docToken}`);

      expect(schedRes.status).toBe(200);
      expect(schedRes.body.is_approved).toBe(false);
      expect(schedRes.body.verification_status).toBe('rejected');
      expect(schedRes.body.rejection_reason).toMatch(/Tamil Nadu Medical Council/i);
      expect(schedRes.body.appointments).toEqual([]);
    });

    it('Pending doctor receives pending status without clinical appointments', async () => {
      // Login as Doctor HYD (Pending)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: docHydEmail, password: 'Doctor@12345' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.verification_status).toBe('pending');

      const docToken = loginRes.body.token;

      const schedRes = await request(app)
        .get('/api/doctors/me/schedule')
        .set('Authorization', `Bearer ${docToken}`);

      expect(schedRes.status).toBe(200);
      expect(schedRes.body.is_approved).toBe(false);
      expect(schedRes.body.verification_status).toBe('pending');
      expect(schedRes.body.appointments).toEqual([]);
    });
  });

  // =========================================================================
  // REQUIREMENT 5: INDEPENDENT HOSPITAL ADMIN DASHBOARD STATISTICS
  // =========================================================================
  describe('Independent Hospital Admin Dashboard Statistics', () => {
    it('Admin BLR stats are strictly filtered by Hospital 1', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminBlrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.is_hospital_scoped).toBe(true);
      expect(res.body.stats.hospital.id).toBe(hospBlrId);
      expect(res.body.stats.approved_doctors).toBeGreaterThanOrEqual(1);
    });

    it('Admin CHN stats are strictly filtered by Hospital 2', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminChnToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.is_hospital_scoped).toBe(true);
      expect(res.body.stats.hospital.id).toBe(hospChnId);
      expect(res.body.stats.rejected_doctors).toBeGreaterThanOrEqual(1);
    });
  });
});
