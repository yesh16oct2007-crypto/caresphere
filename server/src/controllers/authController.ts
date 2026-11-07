import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, logAudit } from '../db/database.js';
import { JWT_SECRET, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createNotification } from '../services/notificationService.js';

export function registerPatient(req: Request, res: Response): void {
  try {
    const { name, email, phone, password, preferred_language = 'en', date_of_birth, gender, blood_group, address, consent } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (!consent) {
      res.status(400).json({ error: 'Consent to privacy policy and terms is required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const insertTransaction = db.transaction(() => {
      const userStmt = db.prepare(`
        INSERT INTO users (name, email, phone, password_hash, role, preferred_language)
        VALUES (?, ?, ?, ?, 'patient', ?)
      `);
      const userResult = userStmt.run(name, email, phone || null, passwordHash, preferred_language);
      const userId = Number(userResult.lastInsertRowid);

      const profileStmt = db.prepare(`
        INSERT INTO patient_profiles (user_id, date_of_birth, gender, blood_group, address)
        VALUES (?, ?, ?, ?, ?)
      `);
      profileStmt.run(userId, date_of_birth || null, gender || null, blood_group || null, address || null);

      return userId;
    });

    const userId = insertTransaction();

    logAudit(userId, name, 'patient', 'REGISTER_PATIENT', 'USERS', String(userId), 'Patient registration completed.', req.ip);

    createNotification(userId, 'notif.welcome_title', 'notif.welcome_msg', { name }, 'success');

    const token = jwt.sign(
      { id: userId, name, email, role: 'patient', preferred_language },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful! Welcome to CareSphere.',
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        role: 'patient',
        preferred_language
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

export function registerDoctor(req: Request, res: Response): void {
  try {
    const {
      name,
      email,
      phone,
      password,
      hospital_name = 'CareSphere Super Specialty Hospital',
      hospital_location = 'Main Campus, Bengaluru',
      registration_number,
      state_medical_council = 'National Medical Commission (NMC)',
      department_id,
      specialization,
      qualifications,
      experience_years = 1,
      consultation_fee = 500,
      bio,
      preferred_language = 'en',
      document_url = null,
      council_certificate_url = null,
      degree_certificate_url = null,
      id_proof_url = null,
      room_number = 'Chamber 101',
      floor = '1st Floor',
      wing = 'Block A - Clinical Wing',
      navigation_instructions = 'Proceed to Block A, take elevator to 1st Floor, follow signs to Consultation Wing.'
    } = req.body;

    if (!name || !email || !password || !registration_number || !specialization || !qualifications || !department_id) {
      res.status(400).json({ 
        error: 'Name, email, password, medical registration number, department, specialization, and qualifications are required.' 
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const existingReg = db.prepare('SELECT id FROM doctor_profiles WHERE registration_number = ?').get(registration_number);
    if (existingReg) {
      res.status(409).json({ error: 'A doctor profile with this medical registration number is already submitted.' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const cleanHospName = (hospital_name || 'CareSphere Super Specialty Hospital').trim();
    const cleanHospLocation = (hospital_location || 'Main Campus, Bengaluru').trim();

    // Check if the hospital already exists (case-insensitive)
    let hospital = db.prepare('SELECT id, name, location, city FROM hospitals WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(cleanHospName) as any;
    let targetHospitalId: number;

    if (hospital) {
      targetHospitalId = hospital.id;
    } else {
      // Automatically register the newly entered hospital
      const locationParts = cleanHospLocation.split(',').map((s: string) => s.trim());
      const cleanCity = locationParts.length > 1 ? locationParts[locationParts.length - 1] : (cleanHospLocation || 'Bengaluru');
      const baseCode = cleanHospName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'HOSP';
      const finalCode = `${baseCode}-${Date.now().toString().slice(-4)}`;

      const insHosp = db.prepare(`
        INSERT INTO hospitals (name, code, location, city, emergency_hotline, total_beds, is_active)
        VALUES (?, ?, ?, ?, '+91-80-CARE-911', 200, 1)
      `);
      const hResult = insHosp.run(cleanHospName, finalCode, cleanHospLocation, cleanCity);
      targetHospitalId = Number(hResult.lastInsertRowid);

      // Auto-create default hospital resources so that resource analytics and gauges work
      const defaultResources = [
        { type: 'general_beds', total: 200, avail: 75, occ: 125 },
        { type: 'icu_beds', total: 30, avail: 10, occ: 20 },
        { type: 'emergency_beds', total: 20, avail: 8, occ: 12 },
        { type: 'ambulance', total: 6, avail: 4, occ: 2 },
        { type: 'blood_bank', total: 100, avail: 80, occ: 20 },
        { type: 'lab_services', total: 1, avail: 1, occ: 0 },
        { type: 'pharmacy', total: 1, avail: 1, occ: 0 },
        { type: 'emergency_dept', total: 1, avail: 1, occ: 0 }
      ];

      const resStmt = db.prepare(`
        INSERT INTO hospital_resources (hospital_id, resource_type, total_capacity, available_count, occupied_count, status)
        VALUES (?, ?, ?, ?, ?, 'available')
      `);
      for (const r of defaultResources) {
        resStmt.run(targetHospitalId, r.type, r.total, r.avail, r.occ);
      }
    }

    const insertDoctorTransaction = db.transaction(() => {
      const userStmt = db.prepare(`
        INSERT INTO users (name, email, phone, password_hash, role, preferred_language, hospital_id)
        VALUES (?, ?, ?, ?, 'doctor', ?, ?)
      `);
      const userResult = userStmt.run(name, email, phone || null, passwordHash, preferred_language, targetHospitalId);
      const userId = Number(userResult.lastInsertRowid);

      const doctorStmt = db.prepare(`
        INSERT INTO doctor_profiles (
          user_id, hospital_id, hospital_name, hospital_location, registration_number, state_medical_council, department_id, specialization, qualifications,
          experience_years, consultation_fee, bio, document_url, council_certificate_url, degree_certificate_url,
          id_proof_url, verification_status, room_number, floor, wing, current_presence_status, navigation_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'in_opd', ?)
      `);
      const docResult = doctorStmt.run(
        userId,
        targetHospitalId,
        cleanHospName,
        cleanHospLocation,
        registration_number,
        state_medical_council,
        department_id,
        specialization,
        qualifications,
        Number(experience_years),
        Number(consultation_fee),
        bio || null,
        document_url || council_certificate_url || null,
        council_certificate_url || null,
        degree_certificate_url || null,
        id_proof_url || null,
        room_number,
        floor,
        wing,
        navigation_instructions
      );

      return { userId, doctorProfileId: Number(docResult.lastInsertRowid) };
    });

    const { userId } = insertDoctorTransaction();

    logAudit(
      userId,
      name,
      'doctor',
      'REGISTER_DOCTOR_SUBMITTED',
      'DOCTOR_PROFILES',
      String(userId),
      `Doctor application submitted. Reg: ${registration_number}. Awaiting admin verification.`,
      req.ip
    );

    // Notify doctor
    createNotification(
      userId,
      'notif.doctor_pending_title',
      'notif.doctor_pending_msg',
      { name },
      'info'
    );

    // Notify admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as { id: number }[];
    admins.forEach(admin => {
      createNotification(
        admin.id,
        'notif.admin_new_doctor_title',
        'notif.admin_new_doctor_msg',
        { doctorName: name, regNumber: registration_number },
        'alert'
      );
    });

    const token = jwt.sign(
      { id: userId, name, email, role: 'doctor', preferred_language },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Doctor application submitted successfully! Your credentials are now under administrative review.',
      token,
      verification_status: 'pending',
      user: {
        id: userId,
        name,
        email,
        phone,
        role: 'doctor',
        preferred_language,
        verification_status: 'pending'
      }
    });
  } catch (err: any) {
    console.error('Doctor registration error:', err);
    res.status(500).json({ error: 'Internal server error during doctor registration.' });
  }
}

export function registerHospitalAdmin(req: Request, res: Response): void {
  try {
    const {
      name,
      email,
      phone,
      password,
      preferred_language = 'en',
      hospital_id,
      new_hospital_name,
      new_hospital_code,
      new_hospital_city,
      new_hospital_location,
      new_hospital_hotline
    } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, official work email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    let targetHospitalId: number | null = hospital_id ? Number(hospital_id) : null;

    // Concurrency-safe atomic transaction
    const insertAdminTransaction = db.transaction(() => {
      // If registering a brand new hospital
      if (!targetHospitalId && new_hospital_name && new_hospital_city) {
        const cleanName = new_hospital_name.trim();
        const cleanCity = new_hospital_city.trim();
        const baseCode = (new_hospital_code || cleanName.replace(/[^A-Za-z]/g, '').slice(0, 4)).toUpperCase();
        const finalCode = `${baseCode}-${Date.now().toString().slice(-4)}`;

        const insHosp = db.prepare(`
          INSERT INTO hospitals (name, code, location, city, emergency_hotline, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `);
        const hResult = insHosp.run(
          cleanName,
          finalCode,
          new_hospital_location?.trim() || `${cleanCity} Main Campus`,
          cleanCity,
          new_hospital_hotline?.trim() || '+91-80-CARE-911'
        );
        targetHospitalId = Number(hResult.lastInsertRowid);

        // Auto-create default hospital resources
        const defaultResources = [
          { type: 'general_beds', total: 200, avail: 80, occ: 120 },
          { type: 'icu_beds', total: 30, avail: 8, occ: 22 },
          { type: 'emergency_beds', total: 20, avail: 6, occ: 14 },
          { type: 'ambulances', total: 6, avail: 4, occ: 2 },
          { type: 'blood_bank', total: 100, avail: 78, occ: 22 },
          { type: 'lab_services', total: 1, avail: 1, occ: 0 },
          { type: 'pharmacy', total: 1, avail: 1, occ: 0 },
          { type: 'emergency_dept', total: 1, avail: 1, occ: 0 }
        ];

        const insertRes = db.prepare(`
          INSERT INTO hospital_resources (hospital_id, resource_type, total_capacity, available_count, occupied_count, status, updated_at)
          VALUES (?, ?, ?, ?, ?, 'available', datetime('now'))
        `);
        defaultResources.forEach(r => insertRes.run(targetHospitalId, r.type, r.total, r.avail, r.occ));
      }

      if (!targetHospitalId) {
        const firstHosp = db.prepare('SELECT id FROM hospitals ORDER BY id ASC LIMIT 1').get() as any;
        targetHospitalId = firstHosp?.id || 1;
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const userStmt = db.prepare(`
        INSERT INTO users (name, email, phone, password_hash, role, preferred_language, hospital_id)
        VALUES (?, ?, ?, ?, 'hospital_admin', ?, ?)
      `);
      const userResult = userStmt.run(
        name.trim(),
        email.trim(),
        phone?.trim() || null,
        passwordHash,
        preferred_language,
        targetHospitalId
      );

      return { userId: Number(userResult.lastInsertRowid), hospitalId: targetHospitalId };
    });

    const { userId, hospitalId } = insertAdminTransaction();

    const hospObj = db.prepare('SELECT id, name, code, location, city FROM hospitals WHERE id = ?').get(hospitalId) as any;

    logAudit(
      userId,
      name,
      'hospital_admin',
      'REGISTER_HOSPITAL_ADMIN',
      'USERS',
      String(userId),
      `Hospital admin registered for hospital: ${hospObj?.name || hospitalId}`,
      req.ip
    );

    const token = jwt.sign(
      { id: userId, name, email, role: 'hospital_admin', preferred_language, hospital_id: hospitalId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Hospital Administrator account registered successfully.',
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        role: 'hospital_admin',
        preferred_language,
        hospital_id: hospitalId,
        hospital: hospObj
      }
    });
  } catch (err: any) {
    console.error('Register hospital admin error:', err);
    res.status(500).json({ error: 'Failed to register hospital administrator: ' + err.message });
  }
}

export function login(req: Request, res: Response): void {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = db.prepare(`
      SELECT id, name, email, phone, password_hash, role, preferred_language, hospital_id
      FROM users WHERE email = ?
    `).get(email) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    let extraDetails: Record<string, any> = {};

    if (user.role === 'doctor') {
      const doc = db.prepare(`
        SELECT id as doctor_id, hospital_id, hospital_name, hospital_location, registration_number, specialization, qualifications,
               experience_years, consultation_fee, teleconsultation_available, teleconsultation_fee, verification_status, department_id
        FROM doctor_profiles WHERE user_id = ?
      `).get(user.id) as any;
      if (doc) {
        extraDetails = { doctor: doc, verification_status: doc.verification_status };
      }
    } else if (user.role === 'patient') {
      const patient = db.prepare(`
        SELECT id as patient_profile_id, date_of_birth, gender, blood_group, address
        FROM patient_profiles WHERE user_id = ?
      `).get(user.id) as any;
      if (patient) {
        extraDetails = { patient };
      }
    } else if ((user.role === 'hospital_admin' || user.role === 'admin') && user.hospital_id) {
      const hosp = db.prepare('SELECT id, name, code, location, city FROM hospitals WHERE id = ?').get(user.hospital_id) as any;
      if (hosp) extraDetails.hospital = hosp;
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, preferred_language: user.preferred_language, hospital_id: user.hospital_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit(user.id, user.name, user.role, 'LOGIN_SUCCESS', 'AUTH', String(user.id), 'Successful user login.', req.ip);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferred_language: user.preferred_language,
        hospital_id: user.hospital_id,
        ...extraDetails
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

export function getCurrentUser(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const user = db.prepare(`
      SELECT id, name, email, phone, role, preferred_language, hospital_id, created_at
      FROM users WHERE id = ?
    `).get(req.user.id) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    let extraDetails: Record<string, any> = {};

    if (user.role === 'doctor') {
      const doc = db.prepare(`
        SELECT dp.*, d.name as department_name
        FROM doctor_profiles dp
        LEFT JOIN departments d ON dp.department_id = d.id
        WHERE dp.user_id = ?
      `).get(user.id) as any;
      extraDetails = { doctor: doc, verification_status: doc?.verification_status };
    } else if (user.role === 'patient') {
      const patient = db.prepare(`
        SELECT * FROM patient_profiles WHERE user_id = ?
      `).get(user.id) as any;
      extraDetails = { patient };
    } else if ((user.role === 'hospital_admin' || user.role === 'admin') && user.hospital_id) {
      const hosp = db.prepare('SELECT id, name, code, location, city, emergency_hotline FROM hospitals WHERE id = ?').get(user.hospital_id) as any;
      if (hosp) extraDetails.hospital = hosp;
    }

    res.json({
      user: {
        ...user,
        ...extraDetails
      }
    });
  } catch (err: any) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export function updateLanguagePreference(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const { preferred_language } = req.body;
    if (!preferred_language) {
      res.status(400).json({ error: 'preferred_language is required.' });
      return;
    }

    db.prepare('UPDATE users SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(preferred_language, req.user.id);

    res.json({
      message: 'Language preference saved successfully.',
      preferred_language
    });
  } catch (err: any) {
    console.error('Language update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export function updateProfile(req: AuthenticatedRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const { name, phone, date_of_birth, gender, blood_group, address, bio, consultation_fee } = req.body;

    if (name || phone) {
      db.prepare(`
        UPDATE users 
        SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name || null, phone || null, req.user.id);
    }

    if (req.user.role === 'patient') {
      db.prepare(`
        UPDATE patient_profiles
        SET date_of_birth = COALESCE(?, date_of_birth),
            gender = COALESCE(?, gender),
            blood_group = COALESCE(?, blood_group),
            address = COALESCE(?, address)
        WHERE user_id = ?
      `).run(date_of_birth || null, gender || null, blood_group || null, address || null, req.user.id);
    } else if (req.user.role === 'doctor') {
      db.prepare(`
        UPDATE doctor_profiles
        SET bio = COALESCE(?, bio),
            consultation_fee = COALESCE(?, consultation_fee)
        WHERE user_id = ?
      `).run(bio || null, consultation_fee ? Number(consultation_fee) : null, req.user.id);
    }

    res.json({ message: 'Profile updated successfully.' });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
