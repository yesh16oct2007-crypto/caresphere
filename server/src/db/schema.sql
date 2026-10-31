-- CareSphere Database Schema
-- Compatible with SQLite and PostgreSQL (via portable types)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin')),
  preferred_language TEXT NOT NULL DEFAULT 'en',
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
  hospital_name TEXT NOT NULL DEFAULT 'CareSphere Super Specialty Hospital',
  hospital_location TEXT NOT NULL DEFAULT 'Main Campus, Bengaluru',
  registration_number TEXT NOT NULL,
  state_medical_council TEXT NOT NULL DEFAULT 'National Medical Commission (NMC)',
  department_id INTEGER REFERENCES departments(id),
  specialization TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 1,
  consultation_fee INTEGER NOT NULL DEFAULT 500,
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
  appointment_date TEXT NOT NULL, -- YYYY-MM-DD
  appointment_time TEXT NOT NULL, -- HH:MM
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
