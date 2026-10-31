import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Appointment } from '../types/index.js';
import { DoctorNavigationModal } from '../components/DoctorNavigationModal.js';
import { apiUrl } from '../services/api.js';

export const DoctorDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'approved' | 'rejected' | 'suspended'>('pending');
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
        setHospitalName(data.hospital_name || user?.doctor?.hospital_name || 'CareSphere Super Specialty Hospital');
        setHospitalLocation(data.hospital_location || user?.doctor?.hospital_location || 'Main Campus, Bengaluru');
        setStateCouncil(data.state_medical_council || user?.doctor?.state_medical_council || '');
        setRoomNumber(data.room_number || user?.doctor?.room_number || 'Chamber 304');
        setFloor(data.floor || user?.doctor?.floor || 'Floor 3');
        setWing(data.wing || user?.doctor?.wing || 'North Wing');
        setPresenceStatus(data.current_presence_status || user?.doctor?.current_presence_status || 'available');
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

  useEffect(() => {
    fetchSchedule();
  }, [token]);

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
          hospital_name: hospitalName,
          hospital_location: hospitalLocation,
          current_presence_status: presenceStatus,
          room_number: roomNumber,
          floor,
          wing,
          navigation_instructions: navInstructions
        })
      });

      if (res.ok) {
        setPresenceSuccess(true);
        setTimeout(() => setPresenceSuccess(false), 3000);
      } else {
        alert('Failed to update presence status.');
      }
    } catch (err) {
      console.error('Presence update error:', err);
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
        fetchSchedule();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsSavingAppt(false);
    }
  };

  const isVerifiedDoctor = verificationStatus === 'verified' || verificationStatus === 'approved';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-brand-600 dark:text-brand-400">
            CareSphere Clinical Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Medical Practitioner Dashboard, Presence Beacon & Appointment Management
          </p>
        </div>

        {/* Verified Specialist Badge only after authoritative check */}
        {isVerifiedDoctor ? (
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="leading-tight">Verified Specialist</div>
              <div className="text-[10px] font-normal text-emerald-600/80">Authoritative checks cleared</div>
            </div>
          </div>
        ) : verificationStatus === 'suspended' ? (
          <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs font-bold">
            <Ban className="w-4 h-4 text-purple-600" />
            <span>Practice Suspended</span>
          </div>
        ) : verificationStatus === 'rejected' ? (
          <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-4 py-2 rounded-2xl border border-rose-200 dark:border-rose-800 text-xs font-bold">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Application Rejected</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-4 py-2 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs font-bold">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Pending Authoritative Review</span>
          </div>
        )}
      </div>

      {/* Pending Banner if not verified */}
      {verificationStatus === 'pending' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-3xl p-6 text-amber-900 dark:text-amber-200 shadow-sm flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-base">{t('doctor.pending_banner_title')}</h3>
            <p className="text-xs sm:text-sm leading-relaxed text-amber-800 dark:text-amber-300">
              {t('doctor.pending_banner_sub')} An authorized administrator will verify your credentials with the State Medical Council. Once authoritative checks pass, your profile will be granted the Verified Specialist badge and become bookable by patients.
            </p>
            <div className="pt-2 text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
              Registration Number: {user?.doctor?.registration_number} • Council: {stateCouncil || 'State Medical Council'}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Hospital Presence & Chamber Navigation Control */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 border border-teal-200 dark:border-teal-800">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Real-Time Presence Beacon & Chamber Navigation</span>
              </h2>
              <p className="text-xs text-slate-500">
                Update your live location in the hospital so arriving patients can navigate directly to your chamber.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNavPreview(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
          >
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Preview Patient Navigation</span>
          </button>
        </div>

        <form onSubmit={handleUpdatePresence} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Presence Status:
              </label>
              <select
                value={presenceStatus}
                onChange={(e) => setPresenceStatus(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="available">● Available in Chamber</option>
                <option value="in_consultation">● In Consultation</option>
                <option value="on_rounds">● On Ward Rounds</option>
                <option value="in_surgery">● In Surgery / Operation Theatre</option>
                <option value="off_duty">● Off Duty / Break</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Chamber / Room Number:
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. Chamber 304"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Hospital Floor:
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. Floor 3"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Wing / Block:
              </label>
              <input
                type="text"
                value={wing}
                onChange={(e) => setWing(e.target.value)}
                placeholder="e.g. North Wing OPD"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Turn-by-Turn Navigation Instructions for Patients:
            </label>
            <input
              type="text"
              value={navInstructions}
              onChange={(e) => setNavInstructions(e.target.value)}
              placeholder="e.g. Take central elevators to 3rd floor. Turn left, follow blue corridor line to Chamber 304."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {presenceSuccess ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Live presence status broadcasted to patients.</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Patients will see this chamber location and live beacon status on their appointments.
              </span>
            )}

            <button
              type="submit"
              disabled={isUpdatingPresence}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingPresence ? 'animate-spin' : ''}`} />
              <span>{isUpdatingPresence ? 'Updating...' : 'Broadcast Location & Presence'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Appointments Section & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              <span>{t('doctor.today_schedule')} ({appointments.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-xs text-slate-500">
              No patient consultations booked at this time.
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                        {appt.reference_no}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        appt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {appt.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span><strong>Date:</strong> {appt.appointment_date}</span>
                      <span><strong>Time:</strong> {appt.appointment_time}</span>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {appt.patient_name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {appt.patient_email} • {appt.patient_phone || 'No phone'}
                      </span>
                    </div>

                    {appt.patient_gender && (
                      <div className="text-[11px] text-slate-500">
                        Gender: {appt.patient_gender} • DOB: {appt.patient_dob} • Blood: {appt.patient_blood_group}
                      </div>
                    )}

                    {appt.patient_history && (
                      <div className="text-[11px] text-slate-500">
                        <strong>History:</strong> {appt.patient_history}
                      </div>
                    )}

                    {appt.patient_notes && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <strong>Chief Complaint / Notes:</strong> {appt.patient_notes}
                      </div>
                    )}
                  </div>

                  {/* Doctor Notes & Action View */}
                  {editingApptId === appt.id ? (
                    <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 space-y-3">
                      <div className="flex gap-2">
                        <label className="text-xs font-bold text-teal-900 dark:text-teal-200">
                          Update Status:
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-teal-900 dark:text-teal-200 mb-1">
                          Clinical / Prescription Notes:
                        </label>
                        <textarea
                          rows={2}
                          value={doctorNotes}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          placeholder="Prescription or clinical instructions..."
                          className="w-full text-xs p-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingApptId(null)}
                          className="px-3 py-1 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isSavingAppt}
                          onClick={() => handleUpdateStatusAndNotes(appt.id)}
                          className="px-4 py-1 rounded bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save & Complete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-slate-500">
                        {appt.doctor_notes ? (
                          <span><strong>Notes:</strong> {appt.doctor_notes}</span>
                        ) : (
                          <span className="italic">No doctor notes entered yet.</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditingApptId(appt.id);
                          setEditStatus(appt.status);
                          setDoctorNotes(appt.doctor_notes || '');
                        }}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2 py-1"
                      >
                        Edit Notes / Status
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Doctor Profile Details */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-brand-600" />
              <span>Practitioner Profile</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Hospital Affiliation</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>{hospitalName}</span>
                </span>
                {hospitalLocation && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-teal-600" />
                    <span>{hospitalLocation}</span>
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Medical Council</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {stateCouncil || 'State Medical Council'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration Number</span>
                <strong className="font-mono text-brand-700 dark:text-brand-400">
                  {user?.doctor?.registration_number}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Specialization</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.doctor?.specialization}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Qualifications</span>
                <span>{user?.doctor?.qualifications}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Experience & Fee</span>
                <span>{user?.doctor?.experience_years} years • ₹{user?.doctor?.consultation_fee}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Consultation Chamber</span>
                <div className="flex items-center gap-1.5 text-teal-600 font-bold mt-0.5">
                  <MapPin className="w-4 h-4" />
                  <span>{roomNumber} • {floor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white">Clinic Hours & Slots</h4>
            <p className="text-slate-500 leading-relaxed">
              Standard clinic schedule: Monday to Friday (09:00 - 13:00 and 14:00 - 17:00), Saturday (09:00 - 12:00) with 30-minute consultation slots.
            </p>
          </div>
        </div>
      </div>

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
