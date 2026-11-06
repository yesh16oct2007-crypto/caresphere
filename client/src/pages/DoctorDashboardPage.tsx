import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Save,
  Check,
  Building2,
  Award,
  ShieldCheck,
  MapPin,
  Navigation,
  Activity,
  Compass,
  Ban,
  XCircle,
  RefreshCw,
  Video,
  Eye,
  Download,
  Send,
  Plus,
  AlertCircle,
  FlaskConical,
  Trash2,
  QrCode,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import {
  Appointment,
  MedicalRecord,
  PatientFollowUp,
  Prescription,
  LabBooking
} from '../types/index.js';
import { DoctorNavigationModal } from '../components/DoctorNavigationModal.js';
import { apiUrl } from '../services/api.js';

export const DoctorDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();

  // Active top tab
  const [activeTab, setActiveTab] = useState<'schedule' | 'prescriptions' | 'lab_reports' | 'shared_records' | 'followups'>('schedule');

  // Prescriptions State (Feature 2)
  const [doctorPrescriptions, setDoctorPrescriptions] = useState<Prescription[]>([]);
  const [createRxModalOpen, setCreateRxModalOpen] = useState(false);
  const [rxPatientId, setRxPatientId] = useState<number | ''>('');
  const [rxPatientName, setRxPatientName] = useState<string>('');
  const [rxAppointmentId, setRxAppointmentId] = useState<number | null>(null);
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxClinicalNotes, setRxClinicalNotes] = useState('');
  const [rxVitals, setRxVitals] = useState('BP: 120/80 mmHg, Pulse: 72 bpm');
  const [rxAdvice, setRxAdvice] = useState('');
  const [rxFollowupDate, setRxFollowupDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [rxMedicines, setRxMedicines] = useState<
    { medicine_name: string; dosage: string; frequency: string; timing: string; duration: string; instructions: string }[]
  >([
    { medicine_name: '', dosage: '500mg', frequency: '1-0-1', timing: 'after_food', duration: '5 Days', instructions: 'Take with warm water' }
  ]);
  const [rxLabRecommendations, setRxLabRecommendations] = useState<
    { test_name: string; test_code: string; instructions: string; urgency: 'routine' | 'urgent' | 'stat' }[]
  >([]);
  const [issuingRx, setIssuingRx] = useState(false);

  // Lab Reports State (Feature 2)
  const [hospitalLabBookings, setHospitalLabBookings] = useState<LabBooking[]>([]);

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<
    'pending' | 'verified' | 'approved' | 'rejected' | 'suspended'
  >('pending');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState('');
  const [stateCouncil, setStateCouncil] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [wing, setWing] = useState('');
  const [presenceStatus, setPresenceStatus] = useState<string>('available');
  const [navInstructions, setNavInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Presence updating state
  const [isUpdatingPresence, setIsUpdatingPresence] = useState(false);
  const [presenceSuccess, setPresenceSuccess] = useState(false);

  // Status & Note editing for appointments
  const [editingApptId, setEditingApptId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>('confirmed');
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [isSavingAppt, setIsSavingAppt] = useState(false);

  // Navigation preview modal state
  const [showNavPreview, setShowNavPreview] = useState(false);

  // Feature 1: Shared Medical Records
  const [sharedRecords, setSharedRecords] = useState<MedicalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Feature 9: Remote Follow-Ups
  const [doctorFollowups, setDoctorFollowups] = useState<PatientFollowUp[]>([]);
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [reviewingFollowup, setReviewingFollowup] = useState<PatientFollowUp | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Schedule new follow-up modal
  const [scheduleFollowupOpen, setScheduleFollowupOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [followupDate, setFollowupDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [schedulingFollowup, setSchedulingFollowup] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchSchedule = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/doctors/me/schedule'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
        setVerificationStatus(data.verification_status || 'pending');
        setHospitalName(
          data.hospital_name || user?.doctor?.hospital_name || 'CareSphere Super Specialty Hospital'
        );
        setHospitalLocation(
          data.hospital_location || user?.doctor?.hospital_location || 'Main Campus, Bengaluru'
        );
        setStateCouncil(data.state_medical_council || user?.doctor?.state_medical_council || '');
        setRoomNumber(data.room_number || user?.doctor?.room_number || 'Chamber 304');
        setFloor(data.floor || user?.doctor?.floor || 'Floor 3');
        setWing(data.wing || user?.doctor?.wing || 'North Wing');
        setPresenceStatus(
          data.current_presence_status || user?.doctor?.current_presence_status || 'available'
        );
        setNavInstructions(
          data.navigation_instructions ||
            user?.doctor?.navigation_instructions ||
            'Take Elevator B to the 3rd floor. Exit left and follow signage toward Cardiology OPD.'
        );
      }
    } catch (err) {
      console.error('Failed to load doctor schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharedRecords = async () => {
    if (!token) return;
    try {
      setLoadingRecords(true);
      const res = await fetch(apiUrl('/api/records/shared-with-me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSharedRecords(data.records || []);
      }
    } catch (err) {
      console.error('Failed to load shared records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchDoctorFollowups = async () => {
    if (!token) return;
    try {
      setLoadingFollowups(true);
      const res = await fetch(apiUrl('/api/followups/doctor-list'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorFollowups(data.followups || []);
      }
    } catch (err) {
      console.error('Failed to load doctor followups:', err);
    } finally {
      setLoadingFollowups(false);
    }
  };

  // Fetch Doctor Prescriptions
  const fetchDoctorPrescriptions = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/prescriptions/doctor-prescriptions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorPrescriptions(data.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load doctor prescriptions:', err);
    }
  };

  // Fetch Hospital Lab Bookings
  const fetchHospitalLabBookings = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/lab/hospital-bookings'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHospitalLabBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load lab bookings:', err);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchSharedRecords();
    fetchDoctorFollowups();
    fetchDoctorPrescriptions();
    fetchHospitalLabBookings();
  }, [token]);

  const handleOpenCreatePrescription = (appt?: any) => {
    if (appt) {
      setRxAppointmentId(appt.id);
      setRxPatientId(appt.patient_id);
      setRxPatientName(appt.patient_name || 'Patient');
      setRxDiagnosis(appt.patient_notes ? `Clinical evaluation for ${appt.patient_notes}` : 'Acute outpatient consultation');
    } else {
      setRxAppointmentId(null);
      setRxPatientId(appointments.length > 0 && appointments[0].patient_id ? appointments[0].patient_id : '');
      setRxPatientName(appointments.length > 0 ? (appointments[0] as any).patient_name || 'Patient' : '');
      setRxDiagnosis('');
    }
    setCreateRxModalOpen(true);
  };

  const handleAddMedicineRow = () => {
    setRxMedicines((prev) => [
      ...prev,
      { medicine_name: '', dosage: '500mg', frequency: '1-0-1', timing: 'after_food', duration: '5 Days', instructions: 'Take with warm water' }
    ]);
  };

  const handleRemoveMedicineRow = (idx: number) => {
    setRxMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMedicineRow = (idx: number, field: string, val: string) => {
    setRxMedicines((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m))
    );
  };

  const handleAddLabRecRow = () => {
    setRxLabRecommendations((prev) => [
      ...prev,
      { test_name: '', test_code: '', instructions: 'Fasting 10-12 hrs', urgency: 'routine' }
    ]);
  };

  const handleRemoveLabRecRow = (idx: number) => {
    setRxLabRecommendations((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLabRecRow = (idx: number, field: string, val: string) => {
    setRxLabRecommendations((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l))
    );
  };

  const handleSubmitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !rxPatientId || !rxDiagnosis || rxMedicines.length === 0) {
      alert('Patient ID, diagnosis, and at least one medicine are required.');
      return;
    }

    setIssuingRx(true);
    try {
      const res = await fetch(apiUrl('/api/prescriptions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: Number(rxPatientId),
          appointment_id: rxAppointmentId,
          diagnosis: rxDiagnosis,
          clinical_notes: rxClinicalNotes,
          vitals_summary: rxVitals,
          advice: rxAdvice,
          followup_date: rxFollowupDate,
          medicines: rxMedicines.filter((m) => m.medicine_name.trim()),
          lab_recommendations: rxLabRecommendations.filter((l) => l.test_name.trim())
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Prescription ${data.prescription_number} issued and finalized!`);
        setCreateRxModalOpen(false);
        fetchDoctorPrescriptions();
        fetchSchedule();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to issue prescription.');
      }
    } catch (err) {
      console.error('Prescription error:', err);
    } finally {
      setIssuingRx(false);
    }
  };

  const handleUpdatePresence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsUpdatingPresence(true);
    setPresenceSuccess(false);
    try {
      const res = await fetch(apiUrl('/api/doctors/me/presence'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          room_number: roomNumber,
          floor,
          wing,
          current_presence_status: presenceStatus,
          navigation_instructions: navInstructions
        })
      });
      if (res.ok) {
        setPresenceSuccess(true);
        showToast('Chamber presence and hospital location updated!');
        setTimeout(() => setPresenceSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update presence:', err);
    } finally {
      setIsUpdatingPresence(false);
    }
  };

  const handleUpdateStatusAndNotes = async (apptId: number) => {
    if (!token) return;
    setIsSavingAppt(true);
    try {
      const res = await fetch(apiUrl(`/api/appointments/${apptId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: editStatus,
          doctor_notes: doctorNotes
        })
      });
      if (res.ok) {
        setEditingApptId(null);
        showToast('Appointment record updated.');
        fetchSchedule();
      }
    } catch (err) {
      console.error('Failed to update appointment:', err);
    } finally {
      setIsSavingAppt(false);
    }
  };

  // Secure download shared patient record
  const handleDownloadSharedRecord = async (record: MedicalRecord) => {
    try {
      const res = await fetch(apiUrl(`/api/records/${record.id}/download`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to retrieve secure document');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = record.file_name || `patient-record-${record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Document accessed & audit logged.');
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  // Review remote follow-up
  const handleReviewFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !reviewingFollowup) return;
    try {
      setIsSubmittingFeedback(true);
      const res = await fetch(apiUrl(`/api/followups/${reviewingFollowup.id}/review`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_feedback: feedbackText
        })
      });
      if (res.ok) {
        showToast('Clinical feedback delivered to patient!');
        setReviewingFollowup(null);
        setFeedbackText('');
        fetchDoctorFollowups();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Escalate follow-up to immediate in-person appointment
  const handleEscalateFollowup = async (followupId: number) => {
    if (!token) return;
    if (!window.confirm('Escalate this case to an urgent in-person clinical appointment?')) return;
    try {
      const res = await fetch(apiUrl(`/api/followups/${followupId}/escalate`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Patient case escalated to emergency consult queue!');
        fetchDoctorFollowups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Schedule follow-up
  const handleScheduleFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPatientId) return;
    try {
      setSchedulingFollowup(true);
      const res = await fetch(apiUrl('/api/followups/schedule'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: Number(selectedPatientId),
          scheduled_date: followupDate
        })
      });
      if (res.ok) {
        showToast('Remote patient follow-up scheduled!');
        setScheduleFollowupOpen(false);
        fetchDoctorFollowups();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulingFollowup(false);
    }
  };

  // Distinct patients from appointments
  const patientList = Array.from(
    new Map(
      appointments
        .filter((a) => a.patient_id)
        .map((a) => [a.patient_id, { id: a.patient_id!, name: a.patient_name || 'Patient' }])
    ).values()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 via-teal-700 to-medblue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-teal-200">
            CareSphere Medical Faculty Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {t('doctor.welcome')}, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
            Manage your daily clinic consultations, live teleconsultation rooms, patient shared medical records, and post-discharge remote follow-ups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenCreatePrescription()}
            className="px-4 py-2.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Issue Digital Rx</span>
          </button>

          <button
            onClick={() => setScheduleFollowupOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 backdrop-blur transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>Schedule Follow-Up</span>
          </button>
        </div>
      </div>

      {/* Global Toast */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Verification Status Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Medical License & Registration:</span>
              <span className="font-mono text-teal-600 font-bold">{user?.doctor?.registration_number}</span>
            </h3>
            <p className="text-xs text-slate-500">
              State Council: <span className="font-medium text-slate-700 dark:text-slate-300">{stateCouncil || 'State Medical Council'}</span>
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Status: Verified & Active
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {appointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'prescriptions'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-500" />
          <span>Issued Prescriptions</span>
          {doctorPrescriptions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 font-bold">
              {doctorPrescriptions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('lab_reports')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'lab_reports'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-emerald-500" />
          <span>Patient Lab Reports</span>
          {hospitalLabBookings.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              {hospitalLabBookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('shared_records')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'shared_records'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Shared Medical Records</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-bold">
            {sharedRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'followups'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Remote Follow-Ups</span>
          {doctorFollowups.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              {doctorFollowups.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column (Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: CLINIC & TELECONSULT APPOINTMENTS */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Consultation Schedule ({appointments.length})
                </h3>
                <span className="text-xs text-slate-400">In-Person OPD & Encrypted Video Sessions</span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading schedule...</div>
              ) : appointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-xs text-slate-400">
                  No appointments scheduled.
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                            {appt.reference_no}
                          </span>
                          {appt.consultation_type === 'online_video' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center gap-1">
                              <Video className="w-3 h-3" /> Online Teleconsult
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> In-Person OPD
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {appt.status}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>{appt.appointment_date} at {appt.appointment_time}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-1.5 text-xs">
                          <h4 className="font-bold text-base text-slate-900 dark:text-white">
                            Patient: {appt.patient_name || 'Patient'}
                          </h4>
                          <div className="text-slate-500 space-x-3">
                            {appt.patient_gender && <span>Gender: {appt.patient_gender}</span>}
                            {appt.patient_blood_group && (
                              <span className="text-red-500 font-bold">Blood Group: {appt.patient_blood_group}</span>
                            )}
                          </div>
                          {appt.patient_notes && (
                            <p className="text-slate-700 dark:text-slate-300 italic pt-1">
                              <strong>Chief Complaint:</strong> "{appt.patient_notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap sm:flex-col items-end justify-center gap-2 shrink-0">
                          {appt.consultation_type === 'online_video' && appt.video_room_id && (
                            <Link
                              to={`/consultations/room/${appt.video_room_id}`}
                              className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5"
                            >
                              <Video className="w-4 h-4" />
                              <span>Join Video Call</span>
                            </Link>
                          )}

                          <button
                            onClick={() => handleOpenCreatePrescription(appt)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Issue Digital Rx</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingApptId(appt.id);
                              setEditStatus(appt.status);
                              setDoctorNotes(appt.doctor_notes || '');
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium"
                          >
                            Update Notes / Status
                          </button>
                        </div>
                      </div>

                      {/* Doctor Editing Notes Drawer */}
                      {editingApptId === appt.id && (
                        <div className="p-4 bg-teal-50/60 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-3">
                          <div className="flex gap-2 items-center">
                            <label className="text-xs font-bold text-teal-900 dark:text-teal-200">
                              Update Status:
                            </label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-teal-900 dark:text-teal-200 mb-1">
                              Prescription / Clinical Notes:
                            </label>
                            <textarea
                              rows={2}
                              value={doctorNotes}
                              onChange={(e) => setDoctorNotes(e.target.value)}
                              placeholder="Clinical advice, prescribed medicines..."
                              className="w-full text-xs p-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingApptId(null)}
                              className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={isSavingAppt}
                              onClick={() => handleUpdateStatusAndNotes(appt.id)}
                              className="px-4 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1 shadow"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Record</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ISSUED DIGITAL PRESCRIPTIONS (FEATURE 2) */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Issued Digital Prescriptions ({doctorPrescriptions.length})
                  </h3>
                  <span className="text-xs text-slate-400">Official finalized medical prescriptions with digital seal</span>
                </div>
                <button
                  onClick={() => handleOpenCreatePrescription()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Issue New Prescription</span>
                </button>
              </div>

              {doctorPrescriptions.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-xs text-slate-400">
                  No prescriptions issued yet. Click "Issue New Prescription" or prescribe from an active consultation.
                </div>
              ) : (
                <div className="space-y-4">
                  {doctorPrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                            {rx.prescription_number}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            Patient: {rx.patient_name || 'Patient'}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Date: <span className="font-semibold">{rx.consultation_date}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 space-y-1">
                        <div><strong className="text-slate-900 dark:text-white">Diagnosis:</strong> {rx.diagnosis}</div>
                        {rx.vitals_summary && <div className="text-slate-500"><strong>Vitals:</strong> {rx.vitals_summary}</div>}
                      </div>

                      {/* Prescribed Medicines */}
                      <div>
                        <div className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider mb-1.5">
                          Prescribed Medicines ({rx.medicines?.length || 0}):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {rx.medicines?.map((m: any, mIdx: number) => (
                            <div key={mIdx} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                              <div className="font-bold text-slate-900 dark:text-white">{m.medicine_name} ({m.dosage})</div>
                              <div className="text-slate-500 text-[11px]">{m.frequency} • {m.timing?.replace('_', ' ')} • {m.duration}</div>
                              {m.instructions && <div className="text-teal-600 dark:text-teal-400 text-[10px] italic">"{m.instructions}"</div>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Lab Tests */}
                      {rx.lab_recommendations && rx.lab_recommendations.length > 0 && (
                        <div>
                          <div className="font-extrabold uppercase text-[10px] text-amber-600 tracking-wider mb-1">
                            Recommended Lab Investigations:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {rx.lab_recommendations.map((lab: any, lIdx: number) => (
                              <span key={lIdx} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-semibold text-[11px]">
                                {lab.test_name} ({lab.urgency})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                        <a
                          href={`/api/prescriptions/${rx.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span>Download Signed PDF</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PATIENT LAB REPORTS (FEATURE 2) */}
          {activeTab === 'lab_reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Patient Pathology & Diagnostic Reports ({hospitalLabBookings.length})
                  </h3>
                  <span className="text-xs text-slate-400">Real-time status of diagnostic investigations</span>
                </div>
              </div>

              {hospitalLabBookings.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-xs text-slate-400">
                  No patient laboratory bookings found.
                </div>
              ) : (
                <div className="space-y-3">
                  {hospitalLabBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-600">{b.booking_reference}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            b.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                          {b.test_name}
                        </div>
                        <div className="text-slate-500">
                          Patient: {b.patient_name || 'Patient'} • Scheduled: {b.booking_date} at {b.booking_time}
                        </div>
                      </div>

                      {b.status === 'completed' && (
                        <a
                          href={`/api/lab/bookings/${b.id}/report`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View Lab Report</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PATIENT SHARED MEDICAL RECORDS (FEATURE 1) */}
          {activeTab === 'shared_records' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Authorized Patient Medical Records ({sharedRecords.length})
                </h3>
                <span className="text-xs text-slate-400">Explicit Patient Consent Granted</span>
              </div>

              {loadingRecords ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading records...</div>
              ) : sharedRecords.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-xs text-slate-400">
                  No patient documents currently shared with you.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                            {rec.document_type.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(rec.document_date || (rec as any).record_date || rec.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                          {rec.title}
                        </h4>

                        <div className="text-xs text-slate-500 space-y-1 mb-4">
                          {rec.hospital_name && <p>Hospital: {rec.hospital_name}</p>}
                          {rec.notes && <p className="italic">"{rec.notes}"</p>}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-semibold">Consent Valid</span>
                        <button
                          onClick={() => handleDownloadSharedRecord(rec)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View & Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REMOTE PATIENT FOLLOW-UPS (FEATURE 9) */}
          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Post-Care Patient Recovery Tracker ({doctorFollowups.length})
                </h3>
                <span className="text-xs text-slate-400">Review symptoms & report vitals</span>
              </div>

              {loadingFollowups ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading follow-ups...</div>
              ) : doctorFollowups.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-xs text-slate-400">
                  No remote patient follow-ups assigned yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {doctorFollowups.map((fu) => (
                    <div
                      key={fu.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            Patient: {fu.patient_name || 'Patient'}
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Target Follow-Up Date: {fu.scheduled_date}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            fu.status === 'reviewed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : fu.status === 'submitted'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                              : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                          }`}
                        >
                          {fu.status}
                        </span>
                      </div>

                      {fu.symptoms_reported ? (
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl text-xs space-y-2">
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Reported Symptoms:
                            </span>{' '}
                            <span className="text-slate-600 dark:text-slate-400">{fu.symptoms_reported}</span>
                          </div>

                          {fu.recovery_rating && (
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Recovery Score:
                              </span>{' '}
                              <span className="font-bold text-teal-600">{fu.recovery_rating} / 10</span>
                            </div>
                          )}

                          {fu.vitals && (
                            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                              <div>
                                <span className="text-slate-400 block">BP:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {fu.vitals.blood_pressure || '--'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Heart Rate:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {fu.vitals.heart_rate || '--'} bpm
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Temp:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {fu.vitals.temperature || '--'} °F
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">SpO2:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {fu.vitals.oxygen_saturation || '--'}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Awaiting patient health update submission.
                        </p>
                      )}

                      {fu.doctor_feedback && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                            Your Provided Clinical Feedback:
                          </span>
                          <p className="text-slate-700 dark:text-slate-200 italic">"{fu.doctor_feedback}"</p>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEscalateFollowup(fu.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs font-semibold transition-colors"
                        >
                          Escalate to In-Person
                        </button>
                        <button
                          onClick={() => {
                            setReviewingFollowup(fu);
                            setFeedbackText(fu.doctor_feedback || '');
                          }}
                          className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow transition-all"
                        >
                          {fu.doctor_feedback ? 'Edit Feedback' : 'Provide Clinical Advice'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Presence & Hospital Location Config */}
        <div className="space-y-6">
          {/* Chamber Presence & Live Status */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                <span>Hospital Presence</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                Live Sensor Sync
              </span>
            </div>

            <form onSubmit={handleUpdatePresence} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">
                  Current Presence Status
                </label>
                <select
                  value={presenceStatus}
                  onChange={(e) => setPresenceStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                >
                  <option value="available">Available in Chamber</option>
                  <option value="in_opd">Conducting OPD Consultations</option>
                  <option value="in_consultation">In Consultation with Patient</option>
                  <option value="on_rounds">On Inpatient Ward Rounds</option>
                  <option value="in_surgery">In Operation Theatre (OT)</option>
                  <option value="off_duty">Off Duty / Clinic Closed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">
                    Chamber / Room
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">
                  Turn-by-Turn Wayfinding Signage
                </label>
                <textarea
                  rows={2}
                  value={navInstructions}
                  onChange={(e) => setNavInstructions(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNavPreview(true)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs"
                >
                  Preview GPS
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPresence}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs shadow disabled:opacity-50"
                >
                  {isUpdatingPresence ? 'Updating...' : 'Publish Presence'}
                </button>
              </div>
            </form>
          </div>

          {/* Practitioner Profile summary */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 text-xs shadow-xs">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Practitioner Credentials</span>
            </h4>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <p>
                <strong>Affiliation:</strong> {hospitalName} ({hospitalLocation})
              </p>
              <p>
                <strong>Specialization:</strong> {user?.doctor?.specialization}
              </p>
              <p>
                <strong>Consultation Fee:</strong> ₹{user?.doctor?.consultation_fee} (In-person) / ₹
                {user?.doctor?.teleconsultation_fee || user?.doctor?.consultation_fee} (Online Video)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Review Follow-Up Modal */}
      {reviewingFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Clinical Review for {reviewingFollowup.patient_name || 'Patient'}
            </h3>
            <p className="text-xs text-slate-500">
              Reported Symptoms: "{reviewingFollowup.symptoms_reported || 'Recovery evaluation'}"
            </p>

            <form onSubmit={handleReviewFollowupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Doctor Clinical Advice & Reassurance *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Your vitals and recovery look positive. Continue current antibiotics for 2 more days..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingFollowup(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {isSubmittingFeedback ? 'Sending...' : 'Transmit Clinical Advice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Follow-Up Modal */}
      {scheduleFollowupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Schedule Patient Remote Follow-Up
            </h3>

            <form onSubmit={handleScheduleFollowupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Select Patient *
                </label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                >
                  <option value="">-- Choose Patient --</option>
                  {patientList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Patient ID: #{p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Target Review Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleFollowupOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingFollowup}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {schedulingFollowup ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Digital Prescription Modal (Feature 2) */}
      {createRxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-blue-500/30 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Issue Certified Digital Prescription
                </h3>
              </div>
              <button
                onClick={() => setCreateRxModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrescription} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Patient Name / ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={rxPatientName}
                    onChange={(e) => setRxPatientName(e.target.value)}
                    placeholder="Patient Name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Consultation Date *
                  </label>
                  <input
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Essential Hypertension (Stage 1), Type 2 Diabetes, Acute Bronchitis..."
                  value={rxDiagnosis}
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Recorded Patient Vitals
                  </label>
                  <input
                    type="text"
                    placeholder="BP, Pulse, SpO2, Temperature..."
                    value={rxVitals}
                    onChange={(e) => setRxVitals(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Recommended Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={rxFollowupDate}
                    onChange={(e) => setRxFollowupDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Prescribed Medicines (Dynamic rows) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-[11px] text-blue-900 dark:text-blue-200 tracking-wider">
                    Prescribed Medicines ({rxMedicines.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rxMedicines.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Medicine Name (e.g. Telma 40, Pan 40)"
                          value={m.medicine_name}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'medicine_name', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 40mg)"
                          value={m.dosage}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'dosage', e.target.value)}
                          className="w-24 px-2 py-1.5 rounded-lg border text-xs"
                        />
                        {rxMedicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Frequency (1-0-1)"
                          value={m.frequency}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'frequency', e.target.value)}
                          className="px-2 py-1 rounded border text-xs"
                        />
                        <select
                          value={m.timing}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'timing', e.target.value)}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          <option value="after_food">After Food</option>
                          <option value="before_food">Before Food</option>
                          <option value="with_food">With Food</option>
                          <option value="bedtime">At Bedtime</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Duration (e.g. 14 Days)"
                          value={m.duration}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'duration', e.target.value)}
                          className="px-2 py-1 rounded border text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Lab Tests (Dynamic rows) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-[11px] text-amber-900 dark:text-amber-200 tracking-wider">
                    Recommended Lab Tests ({rxLabRecommendations.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLabRecRow}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Recommend Lab Test</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {rxLabRecommendations.map((lab, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex gap-2">
                      <input
                        type="text"
                        placeholder="Test Name (e.g. Lipid Profile, HbA1c, ECG)"
                        value={lab.test_name}
                        onChange={(e) => handleUpdateLabRecRow(idx, 'test_name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs"
                      />
                      <select
                        value={lab.urgency}
                        onChange={(e) => handleUpdateLabRecRow(idx, 'urgency', e.target.value)}
                        className="w-28 px-2 py-1.5 rounded-lg border text-xs"
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveLabRecRow(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  General Dietary Advice & Lifestyle Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Low sodium DASH diet, hydrate adequately, 30 min daily walking..."
                  value={rxAdvice}
                  onChange={(e) => setRxAdvice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateRxModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuingRx}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>{issuingRx ? 'Finalizing Prescription...' : 'Finalize & Sign Clinical Prescription'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hospital Navigation Preview Modal */}
      {showNavPreview && (
        <DoctorNavigationModal
          doctor={{
            name: user?.name || 'Dr. Specialist',
            specialization: user?.doctor?.specialization || 'Clinical Specialist',
            department_name: 'Medical Department',
            hospital_name: hospitalName,
            hospital_location: hospitalLocation,
            room_number: roomNumber,
            floor,
            wing,
            current_presence_status: presenceStatus,
            navigation_instructions: navInstructions
          }}
          onClose={() => setShowNavPreview(false)}
        />
      )}
    </div>
  );
};
