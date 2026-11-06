export type Role = 'patient' | 'doctor' | 'admin' | 'hospital_admin' | 'superadmin' | 'pharmacy_staff' | 'lab_staff';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  preferred_language: string;
  created_at?: string;
  verification_status?: 'pending' | 'verified' | 'approved' | 'rejected' | 'suspended';
  hospital_id?: number;
  hospital_name?: string;
  hospital_city?: string;
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
  hospital_id?: number;
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
  teleconsultation_fee?: number;
  teleconsultation_available?: number;
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
  hospital_id?: number;
  hospital_name?: string;
  hospital_location?: string;
  specialization?: string;
  consultation_fee?: number;
  teleconsultation_fee?: number;
  consultation_type?: 'in_person' | 'online_video';
  video_room_id?: string;
  video_session_status?: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  meeting_link?: string;
  prescription_url?: string;
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

// ==========================================
// NEW FEATURE TYPES (FEATURES 1 TO 9)
// ==========================================

export interface Hospital {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  address: string;
  emergency_hotline: string;
  ambulance_number: string;
  tpa_helpdesk_number?: string;
  tpa_room_location?: string;
  email: string;
  total_beds: number;
  icu_beds: number;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface MedicalRecord {
  id: number;
  patient_id: number;
  title: string;
  document_type: 'lab_report' | 'prescription' | 'scan_imaging' | 'discharge_summary' | 'vaccination' | 'other';
  document_date: string;
  doctor_name?: string;
  hospital_name?: string;
  hospital_id?: number;
  notes?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_verified?: number;
  created_at: string;
  active_shares_count?: number;
}

export interface MedicalRecordShare {
  id: number;
  record_id: number;
  doctor_id: number;
  doctor_name?: string;
  doctor_email?: string;
  specialization?: string;
  hospital_name?: string;
  consent_given: number;
  valid_until?: string;
  created_at: string;
}

export interface MedicalRecordAccessLog {
  id: number;
  record_id: number;
  accessed_by: number;
  accessor_name?: string;
  accessor_role?: string;
  action: string;
  purpose?: string;
  timestamp: string;
}

export interface ConsultationRoom {
  id: string;
  appointment_id: number;
  doctor_id: number;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  specialization: string;
  hospital_name: string;
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  waiting_started_at?: string;
  call_started_at?: string;
  call_ended_at?: string;
  patient_joined: boolean;
  doctor_joined: boolean;
  appointment_date: string;
  appointment_time: string;
  patient_notes?: string;
  doctor_notes?: string;
  prescription_url?: string;
}

export interface PrescriptionData {
  prescription_id: string;
  appointment_id: number;
  patient_name: string;
  doctor_name: string;
  specialization: string;
  hospital_name: string;
  diagnosis: string;
  clinical_summary: string;
  medicines: PrescriptionMedicine[];
  advice: string;
  issued_at: string;
}

export interface HospitalResource {
  id: number;
  hospital_id: number;
  hospital_name: string;
  hospital_city: string;
  resource_type: 'general_beds' | 'icu_beds' | 'emergency_beds' | 'ambulances' | 'blood_bank' | 'oxygen_cylinders' | 'ventilators';
  total_capacity: number;
  available_capacity: number;
  status: 'available' | 'low' | 'critical' | 'full';
  details?: string;
  last_updated: string;
}

export interface MedicineReminder {
  id: number;
  patient_id: number;
  medicine_name: string;
  dosage: string;
  timing: 'morning' | 'afternoon' | 'evening' | 'night' | string;
  frequency: string;
  food_relation: 'before_food' | 'after_food' | 'with_food' | 'empty_stomach' | 'anytime';
  start_date: string;
  end_date?: string;
  instructions?: string;
  doctor_name?: string;
  is_active: number;
  created_at: string;
  today_status?: 'taken' | 'skipped' | 'pending';
  log_id?: number;
}

export interface MedicineLog {
  id: number;
  reminder_id: number;
  scheduled_date: string;
  taken_at?: string;
  status: 'taken' | 'skipped' | 'pending';
  notes?: string;
}

export interface InsuranceProvider {
  id: number;
  name: string;
  code: string;
  toll_free_number: string;
  support_email: string;
  claim_portal_url?: string;
  logo_url?: string;
  is_active: number;
  cashless_hospitals_count?: number;
}

export interface HospitalInsurancePartner {
  id: number;
  hospital_id: number;
  hospital_name: string;
  hospital_city: string;
  insurance_id: number;
  insurance_name: string;
  is_cashless: number;
  tpa_desk_contact?: string;
  tpa_room_location?: string;
  notes?: string;
}

export interface PatientInsurancePolicy {
  id: number;
  patient_id: number;
  insurance_provider_id?: number;
  provider_name?: string;
  policy_number: string;
  policy_holder_name: string;
  sum_insured: number;
  valid_from: string;
  valid_to: string;
  tpa_name?: string;
  card_document_url?: string;
  status: 'active' | 'expired' | 'processing';
  created_at: string;
}

export interface HospitalFloorMap {
  id: number;
  hospital_id: number;
  floor_number: number;
  floor_name: string;
  svg_map_data?: string;
  description?: string;
}

export interface HospitalLocation {
  id: number;
  hospital_id: number;
  name: string;
  location_type: 'ward' | 'icu' | 'opd' | 'pharmacy' | 'diagnostic_lab' | 'billing' | 'emergency' | 'cafeteria' | 'lift' | 'entrance' | 'helpdesk';
  floor_number: number;
  room_number?: string;
  x_coord: number;
  y_coord: number;
  is_wheelchair_accessible: number;
  instructions?: string;
}

export interface PatientFollowUp {
  id: number;
  appointment_id?: number;
  patient_id: number;
  patient_name?: string;
  patient_email?: string;
  doctor_id: number;
  doctor_name?: string;
  specialization?: string;
  hospital_name?: string;
  scheduled_date: string;
  status: 'scheduled' | 'submitted' | 'reviewed' | 'escalated';
  symptoms_reported?: string;
  recovery_rating?: number; // 1 to 10
  vitals?: {
    blood_pressure?: string;
    temperature?: string;
    pulse_rate?: string;
    heart_rate?: string;
    blood_glucose?: string;
    oxygen_saturation?: string;
  };
  patient_notes?: string;
  doctor_feedback?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface AIReportAnalysis {
  id?: number;
  patient_id?: number;
  report_title: string;
  report_type: string;
  language: string;
  biomarkers: {
    name: string;
    value: string;
    unit: string;
    normal_range: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    clinical_significance: string;
  }[];
  critical_alerts: string[];
  simplified_summary: string;
  actionable_recommendations: string[];
  disclaimer: string;
  created_at?: string;
}

export interface AnalyticsOverview {
  total_hospitals?: number;
  total_patients?: number;
  total_doctors?: number;
  approved_doctors?: number;
  pending_doctors?: number;
  total_appointments?: number;
  completed_appointments?: number;
  cancelled_appointments?: number;
  teleconsultations?: number;
  total_beds?: number;
  available_beds?: number;
  comparison?: {
    hospital_id: number;
    name: string;
    city: string;
    total_doctors: number;
    total_appointments: number;
    completed_appointments: number;
    cancelled_appointments: number;
    occupancy_rate: number;
    rating: number;
  }[];
}

// ============================================================================
// FEATURE 1: EMERGENCY SOS & EMERGENCY CONTACT SYSTEM
// ============================================================================
export interface EmergencyContact {
  id: number;
  patient_id: number;
  name: string;
  relationship: string;
  phone: string;
  is_primary: number;
  created_at: string;
}

export interface EmergencyRequest {
  id: number;
  reference_no: string;
  patient_id?: number | null;
  patient_name: string;
  contact_phone: string;
  hospital_id?: number | null;
  hospital_name?: string;
  hospital_location?: string;
  emergency_hotline?: string;
  emergency_type: 'cardiac' | 'accident_trauma' | 'breathing_distress' | 'stroke_neuro' | 'burns_fire' | 'pregnancy_delivery' | 'other' | string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  notes?: string | null;
  status: 'received' | 'acknowledged' | 'assistance_arranged' | 'resolved' | 'cancelled';
  triage_level: 'RED' | 'YELLOW' | 'GREEN';
  dispatched_service?: string | null;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FEATURE 2: DIGITAL PRESCRIPTIONS & LAB WORKFLOW
// ============================================================================
export interface PrescriptionMedicine {
  id?: number;
  prescription_id?: number;
  name?: string;
  medicine_name?: string;
  dosage: string;
  frequency?: string;
  timing?: string;
  duration?: string;
  duration_days?: number;
  instructions?: string;
  // Pharmacy matching helpers
  medicine_id?: number;
  available_in_pharmacy?: boolean;
  unit_price?: number;
  stock_quantity?: number;
}

export interface PrescriptionLabRecommendation {
  id?: number;
  prescription_id?: number;
  test_name: string;
  test_code?: string;
  instructions?: string;
  urgency: 'routine' | 'urgent' | 'stat';
  // Booking helper
  test_id?: number;
  base_price?: number;
}

export interface Prescription {
  id: number;
  prescription_number: string;
  appointment_id?: number | null;
  appointment_ref?: string | null;
  patient_id: number;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_phone?: string;
  patient_email?: string;
  doctor_id: number;
  doctor_name?: string;
  doctor_specialization?: string;
  doctor_registration_number?: string;
  doctor_council?: string;
  hospital_id: number;
  hospital_name?: string;
  hospital_location?: string;
  hospital_phone?: string;
  consultation_date: string;
  diagnosis: string;
  clinical_notes?: string;
  vitals_summary?: string;
  advice?: string;
  followup_date?: string;
  is_finalized: number;
  pdf_path?: string;
  medicines: PrescriptionMedicine[];
  lab_recommendations: PrescriptionLabRecommendation[];
  created_at: string;
  updated_at: string;
}

export interface LabTest {
  id: number;
  test_code: string;
  name: string;
  category: string;
  description: string;
  sample_type: string;
  fasting_required: number;
  preparation_instructions?: string;
  turnaround_hours: number;
  base_price: number;
  hospital_price?: number;
  is_available?: number;
  is_active: number;
}

export interface LabBooking {
  id: number;
  booking_reference: string;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  patient_email?: string;
  hospital_id: number;
  hospital_name?: string;
  hospital_location?: string;
  test_id: number;
  test_name?: string;
  test_code?: string;
  category?: string;
  sample_type?: string;
  fasting_required?: number;
  prescription_id?: number | null;
  prescription_number?: string | null;
  appointment_id?: number | null;
  booking_date: string;
  booking_time: string;
  price: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  status: 'scheduled' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  sample_collected_at?: string;
  report_uploaded_at?: string;
  report_file_path?: string;
  report_file_name?: string;
  medical_record_id?: number;
  notes?: string;
  created_at: string;
}

// ============================================================================
// FEATURE 3: ONLINE PHARMACY & MEDICINE ORDERS
// ============================================================================
export interface Pharmacy {
  id: number;
  hospital_id: number;
  hospital_name?: string;
  hospital_location?: string;
  name: string;
  license_number: string;
  location: string;
  contact_phone: string;
  email?: string;
  operating_hours: string;
  offers_delivery: number;
  delivery_fee: number;
  is_active: number;
}

export interface Medicine {
  id: number;
  name: string;
  brand_name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  manufacturer: string;
  category: string;
  prescription_required: number;
  description?: string;
  side_effects?: string;
  storage_instructions?: string;
  // Inventory fields when joined
  pharmacy_id?: number;
  batch_number?: string;
  expiry_date?: string;
  mrp_price?: number;
  selling_price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_available?: number;
}

export interface PharmacyOrderItem {
  id: number;
  order_id: number;
  medicine_id: number;
  medicine_name: string;
  strength?: string;
  dosage_form?: string;
  prescribed_dosage?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PharmacyOrder {
  id: number;
  order_number: string;
  patient_id: number;
  patient_name?: string;
  patient_email?: string;
  hospital_id: number;
  hospital_name?: string;
  pharmacy_id: number;
  pharmacy_name?: string;
  pharmacy_phone?: string;
  appointment_id?: number;
  prescription_id?: number;
  prescription_number?: string;
  fulfillment_type: 'hospital_pickup' | 'home_delivery';
  delivery_address?: string;
  contact_phone: string;
  total_items: number;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_transaction_id?: string;
  prescription_verified: number;
  verified_by?: number;
  verifier_name?: string;
  verification_notes?: string;
  status: 'pending' | 'prescription_verification' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';
  cancellation_reason?: string;
  pickup_code?: string;
  items: PharmacyOrderItem[];
  created_at: string;
  updated_at: string;
}

