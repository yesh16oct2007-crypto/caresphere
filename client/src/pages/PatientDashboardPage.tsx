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
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import {
  Appointment,
  MedicineReminder,
  MedicineLog,
  PatientFollowUp
} from '../types/index.js';
import { DoctorNavigationModal } from '../components/DoctorNavigationModal.js';
import { apiUrl } from '../services/api.js';

export const PatientDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Navigation tab state
  const [dashboardTab, setDashboardTab] = useState<'appointments' | 'medicines' | 'followups'>('appointments');
  const [activeApptTab, setActiveApptTab] = useState<'upcoming' | 'past'>('upcoming');

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

  useEffect(() => {
    fetchAppointments();
    fetchMedicines();
    fetchFollowups();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Personalized Welcome Header */}
      <div className="bg-gradient-to-r from-teal-700 via-medblue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-teal-200">
            CareSphere Patient Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {t('patient.welcome')}, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
            Track appointments, online video consultations, daily medications, and clinical follow-ups in your preferred language.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/teleconsult"
            className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 backdrop-blur transition-all"
          >
            <Video className="w-4 h-4 text-emerald-300" />
            <span>Online Teleconsult</span>
          </Link>

          <Link
            to="/book"
            className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 text-teal-600" />
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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setDashboardTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            dashboardTab === 'appointments'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments & Teleconsult</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {upcomingAppointments.length}
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('medicines')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            dashboardTab === 'medicines'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medicine Schedule & Adherence</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
            {adherenceRate}%
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('followups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            dashboardTab === 'followups'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Remote Follow-Ups & Vitals</span>
          {followups.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-bold">
              {followups.length}
            </span>
          )}
        </button>

        <Link
          to="/records"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors ml-auto"
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Medical Vault</span>
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
    </div>
  );
};
