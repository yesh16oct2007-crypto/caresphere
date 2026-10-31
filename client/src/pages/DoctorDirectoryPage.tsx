import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  Award,
  Stethoscope,
  Building2,
  ChevronRight,
  Info,
  MapPin,
  Navigation,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { DoctorProfile, Department } from '../types/index.js';
import { DoctorNavigationModal } from '../components/DoctorNavigationModal.js';
import { apiUrl } from '../services/api.js';

export const DoctorDirectoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(searchParams.get('department_id') || '');
  const [isLoading, setIsLoading] = useState(true);

  // Doctor Navigation Modal State
  const [navDoctor, setNavDoctor] = useState<DoctorProfile | null>(null);

  // Slot modal preview state
  const [selectedDoctorForSlots, setSelectedDoctorForSlots] = useState<DoctorProfile | null>(null);
  const [slotDate, setSlotDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [availableSlots, setAvailableSlots] = useState<{ time: string; isAvailable: boolean }[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [deptRes, docRes] = await Promise.all([
          fetch(apiUrl('/api/hospital/departments')),
          fetch(apiUrl(`/api/doctors?department_id=${selectedDeptId}&search=${encodeURIComponent(search)}`))
        ]);

        if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
        if (docRes.ok) {
          const rawDocs = (await docRes.json()).doctors || [];
          const seenDocIds = new Set<number>();
          const uniqueDocs = rawDocs.filter((d: any) => {
            const id = d.id || d.doctor_id;
            if (seenDocIds.has(id)) return false;
            seenDocIds.add(id);
            return true;
          });
          setDoctors(uniqueDocs);
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedDeptId, search]);

  const handleDeptFilter = (deptId: string) => {
    setSelectedDeptId(deptId);
    if (deptId) {
      searchParams.set('department_id', deptId);
    } else {
      searchParams.delete('department_id');
    }
    setSearchParams(searchParams);
  };

  const handleOpenSlots = async (doc: DoctorProfile) => {
    setSelectedDoctorForSlots(doc);
    fetchSlotsForDate(doc.id || doc.doctor_id!, slotDate);
  };

  const fetchSlotsForDate = async (doctorId: number, dateStr: string) => {
    setIsSlotsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/doctors/${doctorId}/availability?date=${dateStr}`));
      if (res.ok) {
        const data = await res.json();
        const rawSlots = data.slots || [];
        const seenTimes = new Set<string>();
        const uniqueSlots = rawSlots.filter((s: any) => {
          if (seenTimes.has(s.time)) return false;
          seenTimes.add(s.time);
          return true;
        });
        setAvailableSlots(uniqueSlots);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setIsSlotsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
          <Stethoscope className="w-4 h-4" />
          <span>CareSphere Medical Directory</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          {t('doctors.directory_title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Browse our hospital medical staff. All active doctors have undergone rigorous credential verification and hospital council accreditation.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('doctors.search_placeholder')}
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Department Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
          <button
            onClick={() => handleDeptFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              !selectedDeptId
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {t('doctors.all_departments')}
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => handleDeptFilter(String(d.id))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDeptId === String(d.id)
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8">
          <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {t('doctors.no_doctors_found')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search keywords or select another department.
          </p>
          <button
            onClick={() => { setSearch(''); setSelectedDeptId(''); }}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-50 text-brand-700 font-semibold text-xs hover:bg-brand-100 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const docId = doc.id || doc.doctor_id;
            return (
              <div
                key={docId}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-teal-500 to-medblue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {doc.name?.replace('Dr. ', '').charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                          {doc.name}
                        </h3>
                        <div className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                          {doc.specialization}
                        </div>
                      </div>
                    </div>
                    {(doc.verification_status === 'verified' || doc.verification_status === 'approved') ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800 shadow-2xs shrink-0"
                        title={`Authoritative Council Verification: ${doc.state_medical_council || 'NMC'}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    ) : doc.verification_status === 'suspended' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-800 shrink-0">
                        <span>Suspended</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800 shrink-0">
                        <span>Pending</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {doc.qualifications}
                    </p>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span className="truncate">{doc.hospital_name || 'CareSphere Super Specialty Hospital'}</span>
                    </div>
                    {doc.hospital_location && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{doc.hospital_location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                      <span>{doc.department_name} • {doc.floor || doc.department_floor}</span>
                    </div>
                    {doc.state_medical_council && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        <span>{doc.registration_number} • {doc.state_medical_council}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span><strong>{doc.experience_years}</strong> {t('doctors.exp_years')}</span>
                      <span>•</span>
                      <span>{t('doctors.fee')} <strong className="text-slate-800 dark:text-slate-100">₹{doc.consultation_fee}</strong></span>
                    </div>
                  </div>

                  {/* Doctor Hospital Presence & Navigation Strip */}
                  <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        doc.current_presence_status === 'in_opd'
                          ? 'bg-emerald-500 animate-pulse'
                          : doc.current_presence_status === 'in_consultation'
                          ? 'bg-amber-500'
                          : doc.current_presence_status === 'in_surgery'
                          ? 'bg-purple-500'
                          : doc.current_presence_status === 'on_rounds'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                      }`} />
                      <div className="truncate">
                        <span className="font-bold text-[11px] text-slate-900 dark:text-white block truncate">
                          {doc.room_number || 'Chamber 101'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {doc.current_presence_status === 'in_opd' ? 'Available in Chamber' :
                           doc.current_presence_status === 'in_consultation' ? 'In Consultation' :
                           doc.current_presence_status === 'in_surgery' ? 'In Surgery / OT' :
                           doc.current_presence_status === 'on_rounds' ? 'On Ward Rounds' : 'Off Duty'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNavDoctor(doc)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 text-brand-700 dark:text-brand-300 font-semibold text-[10px] flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                    >
                      <Navigation className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                      <span>Find Room</span>
                    </button>
                  </div>

                  {doc.bio && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {doc.bio}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenSlots(doc)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Slots</span>
                  </button>
                  <Link
                    to={`/book?doctor_id=${docId}&dept_id=${doc.department_id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t('doctors.book_btn')}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Slots Preview Modal */}
      {selectedDoctorForSlots && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Available Slots
                </h3>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                  {selectedDoctorForSlots.name} ({selectedDoctorForSlots.specialization})
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctorForSlots(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Date Picker */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Select Date:
              </label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={slotDate}
                onChange={(e) => {
                  setSlotDate(e.target.value);
                  fetchSlotsForDate(selectedDoctorForSlots.id || selectedDoctorForSlots.doctor_id!, e.target.value);
                }}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Slots Grid */}
            <div className="max-h-60 overflow-y-auto my-3">
              {isSlotsLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading live availability...</div>
              ) : availableSlots.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No slots scheduled for this day (Doctor unavailable or weekend).
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition-all ${
                        s.isAvailable
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through border border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      {s.time}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setSelectedDoctorForSlots(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Close
              </button>
              <Link
                to={`/book?doctor_id=${selectedDoctorForSlots.id || selectedDoctorForSlots.doctor_id}&dept_id=${selectedDoctorForSlots.department_id}&date=${slotDate}`}
                className="px-5 py-2 rounded-xl bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 transition-colors shadow-sm"
              >
                Proceed to Book
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Hospital Indoor Navigation Modal */}
      <DoctorNavigationModal doctor={navDoctor} onClose={() => setNavDoctor(null)} />
    </div>
  );
};
