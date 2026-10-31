import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';

export function ensureDatabaseSeeded(): void {
  try {
    initDatabase();
    const row = db.prepare('SELECT count(*) as count FROM users').get() as { count: number } | undefined;
    if (!row || row.count === 0) {
      console.log('CareSphere fresh database detected. Running automatic initial data seed...');
      seedDatabase();
    }
  } catch (err) {
    console.error('Error during automatic database seed check:', err);
  }
}

export function seedDatabase() {
  console.log('Initializing database schema...');
  initDatabase();

  console.log('Seeding demo data for CareSphere...');

  // 1. Hospital Departments
  const departments = [
    {
      name: 'Cardiology',
      code: 'CARD',
      description: 'Comprehensive cardiac care, interventional cardiology, heart rhythm management, and cardiovascular rehabilitation.',
      icon: 'HeartPulse',
      head_of_department: 'Dr. Rajesh Sharma',
      phone_extension: '101',
      floor: '3rd Floor, Block A'
    },
    {
      name: 'Neurology & Neurosurgery',
      code: 'NEUR',
      description: 'Advanced diagnosis and microsurgical management for brain, spine, stroke, and nervous system disorders.',
      icon: 'Brain',
      head_of_department: 'Dr. Vikramaditya Ghosh',
      phone_extension: '102',
      floor: '4th Floor, Block B'
    },
    {
      name: 'Orthopedics & Joint Replacement',
      code: 'ORTH',
      description: 'Total joint replacements, sports injuries, trauma reconstruction, and arthroscopic procedures.',
      icon: 'Bone',
      head_of_department: 'Dr. Priya Sundaram',
      phone_extension: '103',
      floor: '2nd Floor, Block A'
    },
    {
      name: 'Pediatrics & Neonatology',
      code: 'PED',
      description: 'Dedicated child healthcare, neonatal intensive care (NICU), immunizations, and developmental care.',
      icon: 'Baby',
      head_of_department: 'Dr. Arjun Reddy',
      phone_extension: '104',
      floor: '1st Floor, Block C'
    },
    {
      name: 'General & Internal Medicine',
      code: 'GEN',
      description: 'Primary care, chronic lifestyle disease management, diabetes control, and infectious disease treatment.',
      icon: 'Stethoscope',
      head_of_department: 'Dr. Fatima Khan',
      phone_extension: '105',
      floor: 'Ground Floor, Block A'
    },
    {
      name: 'Dermatology & Cosmetology',
      code: 'DERM',
      description: 'Medical dermatology, skin allergies, laser therapies, and advanced cosmetic dermatological care.',
      icon: 'Sparkles',
      head_of_department: 'Dr. Sunita Deshmukh',
      phone_extension: '106',
      floor: '2nd Floor, Block B'
    }
  ];

  const insertDept = db.prepare(`
    INSERT OR IGNORE INTO departments (name, code, description, icon, head_of_department, phone_extension, floor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  departments.forEach(d => {
    insertDept.run(d.name, d.code, d.description, d.icon, d.head_of_department, d.phone_extension, d.floor);
  });

  // Fetch department IDs
  const deptRows: Record<string, number> = {};
  const allDepts = db.prepare('SELECT id, code FROM departments').all() as { id: number; code: string }[];
  allDepts.forEach(d => { deptRows[d.code] = d.id; });

  // 2. Users and Passwords
  const adminPassword = bcrypt.hashSync('Admin@12345', 10);
  const doctorPassword = bcrypt.hashSync('Doctor@12345', 10);
  const patientPassword = bcrypt.hashSync('Patient@12345', 10);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Insert Admin
  insertUser.run('Administrator CareSphere', 'admin@caresphere.health', '+91-9876543200', adminPassword, 'admin', 'en');
  const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@caresphere.health') as { id: number };

  // Insert Doctors
  const doctorUsers = [
    {
      name: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@caresphere.health',
      phone: '+91-9876543201',
      lang: 'hi',
      hospital_name: 'CareSphere Super Specialty Hospital',
      hospital_location: 'Central Campus, Bengaluru',
      reg: 'MCI-2011-84920',
      council: 'National Medical Commission (NMC)',
      dept: deptRows['CARD'],
      spec: 'Interventional Cardiology',
      qual: 'MBBS, MD (Medicine), DM (Cardiology), FACC',
      exp: 15,
      fee: 800,
      bio: 'Senior Interventional Cardiologist with over 15 years of experience in angioplasty, heart failure, and preventive cardiology. Fluent in English and Hindi.',
      status: 'verified',
      room: 'Chamber 304',
      floor: '3rd Floor',
      wing: 'Block A - Cardiovascular Wing',
      presence: 'in_opd',
      navigation: 'Enter through Block A Main Entrance. Take Elevator Bank A to 3rd Floor. Turn right at the Cardiology Reception Desk. Chamber 304 is the second door on the left.'
    },
    {
      name: 'Dr. Priya Sundaram',
      email: 'dr.priya@caresphere.health',
      phone: '+91-9876543202',
      lang: 'ta',
      hospital_name: 'CareSphere Multi-Specialty Hospital',
      hospital_location: 'Greams Road Campus, Chennai',
      reg: 'TNC-2014-49211',
      council: 'Tamil Nadu Medical Council',
      dept: deptRows['ORTH'],
      spec: 'Orthopedic & Joint Replacement Surgeon',
      qual: 'MBBS, MS (Orthopedics), Fellowship in Robotic Arthroplasty (UK)',
      exp: 11,
      fee: 750,
      bio: 'Expert in minimally invasive joint replacements, sports knee ligament repairs, and geriatric orthopedic care. Fluent in Tamil and English.',
      status: 'verified',
      room: 'Chamber 208',
      floor: '2nd Floor',
      wing: 'Block A - Orthopedics & Joint Care Wing',
      presence: 'in_consultation',
      navigation: 'Proceed to Block A Lobby. Take Elevator Bank A or Escalator to 2nd Floor. Follow the blue overhead corridor signs to Joint Care Wing. Chamber 208 is directly opposite Nursing Station 2.'
    },
    {
      name: 'Dr. Arjun Reddy',
      email: 'dr.arjun@caresphere.health',
      phone: '+91-9876543203',
      lang: 'te',
      hospital_name: 'CareSphere Premier Institute of Health',
      hospital_location: 'HITEC City Campus, Hyderabad',
      reg: 'APMC-2016-19342',
      council: 'Andhra Pradesh Medical Council',
      dept: deptRows['PED'],
      spec: 'Consultant Pediatrician & Neonatologist',
      qual: 'MBBS, MD (Pediatrics), DNB (Neonatology)',
      exp: 8,
      fee: 600,
      bio: 'Compassionate pediatric specialist focused on child growth, newborn critical care, and adolescent healthcare. Fluent in Telugu, Hindi, and English.',
      status: 'verified',
      room: 'Chamber 114',
      floor: '1st Floor',
      wing: 'Block C - Mother & Child Pavilion',
      presence: 'in_opd',
      navigation: 'From the Main Hospital Atrium, take the walkway toward Block C (Pediatric Pavilion). Take Elevator C to 1st Floor. Enter the Children Consultation Zone. Chamber 114 has a cheerful animal-themed door marker.'
    },
    {
      name: 'Dr. Fatima Khan',
      email: 'dr.fatima@caresphere.health',
      phone: '+91-9876543204',
      lang: 'en',
      hospital_name: 'CareSphere Central Hospital',
      hospital_location: 'Saket Medical Enclave, New Delhi',
      reg: 'DMC-2012-73819',
      council: 'Delhi Medical Council',
      dept: deptRows['GEN'],
      spec: 'Consultant Internal Medicine & Diabetology',
      qual: 'MBBS, MD (General Medicine), Post Graduate Diploma in Diabetology',
      exp: 12,
      fee: 550,
      bio: 'Specialist in metabolic syndromes, long-term diabetes management, hypertension, and complex multiorgan illnesses.',
      status: 'verified',
      room: 'Chamber 102',
      floor: 'Ground Floor',
      wing: 'Block A - General OPD Wing',
      presence: 'on_rounds',
      navigation: 'Located conveniently on the Ground Floor. Walk straight past the Main Hospital Reception Desk toward Block A OPD. Chamber 102 is on your immediate right next to the Diagnostic Phlebotomy Room.'
    },
    // Doctor with pending verification for testing admin verification workflow!
    {
      name: 'Dr. Anand Verma',
      email: 'dr.anand@caresphere.health',
      phone: '+91-9876543205',
      lang: 'kn',
      hospital_name: 'CareSphere Neuro & Trauma Pavilion',
      hospital_location: 'Whitefield Campus, Bengaluru',
      reg: 'KMC-2019-58201',
      council: 'Karnataka Medical Council',
      dept: deptRows['NEUR'],
      spec: 'Neurosurgeon & Spine Specialist',
      qual: 'MBBS, MS (General Surgery), MCh (Neurosurgery)',
      exp: 6,
      fee: 900,
      bio: 'Microsurgical specialist in cranial trauma, spinal decompression, and peripheral nerve disorders. Pending hospital credential committee sign-off.',
      status: 'pending',
      room: 'Chamber 405',
      floor: '4th Floor',
      wing: 'Block B - Neurosciences Tower',
      presence: 'off_duty',
      navigation: 'Take Elevator Bank B to 4th Floor. Walk down the Neurosciences corridor. Chamber 405 is adjacent to the Neuro-Diagnostics Suite.'
    }
  ];

  const insertDoctorProfile = db.prepare(`
    INSERT OR IGNORE INTO doctor_profiles (
      user_id, hospital_name, hospital_location, registration_number, state_medical_council, department_id, specialization, qualifications,
      experience_years, consultation_fee, bio, verification_status, verification_checklist,
      verified_at, verified_by, room_number, floor, wing, current_presence_status, navigation_instructions,
      council_certificate_url, degree_certificate_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  doctorUsers.forEach(doc => {
    insertUser.run(doc.name, doc.email, doc.phone, doctorPassword, 'doctor', doc.lang);
    const u = db.prepare('SELECT id FROM users WHERE email = ?').get(doc.email) as { id: number };
    if (u) {
      const isVerified = doc.status === 'verified';
      const checklistJson = isVerified ? JSON.stringify({
        council_reg_verified: true,
        id_verified: true,
        degree_verified: true,
        background_cleared: true,
        chamber_assigned: true,
        authoritative_source: doc.council,
        verified_date: new Date().toISOString().slice(0, 10)
      }) : null;

      insertDoctorProfile.run(
        u.id,
        doc.hospital_name || 'CareSphere Super Specialty Hospital',
        doc.hospital_location || 'Main Campus, Bengaluru',
        doc.reg,
        doc.council,
        doc.dept,
        doc.spec,
        doc.qual,
        doc.exp,
        doc.fee,
        doc.bio,
        doc.status,
        checklistJson,
        isVerified ? new Date().toISOString() : null,
        isVerified ? adminUser?.id : null,
        doc.room,
        doc.floor,
        doc.wing,
        doc.presence,
        doc.navigation,
        `/uploads/certificates/demo_council_${doc.name.toLowerCase().replace(/[^a-z]/g, '')}.pdf`,
        `/uploads/certificates/demo_degree_${doc.name.toLowerCase().replace(/[^a-z]/g, '')}.pdf`
      );
    }
  });

  // 3. Doctor Availability Slots (Monday to Friday, 09:00 - 13:00 and 14:00 - 17:00)
  const allDocProfiles = db.prepare("SELECT id, verification_status FROM doctor_profiles WHERE verification_status IN ('approved', 'verified')").all() as { id: number }[];
  const insertSlot = db.prepare(`
    INSERT OR IGNORE INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
    VALUES (?, ?, ?, ?, ?)
  `);

  allDocProfiles.forEach(dp => {
    // Mon (1) to Fri (5)
    for (let day = 1; day <= 5; day++) {
      insertSlot.run(dp.id, day, '09:00', '13:00', 30);
      insertSlot.run(dp.id, day, '14:00', '17:00', 30);
    }
    // Saturday morning
    insertSlot.run(dp.id, 6, '09:00', '12:00', 30);
  });

  // 4. Sample Patients
  const patients = [
    {
      name: 'Ravi Kumar',
      email: 'ravi.kumar@example.com',
      phone: '+91-9123456780',
      lang: 'hi',
      dob: '1988-06-14',
      gender: 'Male',
      blood: 'B+',
      address: 'Sector 14, Gurgaon, NCR',
      history: 'Mild hypertension under management with lifestyle modifications.'
    },
    {
      name: 'Ananya Sen',
      email: 'ananya.sen@example.com',
      phone: '+91-9123456781',
      lang: 'en',
      dob: '1995-11-22',
      gender: 'Female',
      blood: 'O+',
      address: 'Koramangala 4th Block, Bengaluru',
      history: 'No known chronic conditions or medication allergies.'
    },
    {
      name: 'Karthik Selvam',
      email: 'karthik.selvam@example.com',
      phone: '+91-9123456782',
      lang: 'ta',
      dob: '1982-03-09',
      gender: 'Male',
      blood: 'A+',
      address: 'Anna Nagar West, Chennai',
      history: 'Type 2 Diabetes mellitus diagnosed in 2021.'
    }
  ];

  const insertPatientProfile = db.prepare(`
    INSERT OR IGNORE INTO patient_profiles (user_id, date_of_birth, gender, blood_group, address, medical_history_summary)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  patients.forEach(p => {
    insertUser.run(p.name, p.email, p.phone, patientPassword, 'patient', p.lang);
    const u = db.prepare('SELECT id FROM users WHERE email = ?').get(p.email) as { id: number };
    if (u) {
      insertPatientProfile.run(u.id, p.dob, p.gender, p.blood, p.address, p.history);
    }
  });

  // 5. Sample Booked Appointments
  const raviUser = db.prepare('SELECT id FROM users WHERE email = ?').get('ravi.kumar@example.com') as { id: number };
  const drSharma = db.prepare('SELECT dp.id as doctor_id, dp.department_id FROM doctor_profiles dp JOIN users u ON dp.user_id = u.id WHERE u.email = ?').get('dr.sharma@caresphere.health') as { doctor_id: number; department_id: number };

  if (raviUser && drSharma) {
    const insertAppt = db.prepare(`
      INSERT OR IGNORE INTO appointments (
        reference_no, patient_id, doctor_id, department_id, appointment_date, appointment_time, status, patient_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // An upcoming appointment
    insertAppt.run(
      'CS-2026-88102',
      raviUser.id,
      drSharma.doctor_id,
      drSharma.department_id,
      '2026-11-05',
      '10:30',
      'confirmed',
      'Routine cardiovascular checkup and blood pressure review.'
    );

    // A past completed appointment
    insertAppt.run(
      'CS-2026-71240',
      raviUser.id,
      drSharma.doctor_id,
      drSharma.department_id,
      '2026-10-10',
      '11:00',
      'completed',
      'Initial consultation for occasional chest tightness.'
    );
  }

  // 6. Hospital Facilities
  const facilities = [
    {
      name: '24/7 Emergency & Level-1 Trauma Care',
      category: 'Emergency',
      description: 'Fully equipped trauma resuscitation bays, cardiac monitoring, and immediate on-call emergency surgical teams.',
      timing: '24 Hours, 365 Days',
      contact_number: '+91-80-CARE-911',
      location: 'Ground Floor, South Wing, Direct Ambulance Bay',
      is_emergency: 1
    },
    {
      name: 'Automated Diagnostic Pathology Laboratory',
      category: 'Diagnostics',
      description: 'NABL accredited laboratory delivering precision biochemistry, hematology, microbiology, and molecular pathology reports.',
      timing: '24/7 for Inpatients & Emergency; 07:00 - 21:00 for Outpatients',
      contact_number: '+91-80-4911-201',
      location: '1st Floor, Diagnostic Tower',
      is_emergency: 0
    },
    {
      name: 'Advanced Imaging & 3T Digital MRI / 128-Slice CT',
      category: 'Radiology',
      description: 'State-of-the-art diagnostic imaging including high-resolution 3T MRI, Low-dose 128-Slice CT scan, ultrasound, and digital X-ray.',
      timing: '08:00 - 20:00 (Emergency scans available 24/7)',
      contact_number: '+91-80-4911-202',
      location: 'Basement 1, Diagnostic Tower',
      is_emergency: 0
    },
    {
      name: '24/7 In-House CareSphere Pharmacy',
      category: 'Pharmacy',
      description: 'Fully stocked inpatient and outpatient pharmacy offering genuine prescription medicines, temperature-controlled biologicals, and home deliveries.',
      timing: '24 Hours, 7 Days a Week',
      contact_number: '+91-80-4911-203',
      location: 'Ground Floor, Near Main Hospital Entrance',
      is_emergency: 0
    },
    {
      name: 'Comprehensive Rehabilitation & Physiotherapy',
      category: 'Rehabilitation',
      description: 'Post-operative orthopedic recovery, neurological rehabilitation, pediatric occupational therapy, and sports biomechanics recovery.',
      timing: '08:00 - 18:00 (Mon - Sat)',
      contact_number: '+91-80-4911-204',
      location: '2nd Floor, Wellness Pavilion',
      is_emergency: 0
    },
    {
      name: 'Universal Accessibility & Multilingual Patient Desks',
      category: 'Accessibility',
      description: 'Wheelchair access ramps, tactile paving, Braille signage in elevators, hearing loop assistance, and multilingual coordinators at all reception desks.',
      timing: '06:00 - 22:00 Daily',
      contact_number: '+91-80-4911-200',
      location: 'Main Hospital Atrium & All Floor Desks',
      is_emergency: 0
    }
  ];

  const insertFacility = db.prepare(`
    INSERT OR IGNORE INTO hospital_facilities (name, category, description, timing, contact_number, location, is_emergency_facility)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  facilities.forEach(f => {
    insertFacility.run(f.name, f.category, f.description, f.timing, f.contact_number, f.location, f.is_emergency);
  });

  // 7. Frequently Asked Questions (Hospital Knowledge Base)
  const faqs = [
    {
      category: 'Appointments',
      question: 'How do I book an appointment on CareSphere?',
      answer: 'You can book an appointment in 3 easy steps: 1) Select your required medical department or search for your doctor by name, 2) Choose an available calendar slot, and 3) Confirm your patient details. You will receive an instant appointment confirmation reference number.'
    },
    {
      category: 'Appointments',
      question: 'Can I cancel or reschedule my appointment?',
      answer: 'Yes. Log in to your Patient Dashboard, locate your appointment under Upcoming Appointments, and click "Reschedule" or "Cancel". There are no cancellation fees when cancelled at least 2 hours before the scheduled time.'
    },
    {
      category: 'Emergency',
      question: 'What should I do in a medical emergency?',
      answer: 'If you or someone around you experiences life-threatening symptoms (such as severe chest pain, sudden difficulty breathing, stroke symptoms, loss of consciousness, or massive trauma), immediately call our emergency hotline +91-80-CARE-911 or national ambulance service 108 / 112. Do not wait for an online appointment.'
    },
    {
      category: 'Documents',
      question: 'What documents should I bring to my appointment?',
      answer: 'Please bring your CareSphere appointment reference number, a government-issued photo identity card (Aadhaar, Passport, or Voter ID), any prior medical discharge summaries, recent laboratory test reports, and your current ongoing prescription medications.'
    },
    {
      category: 'Insurance',
      question: 'Does CareSphere support cashless health insurance / TPA?',
      answer: 'Yes, we are empaneled with major public and private health insurers as well as leading Third-Party Administrators (TPAs). Please visit our Insurance Helpdesk on the Ground Floor with your policy card for pre-authorization.'
    },
    {
      category: 'Languages',
      question: 'In which languages can I communicate with CareSphere?',
      answer: 'CareSphere provides complete support in 10 languages: English, தமிழ் (Tamil), हिन्दी (Hindi), తెలుగు (Telugu), ಕನ್ನಡ (Kannada), മലയാളம் (Malayalam), বাংলা (Bengali), मराठी (Marathi), ગુજરાતી (Gujarati), and ਪੰਜਾਬੀ (Punjabi). The website and the AI assistant speak and understand all of these languages.'
    }
  ];

  const insertFaq = db.prepare(`
    INSERT OR IGNORE INTO hospital_faqs (category, question, answer)
    VALUES (?, ?, ?)
  `);

  faqs.forEach(q => {
    insertFaq.run(q.category, q.question, q.answer);
  });

  // 8. Hospital Announcements
  const announcements = [
    {
      title: 'Free Preventive Cardiac Health Camp this Saturday',
      content: 'CareSphere Hospital is organizing a complimentary ECG and Blood Pressure screening camp this Saturday from 09:00 AM to 02:00 PM in the Main Atrium. Pre-registration available at reception.',
      priority: 'high'
    },
    {
      title: 'Multilingual Digital Health Kiosks Launched',
      content: 'Patients can now print their appointment slips, view lab reports, and navigate the hospital campus in their preferred regional language using the new digital touch kiosks located at each block entrance.',
      priority: 'normal'
    }
  ];

  const insertAnn = db.prepare(`
    INSERT OR IGNORE INTO announcements (title, content, priority)
    VALUES (?, ?, ?)
  `);

  announcements.forEach(a => {
    insertAnn.run(a.title, a.content, a.priority);
  });

  // 9. Initial Audit Log
  db.prepare(`
    INSERT INTO audit_logs (user_name, user_role, action, resource, details)
    VALUES ('System Initializer', 'system', 'SYSTEM_SEED', 'DATABASE', 'CareSphere demo environment seeded successfully.')
  `).run();

  console.log('CareSphere database seeded successfully!');
}

// Run if called directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
