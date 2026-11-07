import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Building2,
  Stethoscope,
  Plus,
  ShieldCheck,
  Globe,
  MapPin,
  Navigation,
  Video,
  Pill,
  HeartPulse,
  FileText,
  Activity,
  Check,
  X,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Download,
  AlertTriangle,
  FlaskConical,
  ShoppingBag,
  ShieldAlert,
  CreditCard,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import {
  Appointment,
  MedicineReminder,
  MedicineLog,
  PatientFollowUp,
  Prescription,
  LabBooking,
  PharmacyOrder,
  Pharmacy
} from '../types/index.js';
import { DoctorNavigationModal } from '../components/DoctorNavigationModal.js';
import { EmergencySOSModal } from '../components/EmergencySOSModal.js';
import { apiUrl } from '../services/api.js';

export const PatientDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Navigation tab state
  const [dashboardTab, setDashboardTab] = useState<'appointments' | 'prescriptions' | 'lab' | 'pharmacy' | 'medicines' | 'followups'>('appointments');
  const [activeApptTab, setActiveApptTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sosModalOpen, setSosModalOpen] = useState(false);

  // Feature 1, 2, 3 Data State
  const [myPrescriptions, setMyPrescriptions] = useState<Prescription[]>([]);
  const [myLabBookings, setMyLabBookings] = useState<LabBooking[]>([]);
  const [myPharmacyOrders, setMyPharmacyOrders] = useState<PharmacyOrder[]>([]);
  const [hospitalPharmacy, setHospitalPharmacy] = useState<Pharmacy | null>(null);

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [navigatingDoc, setNavigatingDoc] = useState<any | null>(null);

  // Cancellation & Reschedule modals
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Medicine Reminders State (Feature 6)
  const [medicineSchedule, setMedicineSchedule] = useState<{
    morning: MedicineReminder[];
    afternoon: MedicineReminder[];
    evening: MedicineReminder[];
    night: MedicineReminder[];
  }>({ morning: [], afternoon: [], evening: [], night: [] });
  const [adherenceRate, setAdherenceRate] = useState<number>(100);
  const [addMedModalOpen, setAddMedModalOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('500mg');
  const [medTiming, setMedTiming] = useState('morning');
  const [medFood, setMedFood] = useState('after_food');
  const [medInstructions, setMedInstructions] = useState('');
  const [savingMed, setSavingMed] = useState(false);

  // Remote Follow-Up State (Feature 9)
  const [followups, setFollowups] = useState<PatientFollowUp[]>([]);
  const [submittingFollowup, setSubmittingFollowup] = useState<PatientFollowUp | null>(null);
  const [recoveryRating, setRecoveryRating] = useState<number>(8);
  const [symptomsReported, setSymptomsReported] = useState('');
  const [vitalBp, setVitalBp] = useState('120/80');
  const [vitalHr, setVitalHr] = useState('74');
  const [vitalTemp, setVitalTemp] = useState('98.4');
  const [vitalSpo2, setVitalSpo2] = useState('99');
  const [submittingVitals, setSubmittingVitals] = useState(false);

  // Success / error banner
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Fetch Appointments
  const fetchAppointments = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/appointments/my'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Medicine Reminders & Today Schedule
  const fetchMedicines = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/medicines/today'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMedicineSchedule(
          data.schedule || { morning: [], afternoon: [], evening: [], night: [] }
        );
        setAdherenceRate(data.adherence_rate !== undefined ? data.adherence_rate : 100);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    }
  };

  // Fetch Remote Follow-Ups
  const fetchFollowups = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/followups/my'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowups(data.followups || []);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    }
  };

  // Fetch Prescriptions (Feature 2)
  const fetchPrescriptions = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/prescriptions/my-prescriptions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyPrescriptions(data.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    }
  };

  // Fetch Lab Bookings (Feature 2)
  const fetchLabBookings = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/lab/my-bookings'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyLabBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load lab bookings:', err);
    }
  };

  // Fetch Pharmacy Orders & Hospital Pharmacy Info (Feature 3)
  const fetchPharmacyData = async () => {
    if (!token) return;
    try {
      const [ordRes, pharmRes] = await Promise.all([
        fetch(apiUrl('/api/pharmacy/my-orders'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/api/pharmacy/hospital-pharmacy'), { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setMyPharmacyOrders(ordData.orders || []);
      }
      if (pharmRes.ok) {
        const pharmData = await pharmRes.json();
        setHospitalPharmacy(pharmData.pharmacy || null);
      }
    } catch (err) {
      console.error('Failed to load pharmacy data:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchMedicines();
    fetchFollowups();
    fetchPrescriptions();
    fetchLabBookings();
    fetchPharmacyData();
  }, [token]);

  // Log dose as taken or skipped
  const handleLogMedicine = async (reminderId: number, status: 'taken' | 'skipped') => {
    if (!token) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(apiUrl('/api/medicines/log'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reminder_id: reminderId,
          scheduled_date: today,
          status
        })
      });
      if (res.ok) {
        showToast(status === 'taken' ? 'Dose recorded as taken!' : 'Dose marked as skipped.');
        fetchMedicines();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new medicine reminder
  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !medName.trim()) return;
    try {
      setSavingMed(true);
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(apiUrl('/api/medicines/reminders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          medicine_name: medName,
          dosage: medDosage,
          timing: medTiming,
          frequency: 'daily',
          food_relation: medFood,
          start_date: today,
          instructions: medInstructions
        })
      });
      if (res.ok) {
        showToast('Medicine schedule added successfully!');
        setAddMedModalOpen(false);
        setMedName('');
        setMedInstructions('');
        fetchMedicines();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMed(false);
    }
  };

  // Submit Remote Follow-up Vitals
  const handleSubmitFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !submittingFollowup) return;
    try {
      setSubmittingVitals(true);
      const res = await fetch(apiUrl(`/api/followups/${submittingFollowup.id}/submit`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symptoms_reported: symptomsReported,
          recovery_rating: recoveryRating,
          vitals: {
            blood_pressure: vitalBp,
            heart_rate: vitalHr,
            temperature: vitalTemp,
            oxygen_saturation: vitalSpo2
          }
        })
      });
      if (res.ok) {
        showToast('Clinical health update submitted to your treating doctor!');
        setSubmittingFollowup(null);
        fetchFollowups();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingVitals(false);
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async () => {
    if (!cancellingAppt || !token) return;
    setIsCancelling(true);
    try {
      const res = await fetch(apiUrl(`/api/appointments/${cancellingAppt.id}/cancel`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.ok) {
        setCancellingAppt(null);
        setCancelReason('');
        showToast('Appointment cancelled successfully.');
        fetchAppointments();
      }
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  // Reschedule Appointment
  const handleRescheduleAppointment = async () => {
    if (!reschedulingAppt || !token || !newDate || !newTime) return;
    setIsRescheduling(true);
    setRescheduleError(null);
    try {
      const res = await fetch(apiUrl(`/api/appointments/${reschedulingAppt.id}/reschedule`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_date: newDate, new_time: newTime })
      });
      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || 'Failed to reschedule.');
        return;
      }
      setReschedulingAppt(null);
      showToast('Appointment rescheduled.');
      fetchAppointments();
    } catch (err) {
      console.error('Failed to reschedule:', err);
      setRescheduleError('Network error. Please try again.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = appointments.filter(
    (a) => a.status !== 'cancelled' && a.status !== 'completed' && a.appointment_date >= todayStr
  );
  const pastAppointments = appointments.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled' || a.appointment_date < todayStr
  );

  // Directly load prescription medicines into hospital pharmacy cart & navigate
  const handleOrderFromPrescription = (rx: Prescription) => {
    sessionStorage.setItem('pending_rx_order', JSON.stringify({
      prescription_id: rx.id,
      prescription_number: rx.prescription_number,
      hospital_id: rx.hospital_id,
      hospital_name: rx.hospital_name,
      doctor_name: rx.doctor_name,
      medicines: rx.medicines || []
    }));
    navigate(`/pharmacy?prescription_id=${rx.id}&hospital_id=${rx.hospital_id || ''}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Personalized Welcome Header */}
      <div className="bg-gradient-to-r from-[#123B5D] via-[#144167] to-[#0D9488] rounded-3xl p-6 sm:p-8 text-white shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-teal-200">
            CareSphere Patient Command Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {t('patient.welcome')}, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
            Track appointments, online video consultations, digital prescriptions, lab reports, and pharmacy orders in your preferred language.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setSosModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs flex items-center gap-2 shadow-glow-sos transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>EMERGENCY SOS</span>
          </button>

          <Link
            to="/teleconsult"
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-2 backdrop-blur transition-all border border-white/20"
          >
            <Video className="w-4 h-4 text-teal-300" />
            <span>Online Teleconsult</span>
          </Link>

          <Link
            to="/book"
            className="px-4 py-2.5 rounded-2xl bg-white text-[#123B5D] hover:bg-teal-50 font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 text-[#0D9488]" />
            <span>{t('patient.book_new')}</span>
          </Link>
        </div>
      </div>

      {/* Global Toast */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setDashboardTab('appointments')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'appointments'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#0D9488]" />
          <span>{t('dashboard_tabs.appointments')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">
            {upcomingAppointments.length}
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('prescriptions')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'prescriptions'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4 text-[#38BDF8]" />
          <span>{t('dashboard_tabs.prescriptions')}</span>
          {myPrescriptions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-bold">
              {myPrescriptions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setDashboardTab('lab')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'lab'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-emerald-400" />
          <span>{t('dashboard_tabs.lab_reports')}</span>
          {myLabBookings.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              {myLabBookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setDashboardTab('pharmacy')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'pharmacy'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-sky-400" />
          <span>{t('dashboard_tabs.pharmacy_orders')}</span>
          {myPharmacyOrders.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-bold">
              {myPharmacyOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setDashboardTab('medicines')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'medicines'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Pill className="w-4 h-4 text-teal-400" />
          <span>{t('dashboard_tabs.reminders')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
            {adherenceRate}%
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('followups')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'followups'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Activity className="w-4 h-4 text-rose-400" />
          <span>{t('dashboard_tabs.followups')}</span>
          {followups.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-bold">
              {followups.length}
            </span>
          )}
        </button>

        <Link
          to="/records"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors ml-auto whitespace-nowrap"
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Vault</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area (Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: APPOINTMENTS & TELECONSULT */}
          {dashboardTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveApptTab('upcoming')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeApptTab === 'upcoming'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Upcoming ({upcomingAppointments.length})
                </button>
                <button
                  onClick={() => setActiveApptTab('past')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeApptTab === 'past'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Past & Completed ({pastAppointments.length})
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading appointments...</div>
              ) : (activeApptTab === 'upcoming' ? upcomingAppointments : pastAppointments).length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeApptTab === 'upcoming' ? t('patient.no_upcoming') : t('patient.no_history')}
                  </p>
                  {activeApptTab === 'upcoming' && (
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Link
                        to="/book"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs shadow hover:bg-teal-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Book In-Person Visit</span>
                      </Link>
                      <Link
                        to="/teleconsult"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-medblue-600 text-white font-semibold text-xs shadow hover:bg-medblue-700"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Book Online Teleconsult</span>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {(activeApptTab === 'upcoming' ? upcomingAppointments : pastAppointments).map((appt) => (
                    <div
                      key={appt.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                            {appt.reference_no}
                          </span>
                          {appt.consultation_type === 'online_video' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center gap-1">
                              <Video className="w-3 h-3" /> Online Video Teleconsult
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
                        <div className="space-y-1 text-xs">
                          <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4 text-teal-600" />
                            <span>{appt.doctor_name}</span>
                          </h4>
                          <p className="text-teal-600 dark:text-teal-400 font-medium">
                            {appt.specialization} • {appt.department_name}
                          </p>
                          <p className="text-slate-500">
                            {appt.hospital_name || 'CareSphere Hospital'} ({appt.hospital_location || 'Bengaluru'})
                          </p>
                          {appt.patient_notes && (
                            <p className="text-slate-600 dark:text-slate-300 italic pt-1">
                              Reason: "{appt.patient_notes}"
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap sm:flex-col items-end justify-center gap-2 shrink-0">
                          {appt.consultation_type === 'online_video' && appt.video_room_id && (
                            <Link
                              to={`/consultations/room/${appt.video_room_id}`}
                              className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Video Room</span>
                            </Link>
                          )}

                          <button
                            onClick={() => setSosModalOpen(true)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-[11px] font-bold flex items-center gap-1 border border-red-200 dark:border-red-800"
                            title="Direct Hospital Emergency Assistance"
                          >
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            <span>Emergency SOS</span>
                          </button>

                          {appt.status === 'confirmed' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setReschedulingAppt(appt);
                                  setNewDate(appt.appointment_date);
                                  setNewTime(appt.appointment_time);
                                }}
                                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => setCancellingAppt(appt)}
                                className="px-3 py-1 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: MY PRESCRIPTIONS (FEATURE 2) */}
          {dashboardTab === 'prescriptions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {t('prescriptions.title')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('prescriptions.subtitle')}
                  </p>
                </div>
                {myPrescriptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOrderFromPrescription(myPrescriptions[0])}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#123B5D] to-[#0D9488] hover:from-[#0e304d] hover:to-[#0f766e] text-white font-bold text-xs flex items-center gap-1.5 shadow-subtle transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-teal-200" />
                    <span>{t('prescriptions.order_prescribed_btn')}</span>
                  </button>
                ) : (
                  <Link
                    to="/pharmacy"
                    className="px-3.5 py-2 rounded-xl bg-[#123B5D] hover:bg-[#0D9488] text-white font-bold text-xs flex items-center gap-1.5 shadow-subtle transition-all"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{t('prescriptions.order_online_btn')}</span>
                  </Link>
                )}
              </div>

              {myPrescriptions.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('prescriptions.no_prescriptions')}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {myPrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg">
                            {rx.prescription_number}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                            {t('prescriptions.finalized_badge')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>{t('prescriptions.consultation_date')} {rx.consultation_date}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            Dr. {rx.doctor_name}
                          </div>
                          <div className="text-teal-600 dark:text-teal-400">
                            {rx.doctor_specialization} (Reg: {rx.doctor_registration_number || 'NMC-VERIFIED'})
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {rx.hospital_name}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                          <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                            {t('prescriptions.diagnosis_title')}
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">
                            {rx.diagnosis}
                          </p>
                          {rx.vitals_summary && (
                            <div className="text-[11px] text-slate-500 mt-1">
                              {t('prescriptions.vitals_label')} {rx.vitals_summary}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prescribed Medicines Table */}
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                          {t('prescriptions.prescribed_meds_title')} ({rx.medicines?.length || 0})
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                                <th className="p-2.5">{t('prescriptions.table_med_name')}</th>
                                <th className="p-2.5">{t('prescriptions.table_dosage')}</th>
                                <th className="p-2.5">{t('prescriptions.table_frequency')}</th>
                                <th className="p-2.5">{t('prescriptions.table_timing')}</th>
                                <th className="p-2.5">{t('prescriptions.table_duration')}</th>
                                <th className="p-2.5">{t('prescriptions.table_instructions')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {rx.medicines?.map((m: any, mIdx: number) => (
                                <tr key={mIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                  <td className="p-2.5 font-bold text-slate-900 dark:text-white">{m.medicine_name}</td>
                                  <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">{m.dosage}</td>
                                  <td className="p-2.5">{m.frequency}</td>
                                  <td className="p-2.5 capitalize">{m.timing?.replace('_', ' ') || t('prescriptions.after_food')}</td>
                                  <td className="p-2.5 font-semibold text-teal-600">{m.duration}</td>
                                  <td className="p-2.5 text-slate-500 italic">{m.instructions || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recommended Lab Tests */}
                      {rx.lab_recommendations && rx.lab_recommendations.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs space-y-1.5">
                          <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <FlaskConical className="w-4 h-4 text-amber-600" />
                            <span>Recommended Diagnostic Investigations:</span>
                          </div>
                          <div className="space-y-1">
                            {rx.lab_recommendations.map((lab: any, lIdx: number) => (
                              <div key={lIdx} className="text-amber-800 dark:text-amber-300 flex items-center justify-between">
                                <span>• {lab.test_name} {lab.instructions ? `(${lab.instructions})` : ''}</span>
                                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900">
                                  {lab.urgency}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Doctor Advice & Followup */}
                      {rx.advice && (
                        <div className="text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-900 dark:text-white">Doctor Advice: </span>
                          {rx.advice}
                          {rx.followup_date && (
                            <span className="block pt-1 font-semibold text-teal-600">
                              Follow-up Date: {rx.followup_date}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <a
                          href={`/api/prescriptions/${rx.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t('prescriptions.download_pdf_btn')}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOrderFromPrescription(rx)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#123B5D] to-[#0D9488] hover:from-[#0e304d] hover:to-[#0f766e] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#123B5D]/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-teal-200" />
                          <span>{t('prescriptions.order_via_hospital_pharmacy')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: LAB BOOKINGS & REPORTS (FEATURE 2) */}
          {dashboardTab === 'lab' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {t('lab.title')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('lab.subtitle')}
                  </p>
                </div>
                <Link
                  to="/lab"
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>{t('lab.book_test_btn')}</span>
                </Link>
              </div>

              {myLabBookings.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <FlaskConical className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No diagnostic tests booked. Schedule routine or specialized blood, urine, or imaging investigations.
                  </p>
                  <Link
                    to="/lab"
                    className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-teal-600 text-white font-bold text-xs shadow hover:bg-teal-700"
                  >
                    <span>Browse Lab Catalogue</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {myLabBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg">
                            {b.booking_reference}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              b.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                                : b.status === 'processing'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {b.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Scheduled: <span className="font-bold text-slate-800 dark:text-slate-200">{b.booking_date} at {b.booking_time}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {b.test_name}
                          </div>
                          <div className="text-slate-500">
                            Category: {b.category} • Sample: {b.sample_type} • Hospital: {b.hospital_name}
                          </div>
                          {b.fasting_required === 1 && (
                            <div className="text-amber-600 font-bold text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Overnight 8-12 hours fasting required before test</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-sm text-slate-900 dark:text-white">
                            ₹{b.price}
                          </div>
                          <div className="text-[10px] text-green-600 font-bold">
                            Payment Confirmed
                          </div>
                        </div>
                      </div>

                      {/* Completed Report Link */}
                      {b.status === 'completed' && (
                        <div className="p-3.5 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-green-900 dark:text-green-200">
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            <span>Verified clinical pathology report is ready and automatically ingested into your Medical Records Vault.</span>
                          </div>
                          <a
                            href={`/api/lab/bookings/${b.id}/report`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1.5 shadow shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Report PDF</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PHARMACY ORDERS (FEATURE 3) */}
          {dashboardTab === 'pharmacy' && (
            <div className="space-y-6">
              {/* Hospital-Linked Pharmacy Card */}
              {hospitalPharmacy && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-blue-100">
                      Your Appointment Hospital Pharmacy
                    </span>
                    <h3 className="text-lg font-extrabold mt-1">
                      {hospitalPharmacy.name}
                    </h3>
                    <p className="text-xs text-blue-100">
                      {hospitalPharmacy.location} • Hotline: {hospitalPharmacy.contact_phone}
                    </p>
                  </div>
                  <Link
                    to="/pharmacy"
                    className="px-4 py-2 rounded-2xl bg-white text-blue-700 font-extrabold text-xs shadow hover:bg-blue-50 shrink-0"
                  >
                    Browse Medicines Catalogue
                  </Link>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Medicine Orders & Counter Pickups
                  </h3>
                  <p className="text-xs text-slate-500">
                    Express counter pickups at hospital pharmacy desk or door-to-door home delivery.
                  </p>
                </div>
              </div>

              {myPharmacyOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No active or past medicine orders found. Order your prescribed medicines from your hospital pharmacy.
                  </p>
                  <Link
                    to="/pharmacy"
                    className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700"
                  >
                    <span>Order Medicines Online</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {myPharmacyOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg">
                            {ord.order_number}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              ord.status === 'delivered'
                                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                                : ord.status === 'ready_for_pickup'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 animate-pulse'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Ordered: {new Date(ord.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Pickup Token Highlight */}
                      {ord.pickup_code && ord.fulfillment_type === 'hospital_pickup' && (
                        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-teal-950 dark:text-teal-200">
                          <div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-400">
                              Hospital Express Counter Pickup Token
                            </div>
                            <div className="text-2xl font-black text-teal-700 dark:text-teal-300 tracking-wider">
                              {ord.pickup_code}
                            </div>
                            <p className="text-[11px] text-teal-600 dark:text-teal-400">
                              Present at {ord.pharmacy_name || 'CareSphere Pharmacy Desk'} for immediate collection
                            </p>
                          </div>
                          <QrCode className="w-8 h-8 text-teal-600" />
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-1 text-xs">
                        {ord.items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                            <span>{item.quantity}x {item.medicine_name} {item.strength ? `(${item.strength})` : ''}</span>
                            <span className="font-semibold">₹{item.total_price}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                        <div className="text-slate-500 capitalize">
                          Fulfillment: <span className="font-bold text-slate-800 dark:text-slate-200">{ord.fulfillment_type.replace('_', ' ')}</span>
                        </div>
                        <div className="font-black text-sm text-slate-900 dark:text-white">
                          Total: ₹{ord.total_amount} <span className="text-[10px] text-green-600 font-bold">(Paid)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEDICINE REMINDER SCHEDULE (FEATURE 6) */}
          {dashboardTab === 'medicines' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Today's Medication Schedule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track daily dosage times and keep your adherence on track.
                  </p>
                </div>

                <button
                  onClick={() => setAddMedModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Medicine</span>
                </button>
              </div>

              {/* Adherence Rate Banner */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-800 dark:to-teal-950/40 p-4 rounded-3xl border border-teal-100 dark:border-teal-800/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Medication Adherence Score
                    </h4>
                    <p className="text-xs text-slate-500">Based on doses taken this week</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                    {adherenceRate}%
                  </span>
                  <span className="block text-[10px] text-slate-400">Compliance Rate</span>
                </div>
              </div>

              {/* Four Period Grid */}
              <div className="space-y-4">
                {(['morning', 'afternoon', 'evening', 'night'] as const).map((period) => {
                  const items = medicineSchedule[period] || [];
                  return (
                    <div
                      key={period}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-700/60">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 capitalize">
                          {period} Doses
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {items.length} prescribed medication(s)
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No medications scheduled for {period}.</p>
                      ) : (
                        <div className="space-y-2">
                          {items.map((med) => (
                            <div
                              key={med.id}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {med.medicine_name}
                                </span>
                                <span className="text-slate-400 ml-1.5 font-mono">({med.dosage})</span>
                                <div className="text-[11px] text-slate-500">
                                  <span>{med.food_relation.replace('_', ' ')}</span>
                                  {med.instructions && <span> • "{med.instructions}"</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleLogMedicine(med.id, 'taken')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Taken</span>
                                </button>
                                <button
                                  onClick={() => handleLogMedicine(med.id, 'skipped')}
                                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px]"
                                >
                                  Skip
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: REMOTE PATIENT FOLLOW-UPS (FEATURE 9) */}
          {dashboardTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Post-Consultation Remote Follow-Ups
                  </h3>
                  <p className="text-xs text-slate-500">
                    Report symptoms and vitals so your doctor can review your recovery progress.
                  </p>
                </div>
              </div>

              {followups.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
                  <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No pending follow-ups scheduled at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followups.map((fu) => (
                    <div
                      key={fu.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            Follow-Up with {fu.doctor_name || 'Treating Specialist'}
                          </h4>
                          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                            Target Date: {fu.scheduled_date}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            fu.status === 'reviewed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : fu.status === 'submitted'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                          }`}
                        >
                          {fu.status}
                        </span>
                      </div>

                      {fu.symptoms_reported && (
                        <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl">
                          <p>
                            <span className="text-slate-400 font-semibold">Your Reported Symptoms:</span>{' '}
                            {fu.symptoms_reported}
                          </p>
                          {fu.recovery_rating && (
                            <p>
                              <span className="text-slate-400 font-semibold">Recovery Score:</span>{' '}
                              <span className="font-bold text-teal-600">{fu.recovery_rating} / 10</span>
                            </p>
                          )}
                        </div>
                      )}

                      {fu.doctor_feedback && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                            Doctor Clinical Review:
                          </span>
                          <p className="text-slate-700 dark:text-slate-200 italic">"{fu.doctor_feedback}"</p>
                        </div>
                      )}

                      {fu.status === 'scheduled' && (
                        <button
                          onClick={() => setSubmittingFollowup(fu)}
                          className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs shadow transition-all"
                        >
                          Submit Recovery Update & Vitals
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Profile & Quick Links (Col span 1) */}
        <div className="space-y-6">
          {/* Quick Access Services Hub */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Quick Health Services
            </h3>
            <div className="space-y-2">
              <Link
                to="/records"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>My Medical Documents</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/teleconsult"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-medblue-600" />
                  <span>Teleconsult Directory</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/insurance"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Insurance & TPA Helpdesk</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/ai-report-explainer"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-rose-600" />
                  <span>AI Report Explainer</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Patient Profile Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-lg">
                {user?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{user?.name}</h3>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Preferred Language:</span>
                <span className="font-semibold text-teal-600 capitalize">
                  {user?.preferred_language || 'English'}
                </span>
              </div>
              {user?.patient?.blood_group && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Blood Group:</span>
                  <span className="text-red-600 font-bold">{user.patient.blood_group}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {addMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              Add Daily Medicine Reminder
            </h3>
            <form onSubmit={handleAddMedicineSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Medicine / Drug Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metformin / Pantoprazole"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Timing *
                  </label>
                  <select
                    value={medTiming}
                    onChange={(e) => setMedTiming(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Relation to Food
                </label>
                <select
                  value={medFood}
                  onChange={(e) => setMedFood(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="after_food">After Food</option>
                  <option value="before_food">Before Food</option>
                  <option value="with_food">With Food</option>
                  <option value="empty_stomach">Empty Stomach</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Take with a full glass of warm water"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddMedModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMed}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {savingMed ? 'Saving...' : 'Set Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Follow-Up Vitals Modal */}
      {submittingFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Submit Health Update to {submittingFollowup.doctor_name || 'Specialist'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your treating physician will review this progress log and provide clinical feedback.
            </p>

            <form onSubmit={handleSubmitFollowup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Recovery Score (1 = Not Recovering, 10 = Fully Recovered): {recoveryRating}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={recoveryRating}
                  onChange={(e) => setRecoveryRating(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Symptoms & Feeling *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe how you are feeling, any side-effects, or changes in symptoms..."
                  value={symptomsReported}
                  onChange={(e) => setSymptomsReported(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Blood Pressure (BP)
                  </label>
                  <input
                    type="text"
                    value={vitalBp}
                    onChange={(e) => setVitalBp(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Pulse / Heart Rate (bpm)
                  </label>
                  <input
                    type="text"
                    value={vitalHr}
                    onChange={(e) => setVitalHr(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Temperature (°F)
                  </label>
                  <input
                    type="text"
                    value={vitalTemp}
                    onChange={(e) => setVitalTemp(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Oxygen SpO2 (%)
                  </label>
                  <input
                    type="text"
                    value={vitalSpo2}
                    onChange={(e) => setVitalSpo2(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmittingFollowup(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVitals}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {submittingVitals ? 'Transmitting Vitals...' : 'Send to Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('patient.cancel_confirm')}
            </h3>
            <p className="text-xs text-slate-500">
              Appointment Ref: <strong>{cancellingAppt.reference_no}</strong> with{' '}
              <strong>{cancellingAppt.doctor_name}</strong> on {cancellingAppt.appointment_date}.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t('patient.cancellation_reason')}
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancellingAppt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Keep Appointment
              </button>
              <button
                disabled={isCancelling}
                onClick={handleCancelAppointment}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Reschedule Appointment
            </h3>
            {rescheduleError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">{rescheduleError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  New Date:
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  New Time:
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReschedulingAppt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={isRescheduling}
                onClick={handleRescheduleAppointment}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-sm"
              >
                {isRescheduling ? 'Rescheduling...' : 'Save New Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Emergency SOS Modal */}
      <EmergencySOSModal isOpen={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </div>
  );
};
