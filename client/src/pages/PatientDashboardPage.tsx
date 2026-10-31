import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Appointment } from '../types/index.js';
import { DoctorNavigationModal } from '../components/DoctorNavigationModal.js';
import { apiUrl } from '../services/api.js';

export const PatientDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [navigatingDoc, setNavigatingDoc] = useState<any | null>(null);

  // Cancel modal state
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule modal state
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchAppointments();
  }, [token]);

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
        fetchAppointments();
      }
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    } finally {
      setIsCancelling(false);
    }
  };

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
    a => a.status !== 'cancelled' && a.status !== 'completed' && a.appointment_date >= todayStr
  );
  const pastAppointments = appointments.filter(
    a => a.status === 'completed' || a.status === 'cancelled' || a.appointment_date < todayStr
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Personalized Welcome Header */}
      <div className="bg-gradient-to-r from-brand-700 via-teal-700 to-medblue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-teal-200">
            CareSphere Patient Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {t('patient.welcome')}, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
            Manage your hospital appointments, view consultation references, and connect with your healthcare team in your preferred language.
          </p>
        </div>

        <Link
          to="/book"
          className="px-5 py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-brand-600" />
          <span>{t('patient.book_new')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments Section (Col span 2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t('patient.upcoming_title')} ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'past'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t('patient.past_title')} ({pastAppointments.length})
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading appointments...</div>
          ) : (activeTab === 'upcoming' ? upcomingAppointments : pastAppointments).length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'upcoming' ? t('patient.no_upcoming') : t('patient.no_history')}
              </p>
              {activeTab === 'upcoming' && (
                <Link
                  to="/book"
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-50 text-brand-700 font-semibold text-xs hover:bg-brand-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book Appointment Now</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(activeTab === 'upcoming' ? upcomingAppointments : pastAppointments).map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col sm:flex-row justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                        {appt.reference_no}
                      </span>
                      {appt.status === 'confirmed' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {t('patient.status_confirmed')}
                        </span>
                      )}
                      {appt.status === 'completed' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          {t('patient.status_completed')}
                        </span>
                      )}
                      {appt.status === 'cancelled' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
                          {t('patient.status_cancelled')}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {appt.doctor_name}
                      </h4>
                      <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                        {appt.specialization} • {appt.department_name}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-brand-600" />
                        <span>{appt.appointment_date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>{appt.appointment_time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{appt.department_floor}</span>
                      </div>
                      {appt.hospital_name && (
                        <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-brand-600" />
                          <span>{appt.hospital_name} {appt.hospital_location ? `(${appt.hospital_location})` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Hospital Chamber & Live Navigation */}
                    {appt.room_number && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold">
                          <MapPin className="w-3.5 h-3.5 text-teal-600" />
                          <span>{appt.room_number} {appt.floor ? `(${appt.floor})` : ''}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setNavigatingDoc({
                            name: appt.doctor_name || 'Dr. Specialist',
                            specialization: appt.specialization || 'Clinical Specialist',
                            department_name: appt.department_name,
                            hospital_name: appt.hospital_name,
                            hospital_location: appt.hospital_location,
                            room_number: appt.room_number,
                            floor: appt.floor,
                            wing: appt.wing,
                            current_presence_status: appt.current_presence_status || 'available',
                            navigation_instructions: appt.navigation_instructions
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-[11px] font-bold transition-all shadow-2xs"
                        >
                          <Navigation className="w-3 h-3 text-brand-600" />
                          <span>Indoor Chamber Directions</span>
                        </button>
                      </div>
                    )}

                    {appt.patient_notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <strong>Reason:</strong> {appt.patient_notes}
                      </p>
                    )}

                    {appt.doctor_notes && (
                      <p className="text-xs text-slate-700 dark:text-slate-200 bg-teal-50 dark:bg-teal-950/40 p-2 rounded-lg border border-teal-200 dark:border-teal-800">
                        <strong>Doctor's Clinical Notes:</strong> {appt.doctor_notes}
                      </p>
                    )}
                  </div>

                  {/* Actions for upcoming appointments */}
                  {appt.status === 'confirmed' && (
                    <div className="flex sm:flex-col justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => {
                          setReschedulingAppt(appt);
                          setNewDate(appt.appointment_date);
                          setNewTime(appt.appointment_time);
                        }}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t('patient.reschedule')}</span>
                      </button>
                      <button
                        onClick={() => setCancellingAppt(appt)}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/60 hover:bg-red-50 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t('patient.cancel')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Patient Medical Profile */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-lg">
                {user?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{user?.name}</h3>
                <span className="text-xs text-slate-400">{user?.email}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-slate-700 dark:text-slate-200 font-medium">{user?.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Preferred Language:</span>
                <span className="text-brand-600 dark:text-brand-400 font-bold uppercase">{user?.preferred_language}</span>
              </div>
              {user?.patient?.date_of_birth && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Date of Birth:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{user.patient.date_of_birth}</span>
                </div>
              )}
              {user?.patient?.blood_group && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Blood Group:</span>
                  <span className="text-red-600 font-bold">{user.patient.blood_group}</span>
                </div>
              )}
              {user?.patient?.address && (
                <div className="flex justify-between">
                  <span className="text-slate-400">City / Address:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{user.patient.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Multilingual Support Desk Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
              <Globe className="w-4 h-4" />
              <span>Language Assistance</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              CareSphere is configured to display your dashboard, notifications, and AI responses in your chosen language.
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('patient.cancel_confirm')}
            </h3>
            <p className="text-xs text-slate-500">
              Appointment Ref: <strong>{cancellingAppt.reference_no}</strong> with <strong>{cancellingAppt.doctor_name}</strong> on {cancellingAppt.appointment_date}. Cancelling will immediately release this slot for other patients.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Reschedule Appointment
            </h3>
            <p className="text-xs text-slate-500">
              Reference: <strong>{reschedulingAppt.reference_no}</strong> ({reschedulingAppt.doctor_name})
            </p>

            {rescheduleError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">
                {rescheduleError}
              </div>
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
                  New Time (e.g. 10:00, 10:30, 11:00):
                </label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="10:30"
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
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 shadow-sm"
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm New Time'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Indoor Navigation Modal */}
      {navigatingDoc && (
        <DoctorNavigationModal
          doctor={navigatingDoc}
          onClose={() => setNavigatingDoc(null)}
        />
      )}
    </div>
  );
};
