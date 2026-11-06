import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db/database.js';

describe('CareSphere Three Major Features Integration Tests', () => {
  let patientToken = '';
  let doctorToken = '';
  let adminToken = '';
  let pharmacyToken = '';
  let labToken = '';
  let patientId = 0;
  let testPrescriptionId = 0;
  let testLabBookingId = 0;
  let testPharmacyOrderId = 0;

  beforeAll(async () => {
    // 1. Login as patient Ravi Kumar
    const patRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ravi.kumar@example.com', password: 'Patient@12345' });
    expect(patRes.status).toBe(200);
    patientToken = patRes.body.token;
    patientId = patRes.body.user.id;

    // 2. Login as Doctor Dr. Rajesh Sharma
    const docRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.sharma@caresphere.health', password: 'Doctor@12345' });
    expect(docRes.status).toBe(200);
    doctorToken = docRes.body.token;

    // 3. Login as Admin
    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@caresphere.health', password: 'Admin@12345' });
    expect(admRes.status).toBe(200);
    adminToken = admRes.body.token;

    // 4. Login as Pharmacy Staff
    const pharmRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'blr.pharmacy@caresphere.health', password: 'Staff@12345' });
    expect(pharmRes.status).toBe(200);
    pharmacyToken = pharmRes.body.token;

    // 5. Login as Lab Staff
    const labRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'blr.lab@caresphere.health', password: 'Staff@12345' });
    expect(labRes.status).toBe(200);
    labToken = labRes.body.token;
  });

  // ==========================================================================
  // FEATURE 1: EMERGENCY SOS & CONTACT SYSTEM
  // ==========================================================================
  describe('FEATURE 1: Emergency SOS & Emergency Contacts', () => {
    it('should return official national emergency numbers and hospital hotlines', async () => {
      const res = await request(app).get('/api/emergency/hotlines');
      expect(res.status).toBe(200);
      expect(res.body.official_hotlines).toBeInstanceOf(Array);
      expect(res.body.official_hotlines.some((h: any) => h.number === '108')).toBe(true);
      expect(res.body.official_hotlines.some((h: any) => h.number === '112')).toBe(true);
      expect(res.body.hospital_hotlines.length).toBeGreaterThan(0);
    });

    it('should find nearby emergency hospitals using GPS coordinates (Haversine distance)', async () => {
      // Coordinates near Bengaluru Bellandur Campus
      const res = await request(app).get('/api/emergency/nearby-hospitals?lat=12.9352&lng=77.6245');
      expect(res.status).toBe(200);
      expect(res.body.hospitals).toBeInstanceOf(Array);
      expect(res.body.hospitals[0].distance_km).toBeLessThan(10); // Less than 10km away
    });

    it('should allow patient to manage personal emergency contacts (CRUD)', async () => {
      // Create
      const addRes = await request(app)
        .post('/api/emergency/contacts')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: 'Pooja Kumar',
          relationship: 'Sister',
          phone: '+91-9876543219',
          is_primary: 0
        });
      expect(addRes.status).toBe(201);
      const contactId = addRes.body.contact.id;

      // Read
      const listRes = await request(app)
        .get('/api/emergency/contacts')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.contacts.some((c: any) => c.name === 'Pooja Kumar')).toBe(true);

      // Update
      const updateRes = await request(app)
        .put(`/api/emergency/contacts/${contactId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ phone: '+91-9876543220' });
      expect(updateRes.status).toBe(200);

      // Delete
      const delRes = await request(app)
        .delete(`/api/emergency/contacts/${contactId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(delRes.status).toBe(200);
    });

    it('should submit an emergency SOS request with triage RED and track status', async () => {
      const sosRes = await request(app)
        .post('/api/emergency/request')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patient_name: 'Ravi Kumar',
          contact_phone: '+91-9876543210',
          hospital_id: 1,
          emergency_type: 'cardiac',
          triage_level: 'RED',
          latitude: 12.9279,
          longitude: 77.6271,
          address: 'Bellandur Main Road, Bengaluru',
          notes: 'Sudden chest heaviness and sweating'
        });
      expect(sosRes.status).toBe(201);
      expect(sosRes.body.emergency_request.reference_no).toMatch(/^SOS-/);
      expect(sosRes.body.emergency_request.status).toBe('received');
      const sosId = sosRes.body.emergency_request.id;

      // Hospital Admin updates status to assistance_arranged
      const statusRes = await request(app)
        .put(`/api/emergency/requests/${sosId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'assistance_arranged',
          dispatched_service: 'Ambulance Unit 4 (Paramedic Team A dispatched)',
          resolution_notes: 'ETA 8 minutes'
        });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.request.status).toBe('assistance_arranged');
    });
  });

  // ==========================================================================
  // FEATURE 2: DIGITAL PRESCRIPTION & LAB WORKFLOW
  // ==========================================================================
  describe('FEATURE 2: Digital Prescriptions & Laboratory System', () => {
    it('should allow verified doctor to create and finalize a prescription with medicines and lab tests', async () => {
      const rxRes = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patientId,
          diagnosis: 'Mild Sinus Bradycardia & Mild Dyspepsia',
          vitals_summary: 'BP: 126/82 mmHg, HR: 58 bpm',
          advice: 'Drink plenty of water. Monitor resting pulse rate. Avoid heavy evening meals.',
          followup_date: '2026-11-20',
          medicines: [
            {
              medicine_name: 'Pan 40 (Pantoprazole)',
              dosage: '40 mg',
              frequency: '1-0-0',
              timing: 'before_food',
              duration: '14 Days',
              instructions: 'Take 30 mins before breakfast'
            },
            {
              medicine_name: 'Paracetamol 650mg',
              dosage: '650 mg',
              frequency: 'SOS (as needed)',
              timing: 'after_food',
              duration: '3 Days',
              instructions: 'Take only if fever or body ache exceeds 100 F'
            }
          ],
          lab_recommendations: [
            {
              test_name: '12-Lead Resting Digital ECG',
              test_code: 'ECG-011',
              instructions: 'Repeat rhythm strip to confirm sinus node stability',
              urgency: 'routine'
            }
          ]
        });

      expect(rxRes.status).toBe(201);
      expect(rxRes.body.prescription_number).toMatch(/^RX-/);
      testPrescriptionId = rxRes.body.prescription_id;
    });

    it('should allow patient to retrieve their prescription details and certified PDF', async () => {
      const getRes = await request(app)
        .get(`/api/prescriptions/${testPrescriptionId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.prescription.medicines.length).toBe(2);
      expect(getRes.body.prescription.lab_recommendations.length).toBe(1);

      // Download PDF
      const pdfRes = await request(app)
        .get(`/api/prescriptions/${testPrescriptionId}/download`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
    });

    it('should retrieve hospital-linked lab tests and doctor-recommended tests', async () => {
      const catRes = await request(app).get('/api/lab/catalogue?hospital_id=1');
      expect(catRes.status).toBe(200);
      expect(catRes.body.tests.length).toBeGreaterThanOrEqual(12);

      const recRes = await request(app)
        .get('/api/lab/recommended')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(recRes.status).toBe(200);
      expect(recRes.body.recommendations.length).toBeGreaterThan(0);
    });

    it('should book a lab test and allow lab staff to upload report with AUTOMATIC MEDICAL RECORD VAULT INGESTION', async () => {
      // Find ECG test
      const ecgTest = db.prepare('SELECT id FROM lab_tests WHERE test_code = ?').get('ECG-011') as any;

      const bookRes = await request(app)
        .post('/api/lab/book')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          hospital_id: 1,
          test_id: ecgTest.id,
          prescription_id: testPrescriptionId,
          booking_date: '2026-11-09',
          booking_time: '10:00 AM',
          notes: 'Routine follow-up ECG'
        });
      expect(bookRes.status).toBe(201);
      expect(bookRes.body.booking.booking_reference).toMatch(/^LAB-/);
      testLabBookingId = bookRes.body.booking.id;

      // Lab staff updates status to sample_collected
      const statusRes = await request(app)
        .put(`/api/lab/bookings/${testLabBookingId}/status`)
        .set('Authorization', `Bearer ${labToken}`)
        .send({ status: 'sample_collected' });
      expect(statusRes.status).toBe(200);

      // Lab staff uploads completed report
      const uploadRes = await request(app)
        .post(`/api/lab/bookings/${testLabBookingId}/upload-report`)
        .set('Authorization', `Bearer ${labToken}`)
        .send({});
      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.medical_record_id).toBeDefined();

      // VERIFY AUTOMATIC INGESTION IN PATIENT MEDICAL RECORDS VAULT
      const mrCheck = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(uploadRes.body.medical_record_id) as any;
      expect(mrCheck).toBeDefined();
      expect(mrCheck.patient_id).toBe(patientId);
      expect(mrCheck.document_type).toBe('lab_report');
      expect(mrCheck.title).toContain('12-Lead Resting Digital ECG');
    });
  });

  // ==========================================================================
  // FEATURE 3: ONLINE PHARMACY & MEDICINE ORDERS
  // ==========================================================================
  describe('FEATURE 3: Online Pharmacy & Medicine Orders', () => {
    it('should fetch patient hospital-linked pharmacy and 25+ real medicines catalogue', async () => {
      const pharmRes = await request(app)
        .get('/api/pharmacy/hospital-pharmacy?hospital_id=1')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(pharmRes.status).toBe(200);
      expect(pharmRes.body.pharmacy.name).toContain('CareSphere');

      const medsRes = await request(app)
        .get(`/api/pharmacy/medicines?pharmacy_id=${pharmRes.body.pharmacy.id}`);
      expect(medsRes.status).toBe(200);
      expect(medsRes.body.medicines.length).toBeGreaterThanOrEqual(25);
    });

    it('should check prescription medicine availability for 1-click cart addition', async () => {
      const availRes = await request(app)
        .get(`/api/pharmacy/prescription-availability/${testPrescriptionId}?pharmacy_id=1`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(availRes.status).toBe(200);
      expect(availRes.body.medicines.length).toBe(2);
      expect(availRes.body.medicines[0].in_stock).toBe(true);
    });

    it('should place a pharmacy order with Express Counter Pickup, update stock, and allow staff fulfillment', async () => {
      const med1 = db.prepare('SELECT id FROM medicines WHERE name LIKE ? LIMIT 1').get('%Pantoprazole%') as any;

      const orderRes = await request(app)
        .post('/api/pharmacy/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          pharmacy_id: 1,
          hospital_id: 1,
          prescription_id: testPrescriptionId,
          fulfillment_type: 'hospital_pickup',
          contact_phone: '+91-9876543210',
          payment_method: 'online_upi',
          items: [
            {
              medicine_id: med1.id,
              medicine_name: 'Pan 40 (Pantoprazole 40mg)',
              strength: '40 mg',
              dosage_form: 'Tablet',
              quantity: 2,
              unit_price: med1.selling_price || 135.0
            }
          ]
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.order_number).toMatch(/^RXO-/);
      expect(orderRes.body.order.pickup_code).toMatch(/^PK-/);
      testPharmacyOrderId = orderRes.body.order.id;

      // Pharmacy staff updates status to preparing and ready_for_pickup
      const updateRes = await request(app)
        .put(`/api/pharmacy/orders/${testPharmacyOrderId}/status`)
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({
          status: 'ready_for_pickup',
          prescription_verified: 1,
          verification_notes: 'Prescription verified against Dr. Rajesh Sharma records.'
        });
      expect(updateRes.status).toBe(200);

      // Pharmacy staff views inventory & sales summary
      const salesRes = await request(app)
        .get('/api/pharmacy/sales-report?pharmacy_id=1')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(salesRes.status).toBe(200);
      expect(salesRes.body.sales_report.total_orders).toBeGreaterThan(0);
    });

    it('should list all available pharmacies including hospital counters and partner retail stores', async () => {
      const res = await request(app).get('/api/pharmacy/list');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pharmacies.length).toBeGreaterThanOrEqual(3);
      const names = res.body.pharmacies.map((p: any) => p.name);
      expect(names.some((n: string) => n.includes('CareSphere'))).toBe(true);
    });

    it('should allow pharmacy staff or admin to add a specific medicine and allow patient to order it', async () => {
      // 1. Add specific medicine
      const addRes = await request(app)
        .post('/api/pharmacy/medicines')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({
          name: 'Amoxicillin 250mg Capsule',
          brand_name: 'Mox 250',
          generic_name: 'Amoxicillin Trihydrate',
          strength: '250 mg',
          dosage_form: 'Capsule',
          manufacturer: 'Sun Pharmaceutical Industries',
          category: 'Antibiotics',
          prescription_required: 1,
          mrp_price: 90.0,
          selling_price: 72.0,
          stock_quantity: 120,
          low_stock_threshold: 20
        });

      expect(addRes.status).toBe(201);
      expect(addRes.body.success).toBe(true);
      expect(addRes.body.medicine.brand_name).toBe('Mox 250');
      const newMedId = addRes.body.medicine.id;

      // 2. Query medicine in store
      const searchRes = await request(app).get('/api/pharmacy/medicines?search=Mox');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.medicines.some((m: any) => m.id === newMedId)).toBe(true);

      // 3. Patient orders this specific medicine
      const orderRes = await request(app)
        .post('/api/pharmacy/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          pharmacy_id: 1,
          fulfillment_type: 'home_delivery',
          delivery_address: '42, 5th Cross, HSR Layout, Bengaluru 560102',
          contact_phone: '+91-9876543210',
          payment_method: 'online_card',
          items: [
            {
              medicine_id: newMedId,
              medicine_name: 'Mox 250 (Amoxicillin 250mg)',
              strength: '250 mg',
              dosage_form: 'Capsule',
              quantity: 3,
              unit_price: 72.0
            }
          ]
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.order_number).toMatch(/^RXO-/);
      expect(orderRes.body.order.fulfillment_type).toBe('home_delivery');
    });
  });
});
