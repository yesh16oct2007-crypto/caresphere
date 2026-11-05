import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Sparkles,
  Calendar,
  Stethoscope,
  Building2,
  ShieldAlert,
  Bot,
  Search,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  MapPin,
  Navigation,
  Video,
  Activity,
  Compass,
  FileText,
  FileCheck
} from 'lucide-react';
import { Department, DoctorProfile, Facility, FAQ, Announcement } from '../types/index.js';
import { DoctorNavigationModal } from '../components/DoctorNavigationModal.js';
import { apiUrl } from '../services/api.js';

export const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [navigatingDoc, setNavigatingDoc] = useState<DoctorProfile | null>(null);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [deptRes, docRes, facRes, faqRes, annRes] = await Promise.all([
          fetch(apiUrl('/api/hospital/departments')),
          fetch(apiUrl('/api/doctors?limit=4')),
          fetch(apiUrl('/api/hospital/facilities')),
          fetch(apiUrl('/api/hospital/faqs')),
          fetch(apiUrl('/api/hospital/announcements'))
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
        if (facRes.ok) setFacilities((await facRes.json()).facilities || []);
        if (faqRes.ok) setFaqs((await faqRes.json()).faqs || []);
        if (annRes.ok) setAnnouncements((await annRes.json()).announcements || []);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const filteredDoctors = doctors.filter(doc =>
    doc.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    doc.specialization?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    doc.department_name?.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="space-y-16 lg:space-y-24 pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 lg:pt-16 lg:pb-20 mesh-gradient-bg">
        {/* Ambient Gradient Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-brand-500/20 via-sky-400/20 to-indigo-500/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Active Hospital Announcement (if any) */}
          {announcements.length > 0 && (
            <div className="mb-8 max-w-3xl mx-auto p-3.5 bg-brand-50/80 dark:bg-slate-900/80 border border-brand-200 dark:border-brand-800 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-brand-900 dark:text-brand-200 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                  Update
                </span>
                <span className="font-semibold">{announcements[0].title}</span>
              </div>
              <span className="hidden sm:inline text-xs text-brand-600 dark:text-brand-400 font-medium">
                CareSphere Hospital Network
              </span>
            </div>
          )}

          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs sm:text-sm font-semibold shadow-xs">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>CareSphere Multilingual Healthcare Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              World-Class Healthcare, Spoken in{' '}
              <span className="bg-gradient-to-r from-brand-600 via-sky-500 to-indigo-600 dark:from-brand-400 dark:via-sky-300 dark:to-indigo-400 bg-clip-text text-transparent">
                Your Language
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {t('home.hero_subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/book"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-sky-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 hover:shadow-xl transition-all"
              >
                <Calendar className="w-5 h-5" />
                <span>{t('home.book_appointment_btn')}</span>
              </Link>
              <Link
                to="/doctors"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-bold text-sm sm:text-base border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Stethoscope className="w-5 h-5 text-brand-600" />
                <span>{t('home.find_doctor_title')}</span>
              </Link>
            </div>
          </div>

          {/* Key Metrics / Highlights Bar */}
          <div className="mt-14 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-300 transition-all text-center">
              <div className="text-2xl sm:text-3xl font-black text-brand-600 dark:text-brand-400">100+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{t('home.stats_doctors')}</div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-teal-300 transition-all text-center">
              <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400">12+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{t('home.stats_departments')}</div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-red-300 transition-all text-center">
              <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">24/7</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{t('home.stats_emergency')}</div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 transition-all text-center">
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">10</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{t('home.stats_languages')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Healthcare Features Hub */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-wider font-bold text-teal-600 dark:text-teal-400">
            CareSphere Next-Gen Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Smart Hospital Services & Patient Assistance
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Integrated digital care: from online specialist video calls to real-time bed tracking and AI report decoding.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/teleconsult"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-teal-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Online Video Teleconsult</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-teal-600 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect with verified hospital doctors from home via secure WebRTC video calls and receive official digital prescriptions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-teal-600">
              Verified Doctors Available • Encrypted Video
            </div>
          </Link>

          <Link
            to="/resources"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Live Hospital Bed & ICU Status</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Real-time verified capacity of general beds, ventilator ICU suites, emergency trauma bays, and blood bank inventory.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-emerald-600">
              Live Updates Across 3 Premier Hospitals
            </div>
          </Link>

          <Link
            to="/ai-report-explainer"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-rose-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>AI Medical Report Explainer</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-rose-600 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload diagnostic lab tests. Our clinical AI extracts biomarkers, normal ranges, and translates findings in 10 Indian regional languages.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-rose-600">
              Available in 10 Languages • Safety Disclaimers
            </div>
          </Link>

          <Link
            to="/indoor-navigation"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Hospital Indoor Map & GPS</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Multi-floor interactive SVG floor plans. Step-by-step turn-by-turn navigation from entrance gate to your doctor's chamber or diagnostic room.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-indigo-600">
              Floors 0 to 3 • Wheelchair Accessible Routes
            </div>
          </Link>

          <Link
            to="/insurance"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-amber-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Health Insurance & TPA Desk</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Check cashless coverage across partner insurers, review mandatory document checklists, and save policy cards in your vault.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-amber-600">
              100% Cashless Pre-Auth • 24/7 Desk Contacts
            </div>
          </Link>

          <Link
            to="/records"
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-medblue-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-medblue-50 dark:bg-medblue-950/60 text-medblue-600 dark:text-medblue-300 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Digital Patient Medical Records</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-medblue-600 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Securely store prescriptions, discharge summaries, and radiology scans with doctor-sharing consent and access audit trails.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-medblue-600">
              End-to-End Encrypted • Access Audit Logs
            </div>
          </Link>
        </div>
      </section>

      {/* 2. Quick Doctor Directory Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {t('home.find_doctor_title')}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              {t('home.find_doctor_sub')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder={t('doctors.search_placeholder')}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <Link
              to="/doctors"
              className="text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Doctor Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredDoctors.slice(0, 4).map((doc) => {
            const isVerified = doc.verification_status === 'verified' || doc.verification_status === 'approved';

            return (
              <div
                key={doc.id || doc.doctor_id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs hover:shadow-md hover:border-brand-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {doc.name ? doc.name.replace('Dr. ', '').charAt(0) : 'D'}
                    </div>
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verified Specialist</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                        <span>Review Pending</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {doc.name}
                  </h3>
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                    {doc.specialization}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {doc.department_name}
                  </p>

                  {/* Hospital Affiliation & Location */}
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 truncate">
                      <Building2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span className="truncate">{doc.hospital_name || 'CareSphere Super Specialty Hospital'}</span>
                    </div>
                    {doc.hospital_location && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{doc.hospital_location}</span>
                      </div>
                    )}
                  </div>

                  {/* Room & Navigation chip */}
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3 h-3 text-teal-600" />
                      <span>{doc.room_number || 'OPD Chamber'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setNavigatingDoc(doc)}
                      className="text-brand-600 dark:text-brand-400 hover:underline font-bold inline-flex items-center gap-0.5"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Map</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    <span>{doc.experience_years} {t('doctors.exp_years')}</span> • <span>Fee: ₹{doc.consultation_fee}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <Link
                    to={`/book?doctor_id=${doc.id || doc.doctor_id}&dept_id=${doc.department_id}`}
                    className="w-full py-2 px-3 rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t('doctors.book_btn')}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Clinical Departments Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {t('home.departments_title')}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            {t('home.departments_sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                {dept.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">
                {dept.description}
              </p>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{dept.floor}</span>
                <Link
                  to={`/doctors?department_id=${dept.id}`}
                  className="text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Specialists</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. AI Assistant Feature Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-brand-900 to-slate-900 text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-200 text-xs font-semibold">
              <Bot className="w-4 h-4" />
              <span>CareSphere Multilingual AI Engine</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ask in Tamil, Hindi, Telugu, or Any of 10 Indian Languages
            </h2>

            <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
              Have questions about doctor schedules, visiting hours, necessary appointment documents, or hospital facilities? CareSphere AI assistant communicates natively in your chosen language with instant, verified hospital facts and emergency triage detection.
            </p>

            <div className="pt-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const aiBtn = document.querySelector('button[aria-label="Open AI Assistant"]') as HTMLButtonElement;
                  if (aiBtn) aiBtn.click();
                }}
                className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Assistant Now</span>
              </button>
              <Link
                to="/facilities"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
              >
                Explore Facilities
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Hospital Facilities & Services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {t('home.facilities_title')}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            {t('home.facilities_sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.slice(0, 6).map((fac) => (
            <div
              key={fac.id}
              className={`p-6 rounded-2xl border transition-all ${
                fac.is_emergency_facility
                  ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {fac.category}
                </span>
                {fac.is_emergency_facility === 1 && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                    24/7 Critical
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                {fac.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {fac.description}
              </p>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  <span>{fac.timing}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
                  <span>{fac.contact_number}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Frequently Asked Questions Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {t('home.faqs_title')}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            {t('home.faqs_sub')}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 pt-3 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
