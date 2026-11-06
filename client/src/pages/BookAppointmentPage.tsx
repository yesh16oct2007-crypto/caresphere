import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Stethoscope,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Department, DoctorProfile } from '../types/index.js';
import { apiUrl } from '../services/api.js';

export const BookAppointmentPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Wizard steps: 1: Department, 2: Doctor, 3: Date & Slot, 4: Notes & Review, 5: Success
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(
    searchParams.get('hospital_id') ? Number(searchParams.get('hospital_id')) : null
  );

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(
    searchParams.get('dept_id') ? Number(searchParams.get('dept_id')) : null
  );

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(
    searchParams.get('doctor_id') ? Number(searchParams.get('doctor_id')) : null
  );

  const [appointmentDate, setAppointmentDate] = useState<string>(() => {
    if (searchParams.get('date')) return searchParams.get('date')!;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  const [slots, setSlots] = useState<{ time: string; isAvailable: boolean }[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');

  // Status
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // 1. Load departments and hospitals
  useEffect(() => {
    fetch(apiUrl('/api/hospital/departments'))
      .then(res => res.json())
      .then(data => setDepartments(data.departments || []))
      .catch(err => console.error(err));

    fetch(apiUrl('/api/hospitals'))
      .then(res => res.json())
      .then(data => setHospitals(data.hospitals || []))
      .catch(err => console.error(err));
  }, []);

  // 2. Load doctors whenever selectedDeptId or selectedHospitalId changes
  useEffect(() => {
    let url = '/api/doctors';
    const params = new URLSearchParams();
    if (selectedDeptId) params.append('department_id', String(selectedDeptId));
    if (selectedHospitalId) params.append('hospital_id', String(selectedHospitalId));
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    fetch(apiUrl(url))
      .then(res => res.json())
      .then(data => {
        const rawDocs = data.doctors || [];
        const seenDocIds = new Set<number>();
        const uniqueDocs = rawDocs.filter((d: any) => {
          const id = d.id || d.doctor_id;
          if (seenDocIds.has(id)) return false;
          seenDocIds.add(id);
          return true;
        });
        setDoctors(uniqueDocs);
        // Auto-advance step if pre-filled via query params
        if (selectedDoctorId && currentStep === 1) {
          setCurrentStep(3);
        } else if (selectedDeptId && currentStep === 1) {
          setCurrentStep(2);
        }
      })
      .catch(err => console.error(err));
  }, [selectedDeptId, selectedHospitalId]);

  // 3. Load slots whenever doctor or date changes
  useEffect(() => {
    if (selectedDoctorId && appointmentDate) {
      setIsLoadingSlots(true);
      fetch(apiUrl(`/api/doctors/${selectedDoctorId}/availability?date=${appointmentDate}`))
        .then(res => res.json())
        .then(data => {
          const rawSlots = data.slots || [];
          const seenTimes = new Set<string>();
          const uniqueSlots = rawSlots.filter((s: any) => {
            if (seenTimes.has(s.time)) return false;
            seenTimes.add(s.time);
            return true;
          });
          setSlots(uniqueSlots);
          setSelectedSlotTime('');
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoadingSlots(false));
    }
  }, [selectedDoctorId, appointmentDate]);

  const selectedDoctorObj = doctors.find(d => (d.id || d.doctor_id) === selectedDoctorId);
  const selectedDeptObj = departments.find(d => d.id === selectedDeptId) || 
    (selectedDoctorObj ? departments.find(d => d.name === selectedDoctorObj.department_name) : null);
  const selectedHospitalObj = hospitals.find(h => h.id === selectedHospitalId) ||
    (selectedDoctorObj ? hospitals.find(h => h.id === selectedDoctorObj.hospital_id) : null);

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      // Store current intended booking in session storage and redirect to login
      sessionStorage.setItem('pending_booking', JSON.stringify({
        doctor_id: selectedDoctorId,
        department_id: selectedDeptId || selectedDoctorObj?.department_id,
        appointment_date: appointmentDate,
        appointment_time: selectedSlotTime,
        patient_notes: patientNotes
      }));
      navigate('/login?redirect=/book');
      return;
    }

    if (!selectedDoctorId || !appointmentDate || !selectedSlotTime) {
      setErrorMsg('Please select doctor, date, and an available time slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(apiUrl('/api/appointments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          department_id: selectedDeptId || selectedDoctorObj?.department_id,
          appointment_date: appointmentDate,
          appointment_time: selectedSlotTime,
          patient_notes: patientNotes
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to complete appointment booking.');
        return;
      }

      setConfirmedBooking(data);
      setCurrentStep(5); // Success step
    } catch (err) {
      console.error('Booking submission failed:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-2">
          <Building2 className="w-3.5 h-3.5 text-brand-600" />
          <span>Multi-Hospital Healthcare Network • Appointment Scheduling</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          {t('booking.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl mx-auto">
          Book verified outpatient consultations across Apollo, Fortis, Manipal, CareSphere, and registered healthcare facilities.
        </p>
      </div>

      {/* Hospital Network Selector Bar */}
      {currentStep < 5 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-brand-50 via-teal-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 border border-brand-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Select Participating Hospital
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Choose your preferred hospital or browse doctors across all registered facilities
                </div>
              </div>
            </div>
            <div className="sm:w-72">
              <select
                value={selectedHospitalId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedHospitalId(val);
                  setSelectedDoctorId(null);
                }}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-brand-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
              >
                <option value="">All Hospitals (Network-Wide)</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} • {h.city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Progress Steps Bar */}
      {currentStep < 5 && (
        <div className="mb-8 grid grid-cols-4 gap-2 text-center text-xs font-semibold">
          <div className={`p-2.5 rounded-xl border transition-all ${
            currentStep === 1
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : currentStep > 1
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <span>{t('booking.step_dept')}</span>
          </div>

          <div className={`p-2.5 rounded-xl border transition-all ${
            currentStep === 2
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : currentStep > 2
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <span>{t('booking.step_doctor')}</span>
          </div>

          <div className={`p-2.5 rounded-xl border transition-all ${
            currentStep === 3
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : currentStep > 3
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <span>{t('booking.step_datetime')}</span>
          </div>

          <div className={`p-2.5 rounded-xl border transition-all ${
            currentStep === 4
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <span>{t('booking.step_confirm')}</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Select Department */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {t('booking.select_dept_label')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {departments.map((dept) => {
              const isSelected = selectedDeptId === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => {
                    setSelectedDeptId(dept.id);
                    setSelectedDoctorId(null);
                    setCurrentStep(2);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 ring-2 ring-brand-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{dept.name}</div>
                      <div className="text-xs text-slate-400">Clinical Department</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Select Doctor */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Change Department</span>
            </button>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
              {selectedDeptObj?.name || 'All Departments'}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('booking.select_doctor_label')}
          </h2>

          {doctors.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
              <Stethoscope className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No doctors found for this selection</div>
              <p className="text-xs text-slate-400 mt-1">Try switching to &quot;All Hospitals&quot; or select another clinical department.</p>
              <button
                onClick={() => { setSelectedHospitalId(null); setSelectedDeptId(null); }}
                className="mt-3 px-4 py-1.5 rounded-xl bg-brand-50 text-brand-700 text-xs font-semibold"
              >
                Reset Selection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {doctors.map((doc) => {
                const docId = doc.id || doc.doctor_id!;
                const isSelected = selectedDoctorId === docId;
                return (
                  <button
                    key={docId}
                    onClick={() => {
                      setSelectedDoctorId(docId);
                      setCurrentStep(3);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 ring-2 ring-brand-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{doc.name}</div>
                          <div className="text-xs font-semibold text-brand-600 dark:text-brand-400">{doc.specialization}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{doc.qualifications}</div>
                        </div>
                        {(doc.verification_status === 'verified' || doc.verification_status === 'approved') ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Hospital & Location Badge */}
                      <div className="mt-2 mb-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                        <div className="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <span className="truncate">{doc.hospital_name || 'Participating Hospital'}</span>
                        </div>
                        {doc.hospital_location && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                            <span className="truncate">{doc.hospital_location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-between">
                      <span>{doc.experience_years} yrs exp</span>
                      <span>Fee: ₹{doc.consultation_fee}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Date & Slot Selection */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Change Doctor</span>
            </button>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{selectedDoctorObj?.name}</span>
              <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold">{selectedDoctorObj?.hospital_name || 'Participating Hospital'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('booking.select_date_label')}
              </label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Outpatient clinic slots are open Monday through Saturday.
              </p>
            </div>

            {/* Slots Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('booking.select_slot_label')}
              </label>

              {isLoadingSlots ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading available clinic slots...</div>
              ) : slots.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4">
                  {t('booking.no_slots_available')}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {slots.map((s) => {
                    const isSelected = selectedSlotTime === s.time;
                    return (
                      <button
                        key={s.time}
                        disabled={!s.isAvailable}
                        onClick={() => setSelectedSlotTime(s.time)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white ring-2 ring-brand-600 shadow-sm'
                            : s.isAvailable
                            ? 'bg-slate-50 dark:bg-slate-700/60 hover:bg-brand-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                            : 'bg-slate-100 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800 line-through cursor-not-allowed opacity-50'
                        }`}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              disabled={!selectedSlotTime}
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Next: Review & Confirm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Symptoms Notes & Final Confirmation */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Time Selection</span>
            </button>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
              Review Appointment Details
            </span>
          </div>

          {/* Booking Summary Box */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-start text-sm">
              <span className="text-slate-500">Doctor:</span>
              <strong className="text-slate-900 dark:text-white text-right">{selectedDoctorObj?.name}</strong>
            </div>
            <div className="flex justify-between items-start text-sm">
              <span className="text-slate-500">Specialization:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{selectedDoctorObj?.specialization}</span>
            </div>
            <div className="flex justify-between items-start text-sm">
              <span className="text-slate-500">Hospital & Campus:</span>
              <strong className="text-brand-700 dark:text-brand-300 text-right">
                {selectedDoctorObj?.hospital_name || 'Participating Hospital'}
                {selectedDoctorObj?.hospital_location ? ` (${selectedDoctorObj.hospital_location})` : ''}
              </strong>
            </div>
            <div className="flex justify-between items-start text-sm">
              <span className="text-slate-500">Department:</span>
              <span className="text-slate-800 dark:text-slate-200">{selectedDoctorObj?.department_name}</span>
            </div>
            <div className="flex justify-between items-start text-sm">
              <span className="text-slate-500">Appointment Date:</span>
              <strong className="text-brand-600 dark:text-brand-400">{appointmentDate}</strong>
            </div>
            <div className="flex justify-between items-start text-sm">
              <span className="text-slate-500">Appointment Slot:</span>
              <strong className="text-brand-600 dark:text-brand-400">{selectedSlotTime} (30 mins)</strong>
            </div>
            <div className="flex justify-between items-start text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
              <span className="text-slate-500">Consultation Fee:</span>
              <strong className="text-slate-900 dark:text-white">₹{selectedDoctorObj?.consultation_fee} (Payable at Hospital Reception)</strong>
            </div>
          </div>

          {/* Symptoms / Notes Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t('booking.symptoms_label')}
            </label>
            <textarea
              rows={3}
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder={t('booking.symptoms_placeholder')}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {!isAuthenticated && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{t('booking.sign_in_required')} Clicking below will prompt quick sign-in.</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              disabled={isSubmitting}
              onClick={handleConfirmBooking}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Confirming with Hospital Server...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('booking.confirm_btn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success Confirmation Receipt */}
      {currentStep === 5 && confirmedBooking && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {t('booking.booking_success_title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('booking.booking_success_sub')}
            </p>
          </div>

          {/* Reference Pill */}
          <div className="inline-block bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 px-6 py-3 rounded-2xl shadow-inner">
            <span className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300 font-bold block">
              Unique Reference Code
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-brand-700 dark:text-brand-300 tracking-wider">
              {confirmedBooking.reference_no}
            </span>
          </div>

          <div className="max-w-md mx-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-1.5">
            <div><strong>Hospital:</strong> {selectedDoctorObj?.hospital_name || 'Participating Hospital'} {selectedDoctorObj?.hospital_location ? `(${selectedDoctorObj.hospital_location})` : ''}</div>
            <div><strong>Doctor:</strong> {selectedDoctorObj?.name}</div>
            <div><strong>Department:</strong> {selectedDoctorObj?.department_name}</div>
            <div><strong>Date & Slot:</strong> {appointmentDate} at {selectedSlotTime}</div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 pt-1">
              {t('booking.save_ref_notice')}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard/patient"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all"
            >
              Go to Patient Dashboard
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm"
            >
              Return to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
