export type Role = 'patient' | 'doctor' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  preferred_language: string;
  created_at?: string;
  verification_status?: 'pending' | 'verified' | 'approved' | 'rejected' | 'suspended';
  doctor?: DoctorProfile;
  patient?: PatientProfile;
}

export interface PatientProfile {
  id: number;
  user_id: number;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
  medical_history_summary?: string;
}

export interface DoctorProfile {
  id: number;
  doctor_id?: number;
  user_id: number;
  name?: string;
  email?: string;
  phone?: string;
  hospital_name?: string;
  hospital_location?: string;
  registration_number: string;
  state_medical_council?: string;
  department_id: number;
  department_name?: string;
  department_code?: string;
  department_floor?: string;
  specialization: string;
  qualifications: string;
  experience_years: number;
  consultation_fee: number;
  bio?: string;
  avatar_url?: string;
  document_url?: string;
  council_certificate_url?: string;
  degree_certificate_url?: string;
  id_proof_url?: string;
  verification_status: 'pending' | 'verified' | 'approved' | 'rejected' | 'suspended';
  verification_checklist?: string;
  verification_notes?: string;
  verified_at?: string;
  room_number?: string;
  floor?: string;
  wing?: string;
  current_presence_status?: 'available' | 'in_opd' | 'in_consultation' | 'on_rounds' | 'in_surgery' | 'off_duty' | string;
  navigation_instructions?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  icon: string;
  head_of_department: string;
  phone_extension: string;
  floor: string;
  approved_doctors_count?: number;
}

export interface AppointmentSlot {
  time: string;
  isAvailable: boolean;
}

export interface Appointment {
  id: number;
  reference_no: string;
  patient_id?: number;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  patient_language?: string;
  patient_gender?: string;
  patient_blood_group?: string;
  patient_dob?: string;
  patient_history?: string;
  doctor_id?: number;
  doctor_name?: string;
  hospital_name?: string;
  hospital_location?: string;
  specialization?: string;
  consultation_fee?: number;
  department_name?: string;
  department_floor?: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  patient_notes?: string;
  doctor_notes?: string;
  cancellation_reason?: string;
  room_number?: string;
  floor?: string;
  wing?: string;
  current_presence_status?: string;
  navigation_instructions?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title_key: string;
  message_key: string;
  params?: string;
  type: 'info' | 'appointment' | 'alert' | 'success';
  is_read: number;
  created_at: string;
}

export interface Facility {
  id: number;
  name: string;
  category: string;
  description: string;
  timing: string;
  contact_number: string;
  location: string;
  is_emergency_facility: number;
}

export interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}
