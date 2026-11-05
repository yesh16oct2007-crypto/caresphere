import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Video,
  Calendar,
  Clock,
  Search,
  ShieldCheck,
  Star,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X,
  Stethoscope,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiUrl } from '../services/api.js';
import { DoctorProfile } from '../types/index.js';

export const TeleconsultDirectoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [patientNotes, setPatientNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{ roomId: string; refNo: string } | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl('/api/consultations/doctors'));
      if (!res.ok) throw new Error('Failed to load teleconsultation doctors');
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (err: any) {
      setError(err.message || 'Error loading doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleBookTeleconsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login?redirect=/teleconsult');
      return;
    }
    if (!selectedDoctor) return;

    try {
      setBookingLoading(true);
      setError(null);
      const res = await fetch(apiUrl('/api/consultations/book'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor.user_id,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          patient_notes: patientNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to book teleconsultation');
      }

      setBookingSuccess({
        roomId: data.appointment.video_room_id,
        refNo: data.appointment.reference_no
      });
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const specializations = Array.from(new Set(doctors.map((d) => d.specialization).filter(Boolean)));

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSpec = selectedSpecialization === 'all' || doc.specialization === selectedSpecialization;
    return matchesSearch && matchesSpec;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-600 via-medblue-600 to-indigo-700 rounded-3xl p-6 sm:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-4 text-amber-200">
            <Video className="w-3.5 h-3.5" />
            <span>Encrypted WebRTC Telehealth</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Online Doctor Video Consultation
          </h1>
          <p className="text-teal-100 text-sm sm:text-base leading-relaxed mb-6">
            Consult accredited hospital specialists from the safety and comfort of your home. Real-time video, instant digital prescriptions, and direct pharmacy integration.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-white/90">
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Centrally Verified Doctors Only
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Official Digital Prescriptions
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search specialist, doctor name, hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedSpecialization('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSpecialization === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Specialties
          </button>
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialization(spec)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSpecialization === spec
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Finding verified teleconsultation doctors...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
          <Stethoscope className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No teleconsultation doctors found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Try adjusting your search criteria or explore in-person appointment schedules.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.user_id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-lg">
                      {doc.name ? doc.name.replace('Dr. ', '').charAt(0) : 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                        {doc.name}
                        <span title="Centrally Verified">
                          <ShieldCheck className="w-4 h-4 text-teal-500 shrink-0" />
                        </span>
                      </h3>
                      <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                        {doc.specialization}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Video className="w-3 h-3" />
                    Online
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{doc.hospital_name || 'CareSphere Partner Hospital'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{doc.experience_years} Years Experience • {doc.qualifications}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{doc.teleconsultation_fee || doc.consultation_fee}
                    </span>
                    <span className="text-slate-400">/ Online Video Session</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedDoctor(doc);
                  setBookingSuccess(null);
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 hover:to-medblue-700 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-teal-500/20 hover:shadow-lg transition-all text-xs"
              >
                <Video className="w-4 h-4" />
                <span>Book Video Consultation</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Schedule Online Video Call
                </h3>
                <p className="text-xs text-teal-600 dark:text-teal-400">
                  {selectedDoctor.name} ({selectedDoctor.specialization})
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Teleconsultation Confirmed!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Booking Reference: <span className="font-mono font-bold text-teal-600">{bookingSuccess.refNo}</span>
                  </p>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-xs text-teal-800 dark:text-teal-300 text-left">
                  <p className="font-semibold mb-1">Video Room Ready:</p>
                  <p>Your encrypted consultation link is active. Both you and your doctor will receive a reminder notification.</p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/consultations/room/${bookingSuccess.roomId}`)}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl shadow text-xs"
                  >
                    <Video className="w-4 h-4" />
                    <span>Enter Video Consultation Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookTeleconsult} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Time Slot *
                    </label>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:30">03:30 PM</option>
                      <option value="17:00">05:00 PM</option>
                      <option value="18:30">06:30 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Symptoms / Chief Medical Complaint
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe your health symptoms, duration, or any questions for the specialist..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500">Consultation Fee</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{selectedDoctor.teleconsultation_fee || selectedDoctor.consultation_fee}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDoctor(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {bookingLoading ? 'Reserving Slot...' : 'Confirm & Reserve Slot'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
