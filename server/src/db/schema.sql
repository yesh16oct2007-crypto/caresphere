-- CareSphere Database Schema
-- Compatible with SQLite and PostgreSQL (via portable types)

CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Karnataka',
  address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  emergency_hotline TEXT NOT NULL DEFAULT '+91-80-CARE-911',
  rating REAL DEFAULT 4.8,
  total_beds INTEGER DEFAULT 250,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin', 'hospital_admin', 'superadmin')),
  preferred_language TEXT NOT NULL DEFAULT 'en',
  hospital_id INTEGER REFERENCES hospitals(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  head_of_department TEXT,
  phone_extension TEXT,
  floor TEXT
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth TEXT,
  gender TEXT,
  blood_group TEXT,
  address TEXT,
  emergency_contact TEXT,
  medical_history_summary TEXT
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id INTEGER REFERENCES hospitals(id),
  hospital_name TEXT NOT NULL DEFAULT 'CareSphere Super Specialty Hospital',
  hospital_location TEXT NOT NULL DEFAULT 'Main Campus, Bengaluru',
  registration_number TEXT NOT NULL,
  state_medical_council TEXT NOT NULL DEFAULT 'National Medical Commission (NMC)',
  department_id INTEGER REFERENCES departments(id),
  specialization TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 1,
  consultation_fee INTEGER NOT NULL DEFAULT 500,
  teleconsultation_available INTEGER DEFAULT 1,
  teleconsultation_fee INTEGER DEFAULT 500,
  bio TEXT,
  avatar_url TEXT,
  document_url TEXT,
  council_certificate_url TEXT,
  degree_certificate_url TEXT,
  id_proof_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'approved', 'rejected', 'suspended')),
  verification_checklist TEXT,
  verification_notes TEXT,
  verified_at DATETIME,
  verified_by INTEGER REFERENCES users(id),
  room_number TEXT DEFAULT 'Chamber 101',
  floor TEXT DEFAULT '1st Floor',
  wing TEXT DEFAULT 'Block A - Clinical Wing',
  current_presence_status TEXT DEFAULT 'in_opd' CHECK(current_presence_status IN ('in_opd', 'in_consultation', 'on_rounds', 'in_surgery', 'off_duty')),
  navigation_instructions TEXT
);

CREATE TABLE IF NOT EXISTS doctor_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0: Sunday, 1: Monday, ... 6: Saturday
  start_time TEXT NOT NULL,      -- "09:00"
  end_time TEXT NOT NULL,        -- "13:00"
  slot_duration_minutes INTEGER DEFAULT 30,
  is_active INTEGER DEFAULT 1,
  UNIQUE(doctor_id, day_of_week, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_no TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  hospital_id INTEGER REFERENCES hospitals(id),
  appointment_date TEXT NOT NULL, -- YYYY-MM-DD
  appointment_time TEXT NOT NULL, -- HH:MM
  consultation_type TEXT NOT NULL DEFAULT 'in_person' CHECK(consultation_type IN ('in_person', 'online_video')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  video_room_id TEXT,
  video_session_status TEXT DEFAULT 'scheduled' CHECK(video_session_status IN ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled')),
  meeting_link TEXT,
  prescription_url TEXT,
  patient_notes TEXT,
  doctor_notes TEXT,
  cancellation_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Crucial concurrency guard: Prevents two active appointments on the same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot 
ON appointments(doctor_id, appointment_date, appointment_time) 
WHERE status != 'cancelled';

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_key TEXT NOT NULL,
  message_key TEXT NOT NULL,
  params TEXT, -- JSON format
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospital_facilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  timing TEXT NOT NULL,
  contact_number TEXT,
  location TEXT NOT NULL,
  is_emergency_facility INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hospital_faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  question TEXT UNIQUE NOT NULL,
  answer TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 1. Digital Patient Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK(document_type IN ('lab_report', 'prescription', 'radiology_scan', 'discharge_summary', 'consultation_note', 'other')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  hospital_name TEXT,
  doctor_name TEXT,
  record_date TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_record_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_record_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  accessed_by INTEGER NOT NULL REFERENCES users(id),
  accessor_name TEXT NOT NULL,
  accessor_role TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('VIEW', 'DOWNLOAD', 'SHARE', 'REVOKE')),
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Hospital Resources Live Availability
CREATE TABLE IF NOT EXISTS hospital_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  total_capacity INTEGER DEFAULT 0,
  available_count INTEGER DEFAULT 0,
  occupied_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available',
  details_json TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Patient Ratings and Feedback
CREATE TABLE IF NOT EXISTS patient_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  hospital_id INTEGER REFERENCES hospitals(id),
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES doctor_profiles(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  review TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Medical Report Explainer History
CREATE TABLE IF NOT EXISTS ai_report_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  report_type TEXT,
  extracted_text TEXT,
  analysis_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medicine Reminders & Logs
CREATE TABLE IF NOT EXISTS medicine_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctor_profiles(id),
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing_slots TEXT NOT NULL,
  food_relation TEXT DEFAULT 'after_food',
  start_date TEXT NOT NULL,
  end_date TEXT,
  doctor_instructions TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicine_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL REFERENCES medicine_reminders(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'taken', 'skipped', 'missed')),
  logged_at DATETIME,
  notes TEXT
);

-- 6. Health Insurance Assistance
CREATE TABLE IF NOT EXISTS insurance_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  toll_free_number TEXT,
  website TEXT,
  claim_process_info TEXT,
  is_cashless_network INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS hospital_insurance_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  insurance_id INTEGER NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
  is_cashless_enabled INTEGER DEFAULT 1,
  tpa_desk_contact TEXT,
  tpa_room_location TEXT,
  notes TEXT,
  UNIQUE(hospital_id, insurance_id)
);

CREATE TABLE IF NOT EXISTS patient_insurance_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insurance_provider_id INTEGER REFERENCES insurance_providers(id),
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  policy_holder_name TEXT NOT NULL,
  tpa_id TEXT,
  sum_insured INTEGER,
  valid_until TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Hospital Indoor Navigation & Maps
CREATE TABLE IF NOT EXISTS hospital_floor_maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL,
  floor_name TEXT NOT NULL,
  svg_layout_data TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS hospital_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  floor_id INTEGER REFERENCES hospital_floor_maps(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  room_number TEXT,
  wing TEXT,
  coordinates_json TEXT,
  directions_text TEXT,
  is_wheelchair_accessible INTEGER DEFAULT 1
);

-- 8. Remote Patient Follow-Up
CREATE TABLE IF NOT EXISTS patient_followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id INTEGER REFERENCES hospitals(id),
  scheduled_date TEXT NOT NULL,
  instructions TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'reviewed', 'completed', 'cancelled')),
  patient_symptoms TEXT,
  patient_recovery_score INTEGER,
  vitals_data TEXT,
  patient_report_url TEXT,
  doctor_feedback TEXT,
  doctor_reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_shares_doctor ON medical_record_shares(doctor_id);
CREATE INDEX IF NOT EXISTS idx_hospital_resources_hospital ON hospital_resources(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medicine_reminders_patient ON medicine_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_followups_patient ON patient_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_followups_doctor ON patient_followups(doctor_id);
