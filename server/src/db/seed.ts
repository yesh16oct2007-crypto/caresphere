import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';

export function ensureDatabaseSeeded(): void {
  try {
    initDatabase();
    const userRow = db.prepare('SELECT count(*) as count FROM users').get() as { count: number } | undefined;
    const resRow = db.prepare('SELECT count(*) as count FROM hospital_resources').get() as { count: number } | undefined;
    const hospRow = db.prepare('SELECT count(*) as count FROM hospitals').get() as { count: number } | undefined;

    if (!userRow || userRow.count === 0 || !resRow || resRow.count === 0 || !hospRow || hospRow.count === 0) {
      console.log('CareSphere missing essential data detected (users/hospitals/resources). Seeding initial demo data...');
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

  // 9. Hospitals Network
  const hospitals = [
    {
      name: 'CareSphere Super Specialty Hospital',
      code: 'CS-BLR-01',
      location: 'Central Campus, Outer Ring Road, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'Plot 42, Tech Corridor, Bellandur, Bengaluru 560103',
      contact_phone: '+91-80-4920-1100',
      contact_email: 'bangalore.info@caresphere.health',
      emergency_hotline: '+91-80-CARE-911',
      rating: 4.9,
      total_beds: 350
    },
    {
      name: 'CareSphere Multi-Specialty Hospital',
      code: 'CS-CHN-01',
      location: 'Greams Road Campus, Thousand Lights',
      city: 'Chennai',
      state: 'Tamil Nadu',
      address: '21 Greams Road, Thousand Lights, Chennai 600006',
      contact_phone: '+91-44-2829-0200',
      contact_email: 'chennai.info@caresphere.health',
      emergency_hotline: '+91-44-CARE-911',
      rating: 4.8,
      total_beds: 280
    },
    {
      name: 'CareSphere Advanced Healthcare Center',
      code: 'CS-HYD-01',
      location: 'Hitec City Medical Enclave, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      address: 'Block C, Cyber Gateway Road, Hitec City, Hyderabad 500081',
      contact_phone: '+91-40-6712-4400',
      contact_email: 'hyderabad.info@caresphere.health',
      emergency_hotline: '+91-40-CARE-911',
      rating: 4.8,
      total_beds: 220
    }
  ];

  const insertHosp = db.prepare(`
    INSERT OR IGNORE INTO hospitals (name, code, location, city, state, address, contact_phone, contact_email, emergency_hotline, rating, total_beds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  hospitals.forEach(h => {
    insertHosp.run(h.name, h.code, h.location, h.city, h.state, h.address, h.contact_phone, h.contact_email, h.emergency_hotline, h.rating, h.total_beds);
  });

  const hospRows: Record<string, number> = {};
  (db.prepare('SELECT id, code FROM hospitals').all() as any[]).forEach(h => {
    hospRows[h.code] = h.id;
  });

  // Hospital Administrators
  const hospAdminPassword = bcrypt.hashSync('Hospital@12345', 10);
  insertUser.run('Bengaluru Hospital Admin', 'blr.admin@caresphere.health', '+91-9876543291', hospAdminPassword, 'hospital_admin', 'en');
  insertUser.run('Chennai Hospital Admin', 'chn.admin@caresphere.health', '+91-9876543292', hospAdminPassword, 'hospital_admin', 'ta');
  insertUser.run('Hyderabad Hospital Admin', 'hyd.admin@caresphere.health', '+91-9876543293', hospAdminPassword, 'hospital_admin', 'te');
  insertUser.run('Apollo Bannerghatta Admin', 'apollo.admin@partner.caresphere.health', '+91-9876543294', hospAdminPassword, 'hospital_admin', 'en');

  // Assign hospital_id to administrators
  db.prepare("UPDATE users SET hospital_id = ? WHERE email = 'blr.admin@caresphere.health'").run(hospRows['CS-BLR-01'] || 1);
  db.prepare("UPDATE users SET hospital_id = ? WHERE email = 'chn.admin@caresphere.health'").run(hospRows['CS-CHN-01'] || 2);
  db.prepare("UPDATE users SET hospital_id = ? WHERE email = 'hyd.admin@caresphere.health'").run(hospRows['CS-HYD-01'] || 3);
  const apolloHospId = (db.prepare("SELECT id FROM hospitals WHERE name LIKE '%Apollo%' LIMIT 1").get() as any)?.id || (hospRows['CS-BLR-01'] || 1);
  db.prepare("UPDATE users SET hospital_id = ? WHERE email = 'apollo.admin@partner.caresphere.health'").run(apolloHospId);

  // Link existing doctors to hospitals
  db.prepare("UPDATE doctor_profiles SET hospital_id = ?, teleconsultation_available = 1, teleconsultation_fee = 750 WHERE id IN (1, 2, 3)").run(hospRows['CS-BLR-01'] || 1);
  db.prepare("UPDATE doctor_profiles SET hospital_id = ?, teleconsultation_available = 1, teleconsultation_fee = 650 WHERE id IN (4, 5)").run(hospRows['CS-CHN-01'] || 2);
  db.prepare("UPDATE doctor_profiles SET hospital_id = ?, teleconsultation_available = 1, teleconsultation_fee = 600 WHERE id >= 6").run(hospRows['CS-HYD-01'] || 3);

  // Link existing appointments to hospitals
  db.prepare("UPDATE appointments SET hospital_id = ? WHERE doctor_id IN (1, 2, 3) AND hospital_id IS NULL").run(hospRows['CS-BLR-01'] || 1);
  db.prepare("UPDATE appointments SET hospital_id = ? WHERE doctor_id IN (4, 5) AND hospital_id IS NULL").run(hospRows['CS-CHN-01'] || 2);
  db.prepare("UPDATE appointments SET hospital_id = ? WHERE hospital_id IS NULL").run(hospRows['CS-BLR-01'] || 1);

  // 10. Live Hospital Resources
  const insertResource = db.prepare(`
    INSERT OR IGNORE INTO hospital_resources (hospital_id, resource_type, total_capacity, available_count, occupied_count, status, details_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  Object.values(hospRows).forEach(hId => {
    insertResource.run(hId, 'general_beds', 200, 72, 128, 'available', JSON.stringify({ male_ward_avail: 34, female_ward_avail: 38 }));
    insertResource.run(hId, 'icu_beds', 35, 9, 26, 'available', JSON.stringify({ ventilator_avail: 6, ccu_avail: 3 }));
    insertResource.run(hId, 'emergency_beds', 25, 7, 18, 'available', JSON.stringify({ trauma_bay: 'Operational', triage_status: 'Normal Flow' }));
    insertResource.run(hId, 'ambulances', 8, 5, 3, 'available', JSON.stringify({ bls_ambulances: 3, als_ambulances: 2, response_time_mins: 8 }));
    insertResource.run(hId, 'blood_bank', 120, 94, 26, 'available', JSON.stringify({ 'A+': 18, 'A-': 8, 'B+': 24, 'B-': 6, 'O+': 26, 'O-': 4, 'AB+': 8 }));
    insertResource.run(hId, 'oxygen_cylinders', 50, 38, 12, 'available', JSON.stringify({ jumbo_cylinders: 22, portable_units: 16 }));
    insertResource.run(hId, 'ventilators', 20, 6, 14, 'available', JSON.stringify({ invasive_units: 4, non_invasive_units: 2 }));
    insertResource.run(hId, 'lab_services', 1, 1, 0, 'operational', JSON.stringify({ routine_wait_mins: 15, stat_turnaround_mins: 45, nabl_accredited: true }));
    insertResource.run(hId, 'pharmacy', 1, 1, 0, 'operational', JSON.stringify({ open_24x7: true, generic_availability: '98%', home_delivery: true }));
    insertResource.run(hId, 'emergency_dept', 1, 1, 0, 'operational', JSON.stringify({ level: 'Level 1 Trauma Center', chief_er_doctor_on_duty: 'Dr. S. Nair' }));
  });

  // 11. Insurance Providers & Hospital Partnerships
  const insuranceProviders = [
    { name: 'Star Health & Allied Insurance', code: 'STAR-HLTH', toll: '1800-425-2255', cashless: 1, info: 'Pre-authorization turnaround within 2 hours with digital e-card.' },
    { name: 'HDFC ERGO General Insurance', code: 'HDFC-ERGO', toll: '1800-2666', cashless: 1, info: 'Direct TPA desk processing on Ground Floor counter 3.' },
    { name: 'ICICI Lombard Health Care', code: 'ICICI-LOMB', toll: '1800-2666', cashless: 1, info: 'Instant approval for planned surgical admissions and daycare procedures.' },
    { name: 'Care Health Insurance (Religare)', code: 'CARE-HLTH', toll: '1800-102-4455', cashless: 1, info: '100% cashless hospital network partnership with zero sub-limits.' },
    { name: 'Niva Bupa Health Insurance', code: 'NIVA-BUPA', toll: '1860-500-8888', cashless: 1, info: 'Express discharge settlement within 60 minutes of final bill.' },
    { name: 'Ayushman Bharat (PM-JAY)', code: 'PMJAY-GOV', toll: '14555', cashless: 1, info: 'Government health scheme offering cashless coverage up to ₹5 Lakhs per family.' }
  ];

  const insertInsProvider = db.prepare(`
    INSERT OR IGNORE INTO insurance_providers (name, code, toll_free_number, is_cashless_network, claim_process_info)
    VALUES (?, ?, ?, ?, ?)
  `);

  insuranceProviders.forEach(p => {
    insertInsProvider.run(p.name, p.code, p.toll, p.cashless, p.info);
  });

  const insRows: Record<string, number> = {};
  (db.prepare('SELECT id, code FROM insurance_providers').all() as any[]).forEach(i => {
    insRows[i.code] = i.id;
  });

  const insertInsPartner = db.prepare(`
    INSERT OR IGNORE INTO hospital_insurance_partners (hospital_id, insurance_id, is_cashless_enabled, tpa_desk_contact, tpa_room_location)
    VALUES (?, ?, ?, ?, ?)
  `);

  Object.values(hospRows).forEach(hId => {
    Object.values(insRows).forEach(iId => {
      insertInsPartner.run(hId, iId, 1, '+91-80-CARE-INS (ext 114)', 'Ground Floor Atrium, Room G-14');
    });
  });

  // 12. Hospital Indoor Multi-Floor Navigation Maps
  const insertFloor = db.prepare(`
    INSERT OR IGNORE INTO hospital_floor_maps (hospital_id, floor_number, floor_name, svg_layout_data, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  const blrHospId = hospRows['CS-BLR-01'] || 1;
  const chnHospId = hospRows['CS-CHN-01'] || 2;
  const hydHospId = hospRows['CS-HYD-01'] || 3;
  insertFloor.run(blrHospId, 0, 'Ground Floor - Main Atrium & Diagnostics', JSON.stringify({ wing: 'Main Atrium', zone_count: 8 }));
  insertFloor.run(blrHospId, 1, '1st Floor - Clinical Outpatient (OPD)', JSON.stringify({ wing: 'Clinical OPD', zone_count: 6 }));
  insertFloor.run(blrHospId, 2, '2nd Floor - Orthopedics, Radiology & Daycare', JSON.stringify({ wing: 'Specialty Wing', zone_count: 5 }));
  insertFloor.run(blrHospId, 3, '3rd Floor - Advanced Cardiology, Cath Lab & ICU', JSON.stringify({ wing: 'Cardiovascular Wing', zone_count: 4 }));

  const floorRows: Record<number, number> = {};
  (db.prepare('SELECT id, floor_number FROM hospital_floor_maps WHERE hospital_id = ?').all(blrHospId) as any[]).forEach(f => {
    floorRows[f.floor_number] = f.id;
  });

  const insertLocation = db.prepare(`
    INSERT OR IGNORE INTO hospital_locations (hospital_id, floor_id, name, category, room_number, wing, directions_text, is_wheelchair_accessible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Ground Floor locations
  insertLocation.run(blrHospId, floorRows[0] || 1, 'Main Hospital Entrance (Gate 1)', 'reception', 'Gate 1', 'Main Atrium', 'Main entrance directly from patient drop-off porch.', 1);
  insertLocation.run(blrHospId, floorRows[0] || 1, '24/7 Emergency & Trauma Resuscitation', 'emergency', 'ER-01', 'East Wing', 'Immediate access via Emergency Ambulance Ramp (Gate 2).', 1);
  insertLocation.run(blrHospId, floorRows[0] || 1, 'Central Registration & Token Counter', 'reception', 'Counter 1-6', 'Central Lobby', 'Located opposite Main Atrium information desk.', 1);
  insertLocation.run(blrHospId, floorRows[0] || 1, '24/7 Outpatient Pharmacy', 'pharmacy', 'PH-01', 'West Wing', 'Turn left from Main Entrance; located beside billing counters.', 1);
  insertLocation.run(blrHospId, floorRows[0] || 1, 'Central Diagnostic Pathology Lab', 'diagnostic', 'LAB-G01', 'North Corridor', 'Follow green floor signage; sample collection in Room G-08.', 1);
  insertLocation.run(blrHospId, floorRows[0] || 1, 'Billing & TPA Insurance Helpdesk', 'billing', 'Room G-14', 'Atrium Wing', 'Directly adjacent to central discharge lounge.', 1);
  insertLocation.run(blrHospId, floorRows[0] || 1, 'Elevator Bank A (Wheelchair Accessible)', 'amenity', 'Elevator A', 'Central Core', 'High-capacity stretcher elevators serving Floors 0 to 6.', 1);
  insertLocation.run(blrHospId, floorRows[0] || 1, 'Cafeteria & Patient Dining', 'amenity', 'Cafeteria', 'Courtyard Wing', 'Open from 07:00 AM to 10:00 PM.', 1);

  // 1st Floor locations
  insertLocation.run(blrHospId, floorRows[1] || 2, 'General & Internal Medicine OPD', 'opd', 'Chamber 101', 'Block A', 'Exit Elevator A, turn right. Located opposite Nursing Station 1.', 1);
  insertLocation.run(blrHospId, floorRows[1] || 2, 'Pediatrics & Child Wellness Clinic', 'opd', 'Chamber 104', 'Block C', 'Follow playful yellow wall graphics down Block C corridor.', 1);
  insertLocation.run(blrHospId, floorRows[1] || 2, 'Dermatology & Skin Care Suite', 'opd', 'Chamber 106', 'Block B', 'Located next to Minor Procedure Room 108.', 1);

  // 2nd Floor locations
  insertLocation.run(blrHospId, floorRows[2] || 3, 'Orthopedics & Joint Replacement Center', 'opd', 'Chamber 201', 'Block A', 'Exit elevator, turn left toward Orthopedics OPD registration.', 1);
  insertLocation.run(blrHospId, floorRows[2] || 3, 'Digital X-Ray & MRI / CT Scanning Wing', 'diagnostic', 'RAD-202', 'Specialty Wing', 'Sign in at Radiology Reception desk.', 1);

  // 3rd Floor locations
  insertLocation.run(blrHospId, floorRows[3] || 4, 'Interventional Cardiology OPD (Dr. Rajesh Sharma)', 'opd', 'Chamber 304', 'Cardiovascular Wing', 'Exit Elevator A, turn right at Cardiology desk. Chamber 304.', 1);
  insertLocation.run(blrHospId, floorRows[3] || 4, 'Cardiac Catheterization Laboratory (Cath Lab)', 'opd', 'CATH-01', 'Cardiovascular Wing', 'Restricted sterile clinical zone.', 1);
  insertLocation.run(blrHospId, floorRows[3] || 4, 'Intensive Cardiac Care Unit (ICCU)', 'icu', 'ICU-301', 'West Core', 'Visitor entry via sanitized airlock at designated hours.', 1);

  // 13. Patient Medical Records for Patient Ravi Kumar (User ID 8)
  const patientRavi = db.prepare("SELECT id FROM users WHERE email = 'ravi.kumar@example.com'").get() as any;
  if (patientRavi) {
    const insertMedRecord = db.prepare(`
      INSERT OR IGNORE INTO medical_records (patient_id, title, document_type, file_path, file_name, file_size, mime_type, hospital_name, doctor_name, record_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertMedRecord.run(
      patientRavi.id,
      'Comprehensive Lipid Profile & Liver Function Panel',
      'lab_report',
      'uploads/medical_records/sample_lipid_report.pdf',
      'Lipid_LFT_Report_Oct2026.pdf',
      245800,
      'application/pdf',
      'CareSphere Super Specialty Hospital',
      'Dr. Rajesh Sharma',
      '2026-10-15',
      'Routine 6-month lipid panel review. Total cholesterol slightly elevated at 228 mg/dL.'
    );

    insertMedRecord.run(
      patientRavi.id,
      'Cardiology Outpatient Prescription & Care Plan',
      'prescription',
      'uploads/medical_records/sample_prescription.pdf',
      'Prescription_Cardiology_Sharma.pdf',
      128400,
      'application/pdf',
      'CareSphere Super Specialty Hospital',
      'Dr. Rajesh Sharma',
      '2026-10-15',
      'Prescribed Atorvastatin 20mg and Telmisartan 40mg. Advised low-sodium Mediterranean diet.'
    );

    insertMedRecord.run(
      patientRavi.id,
      'Chest X-Ray PA View Radiology Report',
      'radiology_scan',
      'uploads/medical_records/sample_xray.pdf',
      'Chest_XRay_PA_Sep2026.pdf',
      584200,
      'application/pdf',
      'CareSphere Super Specialty Hospital',
      'Dr. V. Raman',
      '2026-09-20',
      'Normal lung parenchyma, normal cardiothoracic ratio, clear costophrenic angles.'
    );

    // Share with Dr. Rajesh Sharma
    const firstRec = db.prepare('SELECT id FROM medical_records WHERE patient_id = ? LIMIT 1').get(patientRavi.id) as any;
    if (firstRec) {
      db.prepare(`
        INSERT OR IGNORE INTO medical_record_shares (record_id, patient_id, doctor_id, status, expires_at)
        VALUES (?, ?, 1, 'active', datetime('now', '+30 days'))
      `).run(firstRec.id, patientRavi.id);

      db.prepare(`
        INSERT INTO medical_record_access_logs (record_id, accessed_by, accessor_name, accessor_role, action, ip_address)
        VALUES (?, ?, 'Dr. Rajesh Sharma', 'doctor', 'VIEW', '127.0.0.1')
      `).run(firstRec.id, 2);
    }

    // 14. Medicine Reminders for Ravi Kumar
    const insertReminder = db.prepare(`
      INSERT OR IGNORE INTO medicine_reminders (patient_id, doctor_id, medicine_name, dosage, frequency, timing_slots, food_relation, start_date, end_date, doctor_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertReminder.run(
      patientRavi.id,
      1,
      'Atorvastatin',
      '20 mg (1 tablet)',
      'Once Daily',
      JSON.stringify(['21:00']),
      'after_food',
      '2026-10-15',
      '2026-12-15',
      'Take at night after dinner for lipid control.'
    );

    insertReminder.run(
      patientRavi.id,
      1,
      'Telmisartan',
      '40 mg (1 tablet)',
      'Once Daily',
      JSON.stringify(['08:00']),
      'after_food',
      '2026-10-15',
      '2026-12-15',
      'Take in the morning with a glass of water for blood pressure management.'
    );

    insertReminder.run(
      patientRavi.id,
      1,
      'Metformin ER',
      '500 mg (1 tablet)',
      'Twice Daily',
      JSON.stringify(['08:00', '20:00']),
      'with_food',
      '2026-10-15',
      '2026-12-15',
      'Take with breakfast and dinner.'
    );

    // Today's log for Ravi
    const todayStr = new Date().toISOString().slice(0, 10);
    const rem1 = db.prepare('SELECT id FROM medicine_reminders WHERE patient_id = ? LIMIT 1').get(patientRavi.id) as any;
    if (rem1) {
      db.prepare(`
        INSERT OR IGNORE INTO medicine_logs (reminder_id, patient_id, scheduled_date, scheduled_time, status, logged_at)
        VALUES (?, ?, ?, '08:00', 'taken', datetime('now'))
      `).run(rem1.id, patientRavi.id, todayStr);
    }

    // 15. Saved Insurance Policy for Ravi Kumar
    const starIns = insRows['STAR-HLTH'] || 1;
    db.prepare(`
      INSERT OR IGNORE INTO patient_insurance_policies (
        patient_id, insurance_provider_id, provider_name, policy_number,
        policy_holder_name, tpa_id, sum_insured, valid_until
      ) VALUES (?, ?, 'Star Health & Allied Insurance', 'SH-2024-8849201', 'Ravi Kumar', 'TPA-STAR-BLR-492', 1000000, '2027-08-31')
    `).run(patientRavi.id, starIns);

    // 16. Remote Follow-up for Ravi Kumar with Dr. Rajesh Sharma
    db.prepare(`
      INSERT OR IGNORE INTO patient_followups (
        doctor_id, patient_id, hospital_id, scheduled_date, instructions, status, patient_symptoms, patient_recovery_score, vitals_data, doctor_feedback, doctor_reviewed_at
      ) VALUES (?, ?, ?, ?, ?, 'reviewed', ?, ?, ?, ?, datetime('now', '-2 days'))
    `).run(
      1,
      patientRavi.id,
      blrHospId,
      '2026-10-28',
      'Post-consultation follow-up: Log blood pressure readings every morning for 5 consecutive days.',
      'Blood pressure readings stabilized around 122/80 mmHg. No dizziness or shortness of breath.',
      9,
      JSON.stringify({ blood_pressure: '122/80 mmHg', pulse: '72 bpm', fasting_sugar: '104 mg/dL' }),
      'Readings look excellent. Well controlled on Telmisartan 40mg. Continue current therapy.'
    );

    // Upcoming follow-up
    db.prepare(`
      INSERT OR IGNORE INTO patient_followups (
        doctor_id, patient_id, hospital_id, scheduled_date, instructions, status
      ) VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(
      1,
      patientRavi.id,
      blrHospId,
      new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      'Second stage follow-up: Check fasting blood glucose and submit self-reported energy levels.'
    );

    // 17. Demo Online Video Consultation Appointment
    const vcRef = `CS-VC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const vcRoom = 'room-care-teleconsult-demo-01';
    db.prepare(`
      INSERT OR IGNORE INTO appointments (
        reference_no, patient_id, doctor_id, department_id, hospital_id,
        appointment_date, appointment_time, consultation_type, status,
        video_room_id, video_session_status, meeting_link, patient_notes, doctor_notes
      ) VALUES (?, ?, 1, 1, ?, ?, '16:00', 'online_video', 'confirmed', ?, 'scheduled', ?, 'Routine cardiac rhythm check and medication review.', 'Patient has active teleconsult scheduled.')
    `).run(
      vcRef,
      patientRavi.id,
      blrHospId,
      new Date().toISOString().slice(0, 10),
      vcRoom,
      `/consultations/room/${vcRoom}`
    );

    // 18. Patient Feedback
    db.prepare(`
      INSERT OR IGNORE INTO patient_feedback (hospital_id, patient_id, doctor_id, rating, review)
      VALUES (?, ?, 1, 5, 'Dr. Rajesh Sharma was thorough, patient, and explained everything clearly in Hindi and English. Hospital staff was courteous.')
    `).run(blrHospId, patientRavi.id);

    // 19. Emergency Contacts for Ravi Kumar
    db.prepare(`
      INSERT OR IGNORE INTO emergency_contacts (patient_id, name, relationship, phone, is_primary)
      VALUES (?, 'Meera Kumar', 'Spouse / Wife', '+91-9876543212', 1)
    `).run(patientRavi.id);
    db.prepare(`
      INSERT OR IGNORE INTO emergency_contacts (patient_id, name, relationship, phone, is_primary)
      VALUES (?, 'Suresh Kumar', 'Brother', '+91-9876543213', 0)
    `).run(patientRavi.id);

    // 20. Hospital Pharmacies
    const insertPharm = db.prepare(`
      INSERT OR IGNORE INTO pharmacies (
        hospital_id, name, license_number, location, contact_phone, email, operating_hours, offers_delivery, delivery_fee
      ) VALUES (?, ?, ?, ?, ?, ?, '24x7 Open', 1, 50)
    `);

    insertPharm.run(blrHospId, 'CareSphere Central Pharmacy - Bellandur', 'DL-KA-BLR-2024-8849', 'Ground Floor, Block A Atrium, Bengaluru', '+91-80-4920-1199', 'pharmacy.blr@caresphere.health');
    insertPharm.run(chnHospId, 'CareSphere Express Pharmacy - Greams Road', 'DL-TN-CHN-2024-3912', 'Block B Pharmacy Wing, Chennai', '+91-44-2829-0299', 'pharmacy.chn@caresphere.health');
    insertPharm.run(hydHospId, 'CareSphere Cyber Gateway Pharmacy', 'DL-TG-HYD-2024-7714', 'Ground Floor Pavilion, Hyderabad', '+91-40-6712-4499', 'pharmacy.hyd@caresphere.health');

    const blrPharm = db.prepare('SELECT id FROM pharmacies WHERE hospital_id = ?').get(blrHospId) as any;
    const chnPharm = db.prepare('SELECT id FROM pharmacies WHERE hospital_id = ?').get(chnHospId) as any;
    const hydPharm = db.prepare('SELECT id FROM pharmacies WHERE hospital_id = ?').get(hydHospId) as any;

    // Staff Users: Pharmacy Staff and Lab Staff
    const staffPassword = bcrypt.hashSync('Staff@12345', 10);
    db.prepare(`
      INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, preferred_language, hospital_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Ananya Rao (Chief Pharmacist)', 'blr.pharmacy@caresphere.health', '+91-9876543293', staffPassword, 'pharmacy_staff', 'en', blrHospId);

    db.prepare(`
      INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, preferred_language, hospital_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Karthik Nambiar (Senior Pathologist)', 'blr.lab@caresphere.health', '+91-9876543294', staffPassword, 'lab_staff', 'en', blrHospId);

    // 21. Real Medicines Database (25+ Medicines)
    const medicinesData = [
      { name: 'Telmisartan 40mg', brand: 'Telma 40', generic: 'Telmisartan', strength: '40 mg', form: 'Tablet', mfr: 'Glenmark Pharmaceuticals', cat: 'Cardiology', rx: 1, mrp: 145.0, price: 122.0 },
      { name: 'Metformin 500mg ER', brand: 'Glycomet 500 SR', generic: 'Metformin Hydrochloride', strength: '500 mg', form: 'Tablet', mfr: 'USV Private Limited', cat: 'Diabetology', rx: 1, mrp: 58.0, price: 46.0 },
      { name: 'Atorvastatin 10mg', brand: 'Atorva 10', generic: 'Atorvastatin Calcium', strength: '10 mg', form: 'Tablet', mfr: 'Zydus Cadila', cat: 'Cardiology', rx: 1, mrp: 120.0, price: 98.0 },
      { name: 'Pantoprazole 40mg', brand: 'Pan 40', generic: 'Pantoprazole Sodium', strength: '40 mg', form: 'Tablet', mfr: 'Alkem Laboratories', cat: 'Gastroenterology', rx: 1, mrp: 165.0, price: 135.0 },
      { name: 'Amoxicillin + Clavulanate 625mg', brand: 'Augmentin 625 Duo', generic: 'Amoxicillin & Potassium Clavulanate', strength: '625 mg', form: 'Tablet', mfr: 'GlaxoSmithKline', cat: 'Antibiotics', rx: 1, mrp: 225.0, price: 195.0 },
      { name: 'Paracetamol 650mg', brand: 'Dolo 650', generic: 'Paracetamol', strength: '650 mg', form: 'Tablet', mfr: 'Micro Labs Ltd', cat: 'Analgesics & Antipyretics', rx: 0, mrp: 34.0, price: 30.0 },
      { name: 'Azithromycin 500mg', brand: 'Azee 500', generic: 'Azithromycin', strength: '500 mg', form: 'Tablet', mfr: 'Cipla Ltd', cat: 'Antibiotics', rx: 1, mrp: 138.0, price: 115.0 },
      { name: 'Montelukast + Levocetirizine', brand: 'Montair LC', generic: 'Montelukast Sodium & Levocetirizine', strength: '10mg/5mg', form: 'Tablet', mfr: 'Cipla Ltd', cat: 'Respiratory', rx: 1, mrp: 210.0, price: 175.0 },
      { name: 'Cetirizine 10mg', brand: 'Cetzine 10', generic: 'Cetirizine Dihydrochloride', strength: '10 mg', form: 'Tablet', mfr: 'Dr. Reddy Laboratories', cat: 'Allergy', rx: 0, mrp: 45.0, price: 38.0 },
      { name: 'Ibuprofen 400mg', brand: 'Brufen 400', generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', mfr: 'Abbott Healthcare', cat: 'Pain Relief', rx: 0, mrp: 28.0, price: 24.0 },
      { name: 'Amlodipine 5mg', brand: 'Amlong 5', generic: 'Amlodipine Besylate', strength: '5 mg', form: 'Tablet', mfr: 'Micro Labs Ltd', cat: 'Cardiology', rx: 1, mrp: 42.0, price: 35.0 },
      { name: 'Glimepiride 2mg', brand: 'Amaryl 2', generic: 'Glimepiride', strength: '2 mg', form: 'Tablet', mfr: 'Sanofi India', cat: 'Diabetology', rx: 1, mrp: 178.0, price: 152.0 },
      { name: 'Vitamin D3 60,000 IU', brand: 'Uprise D3 60K', generic: 'Cholecalciferol', strength: '60000 IU', form: 'Capsule', mfr: 'Alkem Laboratories', cat: 'Vitamins & Supplements', rx: 0, mrp: 150.0, price: 125.0 },
      { name: 'B-Complex + Zinc', brand: 'Becozym C Forte', generic: 'Vitamin B Complex with Vitamin C & Zinc', strength: 'Standard', form: 'Tablet', mfr: 'Bayer Pharmaceuticals', cat: 'Vitamins & Supplements', rx: 0, mrp: 62.0, price: 52.0 },
      { name: 'Omeprazole 20mg', brand: 'Omez 20', generic: 'Omeprazole', strength: '20 mg', form: 'Capsule', mfr: 'Dr. Reddy Laboratories', cat: 'Gastroenterology', rx: 1, mrp: 75.0, price: 62.0 },
      { name: 'Losartan 50mg', brand: 'Losar 50', generic: 'Losartan Potassium', strength: '50 mg', form: 'Tablet', mfr: 'Unichem Laboratories', cat: 'Cardiology', rx: 1, mrp: 110.0, price: 92.0 },
      { name: 'Ciprofloxacin 500mg', brand: 'Ciplox 500', generic: 'Ciprofloxacin Hydrochloride', strength: '500 mg', form: 'Tablet', mfr: 'Cipla Ltd', cat: 'Antibiotics', rx: 1, mrp: 68.0, price: 56.0 },
      { name: 'Budesonide Inhaler 200mcg', brand: 'Budecort 200 Inhaler', generic: 'Budesonide', strength: '200 mcg', form: 'Inhaler', mfr: 'Cipla Ltd', cat: 'Respiratory', rx: 1, mrp: 385.0, price: 335.0 },
      { name: 'Levothyroxine 50mcg', brand: 'Thyronorm 50', generic: 'Thyroxine Sodium', strength: '50 mcg', form: 'Tablet', mfr: 'Abbott Healthcare', cat: 'Endocrinology', rx: 1, mrp: 155.0, price: 130.0 },
      { name: 'Clopidogrel 75mg', brand: 'Clopilet 75', generic: 'Clopidogrel Bisulphate', strength: '75 mg', form: 'Tablet', mfr: 'Sun Pharma', cat: 'Cardiology', rx: 1, mrp: 125.0, price: 105.0 },
      { name: 'Rosuvastatin 10mg', brand: 'Rosuvas 10', generic: 'Rosuvastatin Calcium', strength: '10 mg', form: 'Tablet', mfr: 'Sun Pharma', cat: 'Cardiology', rx: 1, mrp: 215.0, price: 180.0 },
      { name: 'Domperidone + Rabeprazole', brand: 'Razo-D', generic: 'Rabeprazole Sodium & Domperidone', strength: '20mg/30mg', form: 'Capsule', mfr: 'Dr. Reddy Laboratories', cat: 'Gastroenterology', rx: 1, mrp: 245.0, price: 205.0 },
      { name: 'Salbutamol Inhaler 100mcg', brand: 'Asthalin Inhaler', generic: 'Salbutamol Sulphate', strength: '100 mcg', form: 'Inhaler', mfr: 'Cipla Ltd', cat: 'Respiratory', rx: 1, mrp: 175.0, price: 148.0 },
      { name: 'Iron + Folic Acid', brand: 'Autrin', generic: 'Ferrous Fumarate with Folic Acid & Vitamin B12', strength: 'Standard', form: 'Capsule', mfr: 'Pfizer India', cat: 'Hematology', rx: 0, mrp: 185.0, price: 155.0 },
      { name: 'Calcium + Vitamin D3', brand: 'Shelcal 500', generic: 'Calcium Carbonate with Vitamin D3', strength: '500 mg', form: 'Tablet', mfr: 'Torrent Pharmaceuticals', cat: 'Supplements', rx: 0, mrp: 130.0, price: 110.0 },
      { name: 'Diclofenac Sodium Gel', brand: 'Volini Gel', generic: 'Diclofenac Diethylamine', strength: '30g Tube', form: 'Gel', mfr: 'Sun Pharma', cat: 'Pain Relief', rx: 0, mrp: 165.0, price: 140.0 }
    ];

    const insertMed = db.prepare(`
      INSERT OR IGNORE INTO medicines (
        name, brand_name, generic_name, strength, dosage_form, manufacturer, category, prescription_required, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    medicinesData.forEach(m => {
      insertMed.run(
        m.name,
        m.brand,
        m.generic,
        m.strength,
        m.form,
        m.mfr,
        m.cat,
        m.rx,
        `${m.brand} (${m.generic} ${m.strength}) manufactured by ${m.mfr}. Indicated for ${m.cat.toLowerCase()} management.`
      );
    });

    // Populate Inventory for each pharmacy
    const allMeds = db.prepare('SELECT id, name, brand_name FROM medicines').all() as any[];
    const insertInv = db.prepare(`
      INSERT OR IGNORE INTO pharmacy_inventory (
        pharmacy_id, medicine_id, batch_number, expiry_date, mrp_price, selling_price, stock_quantity, low_stock_threshold, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 15, 1)
    `);

    [blrPharm?.id, chnPharm?.id, hydPharm?.id].filter(Boolean).forEach((pharmId, pIdx) => {
      allMeds.forEach((m, mIdx) => {
        const medMeta = medicinesData.find(md => md.name === m.name) || medicinesData[0];
        const batch = `CS-PH-${2024 + (mIdx % 3)}-${1000 + mIdx}`;
        const expiry = `202${7 + (mIdx % 2)}-0${1 + (mIdx % 9)}-28`;
        const stock = 40 + ((mIdx * 7 + pIdx * 11) % 120);
        insertInv.run(pharmId, m.id, batch, expiry, medMeta.mrp, medMeta.price, stock);
      });
    });

    // 22. Diagnostic Laboratory Tests (12+ Real Tests)
    const labTestsData = [
      { code: 'CBC-001', name: 'Complete Blood Count (CBC) with ESR', cat: 'Hematology', desc: 'Evaluates red cells, white cells, platelets, hemoglobin, and ESR for infection or anemia.', sample: 'Blood (EDTA)', fasting: 0, prep: 'No special preparation or fasting required.', turnaround: 6, price: 350 },
      { code: 'LIP-002', name: 'Comprehensive Lipid Profile', cat: 'Biochemistry', desc: 'Measures Total Cholesterol, Triglycerides, HDL, LDL, and VLDL for cardiovascular risk assessment.', sample: 'Blood (Serum)', fasting: 1, prep: 'Strict 10-12 hours overnight fasting required. Water is permitted.', turnaround: 12, price: 650 },
      { code: 'LFT-003', name: 'Liver Function Test (LFT)', cat: 'Biochemistry', desc: 'Assesses Bilirubin (Total & Direct), SGOT/AST, SGPT/ALT, Alkaline Phosphatase, and Protein levels.', sample: 'Blood (Serum)', fasting: 1, prep: 'Overnight fasting of 8-10 hours recommended. Avoid alcohol 24 hours prior.', turnaround: 12, price: 750 },
      { code: 'KFT-004', name: 'Kidney Function Test (KFT/RFT) with Electrolytes', cat: 'Biochemistry', desc: 'Measures Blood Urea, Serum Creatinine, Uric Acid, Sodium, Potassium, and Chloride.', sample: 'Blood (Serum)', fasting: 0, prep: 'Maintain normal hydration. Avoid strenuous exercise immediately before test.', turnaround: 8, price: 800 },
      { code: 'HBA-005', name: 'HbA1c (Glycosylated Hemoglobin)', cat: 'Diabetology', desc: 'Gold standard measure of average blood glucose control over previous 90 days.', sample: 'Blood (EDTA)', fasting: 0, prep: 'Fasting not required. Can be done anytime during the day.', turnaround: 4, price: 450 },
      { code: 'THY-006', name: 'Thyroid Panel (Total T3, Total T4, Ultrasensitive TSH)', cat: 'Endocrinology', desc: 'Screens for hyperthyroidism and hypothyroidism gland dysfunction.', sample: 'Blood (Serum)', fasting: 1, prep: 'Morning sample preferred. Fasting 8 hours recommended.', turnaround: 12, price: 600 },
      { code: 'VITD-007', name: 'Vitamin D (25-Hydroxy Cholecalciferol)', cat: 'Vitamins', desc: 'Evaluates bone health, calcium absorption capability, and immune wellness.', sample: 'Blood (Serum)', fasting: 0, prep: 'No specific fasting required.', turnaround: 24, price: 1100 },
      { code: 'VITB-008', name: 'Vitamin B12 (Cyanocobalamin)', cat: 'Vitamins', desc: 'Detects deficiency causing neuropathy, memory fatigue, and megaloblastic anemia.', sample: 'Blood (Serum)', fasting: 1, prep: 'Overnight fasting of 8-10 hours recommended.', turnaround: 24, price: 950 },
      { code: 'URI-009', name: 'Urine Routine & Microscopic Examination', cat: 'Clinical Pathology', desc: 'Screens for urinary tract infections, proteinuria, microscopic hematuria, and renal casts.', sample: 'Urine (Mid-stream)', fasting: 0, prep: 'Collect clean-catch first-morning midstream urine sample in sterile container provided.', turnaround: 4, price: 250 },
      { code: 'CXR-010', name: 'Digital Chest X-Ray PA View', cat: 'Radiology', desc: 'High-resolution digital radiography of lungs, pleura, cardiac silhouette, and thoracic ribcage.', sample: 'Imaging', fasting: 0, prep: 'Remove metallic items, necklaces, and bra with underwire.', turnaround: 2, price: 500 },
      { code: 'ECG-011', name: '12-Lead Resting Digital ECG', cat: 'Cardiology Diagnostics', desc: 'Diagnostic electrical tracing of myocardial rhythm, conduction defects, and ischemia.', sample: 'Non-invasive Trace', fasting: 0, prep: 'Wear two-piece loose clothing. Avoid applying oily lotions on chest.', turnaround: 1, price: 300 },
      { code: 'USG-012', name: 'Ultrasound Whole Abdomen & Pelvis', cat: 'Radiology & Imaging', desc: 'Ultrasound evaluation of liver, gall bladder, pancreas, kidneys, spleen, and bladder.', sample: 'Ultrasound Scan', fasting: 1, prep: 'Strict 6 hours fasting for upper abdomen. Drink 1 liter water 1 hour prior for full bladder.', turnaround: 3, price: 1400 }
    ];

    const insertLab = db.prepare(`
      INSERT OR IGNORE INTO lab_tests (
        test_code, name, category, description, sample_type, fasting_required, preparation_instructions, turnaround_hours, base_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    labTestsData.forEach(lt => {
      insertLab.run(lt.code, lt.name, lt.cat, lt.desc, lt.sample, lt.fasting, lt.prep, lt.turnaround, lt.price);
    });

    // Populate Hospital-specific lab test pricing
    const allLabTests = db.prepare('SELECT id, test_code, base_price FROM lab_tests').all() as any[];
    const insertHospLab = db.prepare(`
      INSERT OR IGNORE INTO hospital_lab_tests (hospital_id, test_id, price, is_available)
      VALUES (?, ?, ?, 1)
    `);

    [blrHospId, chnHospId, hydHospId].forEach(hId => {
      allLabTests.forEach(lt => {
        insertHospLab.run(hId, lt.id, lt.base_price);
      });
    });

    // 23. Demo Digital Prescription for Ravi Kumar
    const rxRef = `RX-20261106-4921`;
    const rxRes = db.prepare(`
      INSERT OR IGNORE INTO prescriptions (
        prescription_number, patient_id, doctor_id, hospital_id, consultation_date,
        diagnosis, clinical_notes, vitals_summary, advice, followup_date, is_finalized
      ) VALUES (?, ?, 1, ?, '2026-11-04', 'Essential Systemic Hypertension (Stage 1) with Dyslipidemia',
        'Patient reports mild episodic occipital headaches. Normal ECG. Lipid levels borderline elevated. Cardio-protective regimen initiated.',
        'BP: 138/88 mmHg, Heart Rate: 76 bpm, SpO2: 98%, BMI: 25.4',
        'Adopt low-sodium DASH diet. Walk briskly 30 minutes daily. Avoid fried and processed snacks. Measure morning BP daily.',
        '2026-11-18', 1
      )
    `).run(rxRef, patientRavi.id, blrHospId);

    const seededRx = db.prepare('SELECT id FROM prescriptions WHERE prescription_number = ?').get(rxRef) as any;
    if (seededRx) {
      // Medicines for prescription
      const insertRxMed = db.prepare(`
        INSERT OR IGNORE INTO prescription_medicines (prescription_id, medicine_name, dosage, frequency, timing, duration, instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertRxMed.run(seededRx.id, 'Telmisartan 40mg', '1 Tablet', '1-0-0 (Morning)', 'after_food', '30 Days', 'Take with warm water every morning at 8:00 AM');
      insertRxMed.run(seededRx.id, 'Atorvastatin 10mg', '1 Tablet', '0-0-1 (Night)', 'after_food', '30 Days', 'Take after dinner before bedtime');
      insertRxMed.run(seededRx.id, 'Pan 40 (Pantoprazole)', '1 Tablet', '1-0-0 (Morning)', 'before_food', '14 Days', 'Take 30 minutes before breakfast');

      // Recommended lab tests for prescription
      const insertRxLab = db.prepare(`
        INSERT OR IGNORE INTO prescription_lab_recommendations (prescription_id, test_name, test_code, instructions, urgency)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertRxLab.run(seededRx.id, 'Comprehensive Lipid Profile', 'LIP-002', '12 hours fasting required before morning blood draw', 'routine');
      insertRxLab.run(seededRx.id, 'Kidney Function Test (KFT/RFT) with Electrolytes', 'KFT-004', 'Check baseline serum creatinine and electrolytes on Telmisartan', 'routine');

      // Audit log
      db.prepare(`
        INSERT OR IGNORE INTO prescription_audit_logs (prescription_id, action, performed_by, performer_role, details)
        VALUES (?, 'CREATED_AND_FINALIZED', 2, 'doctor', 'Digital prescription generated during outpatient cardiac consultation')
      `).run(seededRx.id);
    }

    // 24. Demo Lab Booking for Ravi Kumar
    const labBookingRef = `LAB-20261106-8812`;
    const lipidTest = db.prepare('SELECT id FROM lab_tests WHERE test_code = ?').get('LIP-002') as any;
    if (lipidTest) {
      db.prepare(`
        INSERT OR IGNORE INTO lab_bookings (
          booking_reference, patient_id, hospital_id, test_id, prescription_id,
          booking_date, booking_time, price, payment_status, status, notes
        ) VALUES (?, ?, ?, ?, ?, '2026-11-08', '08:30 AM', 650, 'paid', 'scheduled', 'Overnight 12 hours fasting booked.')
      `).run(labBookingRef, patientRavi.id, blrHospId, lipidTest.id, seededRx?.id || null);
    }

    // 25. Demo Pharmacy Order for Ravi Kumar
    const pharmacyOrderRef = `RXO-20261106-9923`;
    const orderRes = db.prepare(`
      INSERT OR IGNORE INTO pharmacy_orders (
        order_number, patient_id, hospital_id, pharmacy_id, prescription_id, fulfillment_type,
        contact_phone, total_items, subtotal, delivery_fee, total_amount, payment_method,
        payment_status, payment_transaction_id, prescription_verified, status, pickup_code
      ) VALUES (?, ?, ?, ?, ?, 'hospital_pickup', '+91-9876543210', 2, 220.0, 0, 220.0, 'online_upi',
        'paid', 'UPI-TXN-20261106-8812', 1, 'ready_for_pickup', 'PK-7491'
      )
    `).run(pharmacyOrderRef, patientRavi.id, blrHospId, blrPharm?.id || 1, seededRx?.id || null);

    const seededOrder = db.prepare('SELECT id FROM pharmacy_orders WHERE order_number = ?').get(pharmacyOrderRef) as any;
    if (seededOrder) {
      db.prepare(`
        INSERT OR IGNORE INTO pharmacy_order_items (order_id, medicine_id, medicine_name, strength, dosage_form, prescribed_dosage, quantity, unit_price, total_price)
        VALUES (?, 1, 'Telmisartan 40mg', '40 mg', 'Tablet', '1 Tablet daily', 1, 122.0, 122.0)
      `).run(seededOrder.id);
      db.prepare(`
        INSERT OR IGNORE INTO pharmacy_order_items (order_id, medicine_id, medicine_name, strength, dosage_form, prescribed_dosage, quantity, unit_price, total_price)
        VALUES (?, 3, 'Atorvastatin 10mg', '10 mg', 'Tablet', '1 Tablet night', 1, 98.0, 98.0)
      `).run(seededOrder.id);
    }
  }

  // 19. Initial Audit Log
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
