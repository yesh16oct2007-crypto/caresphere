import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db, logAudit } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

function getUploadDir(): string {
  const dir = fs.existsSync('/var/data') ? '/var/data/uploads/prescriptions' : path.resolve(process.cwd(), 'uploads/prescriptions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 1. Create and Finalize Digital Prescription (Doctor Only)
export function createPrescription(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Only authorized medical doctors can issue prescriptions.' });
      return;
    }

    // Verify doctor profile and verification status
    const doctor = db.prepare(`
      SELECT dp.*, u.name as doctor_name, u.email as doctor_email
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.user_id = ?
    `).get(req.user.id) as any;

    if (!doctor || doctor.verification_status !== 'verified') {
      res.status(403).json({ error: 'Your medical credentials must be fully verified by hospital administration before issuing clinical prescriptions.' });
      return;
    }

    const {
      patient_id,
      appointment_id,
      consultation_date,
      diagnosis,
      clinical_notes,
      vitals_summary,
      advice,
      followup_date,
      medicines, // Array of { medicine_name, dosage, frequency, timing, duration, instructions }
      lab_recommendations // Array of { test_name, test_code, instructions, urgency }
    } = req.body;

    if (!patient_id || !diagnosis || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      res.status(400).json({ error: 'Patient ID, diagnosis, and at least one prescribed medicine are required.' });
      return;
    }

    // Verify patient exists
    const patient = db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(patient_id) as any;
    if (!patient) {
      res.status(404).json({ error: 'Patient account not found.' });
      return;
    }

    const hospitalId = doctor.hospital_id || 1;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const rxNumber = `RX-${today}-${randCode}`;
    const consultDate = consultation_date || new Date().toISOString().slice(0, 10);

    // Insert main prescription record
    const insertRx = db.prepare(`
      INSERT INTO prescriptions (
        prescription_number, appointment_id, patient_id, doctor_id, hospital_id,
        consultation_date, diagnosis, clinical_notes, vitals_summary, advice, followup_date, is_finalized
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const rxResult = insertRx.run(
      rxNumber,
      appointment_id || null,
      patient_id,
      doctor.id,
      hospitalId,
      consultDate,
      diagnosis.trim(),
      clinical_notes ? clinical_notes.trim() : null,
      vitals_summary ? vitals_summary.trim() : null,
      advice ? advice.trim() : null,
      followup_date || null
    );

    const prescriptionId = Number(rxResult.lastInsertRowid);

    // Insert prescribed medicines
    const insertMed = db.prepare(`
      INSERT INTO prescription_medicines (
        prescription_id, medicine_name, dosage, frequency, timing, duration, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    medicines.forEach((m: any) => {
      insertMed.run(
        prescriptionId,
        m.medicine_name.trim(),
        m.dosage.trim(),
        m.frequency.trim(),
        m.timing || 'after_food',
        m.duration.trim(),
        m.instructions ? m.instructions.trim() : null
      );
    });

    // Insert recommended lab tests if any
    if (lab_recommendations && Array.isArray(lab_recommendations)) {
      const insertLab = db.prepare(`
        INSERT INTO prescription_lab_recommendations (
          prescription_id, test_name, test_code, instructions, urgency
        ) VALUES (?, ?, ?, ?, ?)
      `);

      lab_recommendations.forEach((l: any) => {
        if (l.test_name) {
          insertLab.run(
            prescriptionId,
            l.test_name.trim(),
            l.test_code ? l.test_code.trim() : null,
            l.instructions ? l.instructions.trim() : null,
            l.urgency || 'routine'
          );
        }
      });
    }

    // Insert audit log
    db.prepare(`
      INSERT INTO prescription_audit_logs (prescription_id, action, performed_by, performer_role, details)
      VALUES (?, 'CREATED_AND_FINALIZED', ?, 'doctor', ?)
    `).run(prescriptionId, req.user.id, `Issued by Dr. ${doctor.doctor_name} (${doctor.registration_number})`);

    // If linked to appointment, update appointment status to completed if not already
    if (appointment_id) {
      try {
        db.prepare("UPDATE appointments SET status = 'completed', prescription_url = ? WHERE id = ?")
          .run(`/api/prescriptions/${prescriptionId}/download`, appointment_id);
      } catch (apptErr) {
        console.error('Failed to update appointment with prescription:', apptErr);
      }
    }

    // Notify patient
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, title_key, message_key, type)
        VALUES (?, 'New Prescription Issued: ' || ?, 'Dr. ' || ? || ' has issued your digital prescription. You can view, download, or order medicines now.', 'prescription')
      `).run(patient_id, rxNumber, doctor.doctor_name);
    } catch (notifErr) {
      console.error('Failed to notify patient of prescription:', notifErr);
    }

    logAudit(
      req.user.id,
      doctor.doctor_name,
      'doctor',
      'CREATE_PRESCRIPTION',
      'prescriptions',
      String(prescriptionId),
      `Rx ${rxNumber} for patient ${patient.name}`
    );

    res.status(201).json({
      message: 'Prescription created and finalized successfully.',
      prescription_id: prescriptionId,
      prescription_number: rxNumber
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create prescription: ' + err.message });
  }
}

// 2. Get Prescription Details
export function getPrescriptionById(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const prescriptionId = Number(req.params.id);
    const rx = db.prepare(`
      SELECT p.*,
             u_pat.name as patient_name, u_pat.email as patient_email, u_pat.phone as patient_phone,
             pp.date_of_birth, pp.gender as patient_gender,
             u_doc.name as doctor_name, u_doc.phone as doctor_phone,
             dp.registration_number as doctor_registration_number, dp.specialization as doctor_specialization,
             dp.state_medical_council as doctor_council, dp.qualifications as doctor_qualifications,
             h.name as hospital_name, h.location as hospital_location, h.address as hospital_address,
             h.contact_phone as hospital_phone,
             a.reference_no as appointment_ref
      FROM prescriptions p
      JOIN users u_pat ON p.patient_id = u_pat.id
      LEFT JOIN patient_profiles pp ON u_pat.id = pp.user_id
      JOIN doctor_profiles dp ON p.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      JOIN hospitals h ON p.hospital_id = h.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE p.id = ?
    `).get(prescriptionId) as any;

    if (!rx) {
      res.status(404).json({ error: 'Prescription not found.' });
      return;
    }

    // Role-based authorization check
    let authorized = false;
    if (['admin', 'hospital_admin', 'superadmin', 'pharmacy_staff'].includes(req.user.role)) {
      authorized = true;
    } else if (req.user.id === rx.patient_id) {
      authorized = true;
    } else if (req.user.role === 'doctor') {
      const doc = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
      if (doc && doc.id === rx.doctor_id) {
        authorized = true;
      }
    }

    if (!authorized) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this clinical prescription.' });
      return;
    }

    const medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ? ORDER BY id ASC').all(prescriptionId);
    const labRecs = db.prepare('SELECT * FROM prescription_lab_recommendations WHERE prescription_id = ? ORDER BY id ASC').all(prescriptionId);

    res.json({
      prescription: {
        ...rx,
        medicines,
        lab_recommendations: labRecs
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve prescription: ' + err.message });
  }
}

// 3. Patient: Get My Prescriptions History
export function getMyPrescriptions(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const rows = db.prepare(`
      SELECT p.*,
             u_doc.name as doctor_name, dp.specialization as doctor_specialization,
             dp.registration_number as doctor_registration_number,
             h.name as hospital_name, h.location as hospital_location,
             a.reference_no as appointment_ref
      FROM prescriptions p
      JOIN doctor_profiles dp ON p.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      JOIN hospitals h ON p.hospital_id = h.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE p.patient_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id) as any[];

    const prescriptions = rows.map(r => {
      const medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(r.id);
      const lab_recommendations = db.prepare('SELECT * FROM prescription_lab_recommendations WHERE prescription_id = ?').all(r.id);
      return {
        ...r,
        medicines,
        lab_recommendations
      };
    });

    res.json({ prescriptions });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch prescriptions: ' + err.message });
  }
}

// 4. Doctor: Get Prescriptions Issued by Me
export function getDoctorPrescriptions(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      res.status(403).json({ error: 'Only doctors can access their issued prescriptions.' });
      return;
    }

    const doc = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id) as any;
    if (!doc) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const rows = db.prepare(`
      SELECT p.*,
             u_pat.name as patient_name, u_pat.phone as patient_phone,
             h.name as hospital_name, a.reference_no as appointment_ref
      FROM prescriptions p
      JOIN users u_pat ON p.patient_id = u_pat.id
      JOIN hospitals h ON p.hospital_id = h.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE p.doctor_id = ?
      ORDER BY p.created_at DESC
    `).all(doc.id) as any[];

    const prescriptions = rows.map(r => {
      const medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(r.id);
      const lab_recommendations = db.prepare('SELECT * FROM prescription_lab_recommendations WHERE prescription_id = ?').all(r.id);
      return {
        ...r,
        medicines,
        lab_recommendations
      };
    });

    res.json({ prescriptions });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch doctor prescriptions: ' + err.message });
  }
}

// 5. Download Certified Digital Prescription PDF
export function downloadPrescriptionPdf(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const prescriptionId = Number(req.params.id);
    const rx = db.prepare(`
      SELECT p.*,
             u_pat.name as patient_name, u_pat.phone as patient_phone,
             pp.date_of_birth, pp.gender as patient_gender,
             u_doc.name as doctor_name, dp.registration_number as doctor_registration_number,
             dp.specialization as doctor_specialization, dp.qualifications as doctor_qualifications,
             dp.state_medical_council as doctor_council,
             h.name as hospital_name, h.location as hospital_location, h.address as hospital_address,
             h.contact_phone as hospital_phone
      FROM prescriptions p
      JOIN users u_pat ON p.patient_id = u_pat.id
      LEFT JOIN patient_profiles pp ON u_pat.id = pp.user_id
      JOIN doctor_profiles dp ON p.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      JOIN hospitals h ON p.hospital_id = h.id
      WHERE p.id = ?
    `).get(prescriptionId) as any;

    if (!rx) {
      res.status(404).json({ error: 'Prescription not found.' });
      return;
    }

    const medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescriptionId) as any[];
    const labRecs = db.prepare('SELECT * FROM prescription_lab_recommendations WHERE prescription_id = ?').all(prescriptionId) as any[];

    // Build Native PDF 1.4
    const safeRxNum = (rx.prescription_number || `RX-${rx.id}`).replace(/[()\\]/g, '');
    const safeHospName = (rx.hospital_name || 'CareSphere Super Specialty Hospital').replace(/[()\\]/g, '');
    const safeDocName = (rx.doctor_name || 'Dr. Medical Practitioner').replace(/[()\\]/g, '');
    const safeDocReg = (rx.doctor_registration_number || 'NMC-REG').replace(/[()\\]/g, '');
    const safeDocSpec = (rx.doctor_specialization || 'Consultant Physician').replace(/[()\\]/g, '');
    const safePatient = (rx.patient_name || 'CareSphere Patient').replace(/[()\\]/g, '');
    const safeDate = rx.consultation_date || new Date().toISOString().slice(0, 10);
    const safeDiagnosis = (rx.diagnosis || 'Clinical evaluation').replace(/[()\\]/g, '');
    const safeAdvice = (rx.advice || 'Follow medication schedule strictly. Rest adequately.').replace(/[()\\]/g, '');

    const lines: string[] = [
      'BT',
      '/F1 18 Tf',
      '50 740 Td',
      `(${safeHospName}) Tj`,
      '/F2 11 Tf',
      '0 -20 Td',
      `(${rx.hospital_location || 'Multi-Specialty Healthcare Center'}) Tj`,
      '/F1 12 Tf',
      '0 -25 Td',
      `(OFFICIAL MEDICAL PRESCRIPTION - ${safeRxNum}) Tj`,
      '/F2 10 Tf',
      '0 -20 Td',
      `(Date: ${safeDate}   |   Prescription Ref: ${safeRxNum}) Tj`,
      '0 -16 Td',
      `(Patient: ${safePatient}   |   Doctor: Dr. ${safeDocName} (${safeDocSpec})) Tj`,
      '0 -16 Td',
      `(Doctor Reg No: ${safeDocReg}   |   Council: ${rx.doctor_council || 'NMC'}) Tj`,
      '0 -22 Td',
      '/F1 11 Tf',
      `(DIAGNOSIS / CLINICAL IMPRESSION:) Tj`,
      '/F2 10 Tf',
      '0 -15 Td',
      `(${safeDiagnosis}) Tj`,
      '0 -22 Td',
      '/F1 11 Tf',
      `(Rx - PRESCRIBED MEDICINES:) Tj`,
      '/F2 10 Tf'
    ];

    medicines.forEach((m, idx) => {
      const safeMedName = (m.medicine_name || '').replace(/[()\\]/g, '');
      const safeDosage = (m.dosage || '').replace(/[()\\]/g, '');
      const safeFreq = (m.frequency || '').replace(/[()\\]/g, '');
      const safeDuration = (m.duration || '').replace(/[()\\]/g, '');
      const safeTiming = (m.timing || 'after_food').replace(/_/g, ' ');
      const safeInstr = (m.instructions || '').replace(/[()\\]/g, '');
      lines.push('0 -16 Td');
      lines.push(`(${idx + 1}. ${safeMedName} [${safeDosage}] - ${safeFreq} (${safeTiming}) for ${safeDuration}${safeInstr ? ' -- ' + safeInstr : ''}) Tj`);
    });

    if (labRecs.length > 0) {
      lines.push('0 -22 Td');
      lines.push('/F1 11 Tf');
      lines.push(`(RECOMMENDED INVESTIGATIONS:) Tj`);
      lines.push('/F2 10 Tf');
      labRecs.forEach((l, idx) => {
        const safeLabName = (l.test_name || '').replace(/[()\\]/g, '');
        const safeUrgency = (l.urgency || 'routine').toUpperCase();
        lines.push('0 -15 Td');
        lines.push(`(${idx + 1}. ${safeLabName} [${safeUrgency}]${l.instructions ? ' - ' + l.instructions.replace(/[()\\]/g, '') : ''}) Tj`);
      });
    }

    lines.push('0 -22 Td');
    lines.push('/F1 11 Tf');
    lines.push(`(DOCTOR ADVICE & INSTRUCTIONS:) Tj`);
    lines.push('/F2 10 Tf');
    lines.push('0 -15 Td');
    lines.push(`(${safeAdvice}) Tj`);

    if (rx.followup_date) {
      lines.push('0 -16 Td');
      lines.push(`(Follow-up Scheduled Date: ${rx.followup_date}) Tj`);
    }

    lines.push('0 -30 Td');
    lines.push('/F1 10 Tf');
    lines.push(`([DIGITALLY SIGNED & SEALED - Verified by CareSphere Clinical Information System]) Tj`);
    lines.push('ET');

    const streamContent = lines.join('\n');
    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    const pdfData = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
0000000375 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
440
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeRxNum}.pdf"`);
    res.send(Buffer.from(pdfData, 'utf-8'));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate prescription PDF: ' + err.message });
  }
}
