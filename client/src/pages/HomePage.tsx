import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Video,
  FileCheck,
  Shield,
  Pill,
  FlaskConical,
  Activity,
  Globe,
  Star
} from 'lucide-react';
import { Department, DoctorProfile, Facility, FAQ, Announcement } from '../types/index.js';
import { apiUrl } from '../services/api.js';

export const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearchQuery.trim()) {
      navigate(`/doctors?search=${encodeURIComponent(heroSearchQuery.trim())}`);
    } else {
      navigate('/doctors');
    }
  };

  const filteredDoctors = doctors.filter(doc =>
    doc.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    doc.specialization?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    doc.department_name?.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="space-y-16 lg:space-y-24 pb-20">
      {/* 1. HERO SECTION WITH PROFESSIONAL HEALTHCARE PHOTOGRAPHY */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-b-[2.5rem] lg:rounded-b-[3.5rem] shadow-premium">
        {/* Background Image with Deep Navy & Medical Teal Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=80"
            alt="Modern Hospital Atrium"
            className="w-full h-full object-cover object-center scale-105 motion-safe:animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a42]/95 via-[#123B5D]/90 to-[#0D9488]/75 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-radial at-center from-transparent via-[#123B5D]/40 to-[#0e2c45]/90" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
          {/* Active Hospital Announcement (if any) */}
          {announcements.length > 0 && (
            <div className="mb-6 max-w-2xl mx-auto p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-white shadow-sm">
              <div className="flex items-center gap-2 truncate">
                <span className="bg-[#0D9488] text-white text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full shrink-0">
                  Update
                </span>
                <span className="font-semibold truncate">{announcements[0].title}</span>
              </div>
              <span className="hidden sm:inline text-teal-200 text-xs font-semibold shrink-0">
                Network Notice
              </span>
            </div>
          )}

          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 text-xs sm:text-sm font-semibold shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>CareSphere Multi-Hospital Technology Network</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              World-Class Healthcare, Spoken in{' '}
              <span className="bg-gradient-to-r from-teal-200 via-[#38BDF8] to-white bg-clip-text text-transparent">
                Your Language
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal max-w-2xl mx-auto">
              Connect with top verified doctors across leading hospital facilities, access online video consultations, order medicines from hospital pharmacies, and receive instant AI assistance in 10 Indian languages.
            </p>

            {/* Hero Quick Search Bar */}
            <form onSubmit={handleHeroSearch} className="max-w-xl mx-auto pt-2">
              <div className="p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-white/40">
                <div className="relative flex-1 w-full flex items-center pl-3">
                  <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    placeholder={t('doctors.search_placeholder')}
                    className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none py-2"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#123B5D] to-[#0D9488] hover:from-[#0e304d] hover:to-[#0f766e] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{t('common.search')}</span>
                </button>
              </div>
            </form>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/book"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#14b8a6] hover:from-[#0f766e] hover:to-[#0D9488] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Calendar className="w-5 h-5" />
                <span>{t('home.book_appointment_btn')}</span>
              </Link>
              <Link
                to="/teleconsult"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-sm sm:text-base border border-white/25 flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Video className="w-5 h-5 text-teal-300" />
                <span>{t('nav.online_video_teleconsult')}</span>
              </Link>
            </div>
          </div>

          {/* Key Metrics / Highlights Bar */}
          <div className="mt-12 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center hover:bg-white/15 transition-all">
              <div className="text-2xl sm:text-3xl font-black text-white">100+</div>
              <div className="text-xs sm:text-sm font-medium text-teal-200 mt-1">{t('home.stats_doctors')}</div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center hover:bg-white/15 transition-all">
              <div className="text-2xl sm:text-3xl font-black text-[#38BDF8]">15+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-200 mt-1">Network Hospitals</div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center hover:bg-white/15 transition-all">
              <div className="text-2xl sm:text-3xl font-black text-rose-300">24/7</div>
              <div className="text-xs sm:text-sm font-medium text-rose-200 mt-1">{t('home.stats_emergency')}</div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center hover:bg-white/15 transition-all">
              <div className="text-2xl sm:text-3xl font-black text-amber-300">10</div>
              <div className="text-xs sm:text-sm font-medium text-amber-200 mt-1">{t('home.stats_languages')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ADVANCED HEALTHCARE SERVICES GRID WITH REAL IMAGERY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-wider font-extrabold text-[#0D9488]">
            Comprehensive Clinical Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Smart Hospital Services & Patient Care
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Integrated digital healthcare: from encrypted teleconsultations and laboratory bookings to hospital-linked pharmacies and emergency response.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Service Card 1: Teleconsult */}
          <Link
            to="/teleconsult"
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-subtle hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80"
                alt="Doctor Video Consultation"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#0D9488] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                <Video className="w-3.5 h-3.5" />
                <span>WebRTC Encrypted</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5 group-hover:text-[#0D9488] transition-colors flex items-center justify-between">
                  <span>{t('nav.teleconsult')}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0D9488] transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Consult verified doctors from home with real-time video audio and instant digital prescription delivery.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-[#0D9488]">
                {t('common.verified')} • {t('booking.title')}
              </div>
            </div>
          </Link>

          {/* Service Card 2: Pharmacy */}
          <Link
            to="/pharmacy"
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-subtle hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80"
                alt="Hospital Pharmacy and Medications"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#123B5D] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                <Pill className="w-3.5 h-3.5" />
                <span>{t('pharmacy.hospital_counter')}</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5 group-hover:text-[#123B5D] transition-colors flex items-center justify-between">
                  <span>{t('nav.pharmacy')}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#123B5D] transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('pharmacy.subtitle')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-[#123B5D] dark:text-[#38BDF8]">
                {t('pharmacy.all_medicines')} • {t('pharmacy.home_delivery')}
              </div>
            </div>
          </Link>

          {/* Service Card 3: Diagnostic Labs */}
          <Link
            to="/lab"
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-subtle hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80"
                alt="Diagnostic Laboratory Tests"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#0D9488] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>{t('lab.nabl_accredited')}</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5 group-hover:text-[#0D9488] transition-colors flex items-center justify-between">
                  <span>{t('nav.lab_tests')}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0D9488] transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('lab.subtitle')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-[#0D9488]">
                {t('lab.browse_catalogue')} • {t('lab.home_pickup_avail')}
              </div>
            </div>
          </Link>

          {/* Service Card 4: AI Report Explainer */}
          <Link
            to="/ai-report-explainer"
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-subtle hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80"
                alt="AI Medical Report Analysis"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-rose-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Multilingual AI</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5 group-hover:text-rose-600 transition-colors flex items-center justify-between">
                  <span>{t('nav.ai_explainer')}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-rose-600 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('ai_explainer.subtitle')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-rose-600">
                10 Regional Languages • Clinical Safety
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 3. VERIFIED DOCTOR SPECIALISTS DIRECTORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-[#0D9488]">
              Accredited Medical Faculty
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {t('home.find_doctor_title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Consult experienced consultants across participating multispecialty hospitals.
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
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>
            <Link
              to="/doctors"
              className="text-xs sm:text-sm font-semibold text-[#0D9488] hover:underline shrink-0 flex items-center gap-1"
            >
              <span>{t('common.view_all')}</span>
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
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-subtle hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#123B5D] to-[#0D9488] text-white flex items-center justify-center font-bold text-lg shadow-md">
                      {doc.name ? doc.name.replace('Dr. ', '').charAt(0) : 'D'}
                    </div>
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
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
                  <p className="text-xs font-semibold text-[#0D9488] mt-0.5">
                    {doc.specialization}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {doc.department_name}
                  </p>

                  {/* Hospital Affiliation & Location */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[#123B5D] shrink-0" />
                      <span className="truncate">{doc.hospital_name || 'Participating Network Hospital'}</span>
                    </div>
                    {doc.hospital_location && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                        <span className="truncate">{doc.hospital_location}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
                    <span>{doc.experience_years} {t('doctors.exp_years')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">Fee: ₹{doc.consultation_fee}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/book?doctor_id=${doc.id || doc.doctor_id}&dept_id=${doc.department_id}&hospital_id=${doc.hospital_id || ''}`}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#123B5D] to-[#0D9488] hover:from-[#0e304d] hover:to-[#0f766e] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-subtle"
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

      {/* 4. EMERGENCY SOS & 24/7 TRAUMA SPOTLIGHT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 text-white p-6 sm:p-10 shadow-glow-sos flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10 space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white">
              <ShieldAlert className="w-4 h-4 text-amber-200" />
              <span>24/7 Rapid Emergency Response Desk</span>
            </div>
            <h3 className="text-xl sm:text-3xl font-black tracking-tight">
              Facing a Medical Emergency? We Are Ready.
            </h3>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              Instantly dial verified national trauma numbers or send a prioritized emergency request with optional GPS location sharing directly to hospital administrators.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <a
              href="tel:108"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-red-700 hover:bg-red-50 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <PhoneCall className="w-4 h-4 text-red-600" />
              <span>{t('footer.dial_108')}</span>
            </a>
            <button
              onClick={() => {
                const sosBtn = document.querySelector('button[title*="Emergency SOS"]') as HTMLButtonElement;
                if (sosBtn) sosBtn.click();
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-950/40 hover:bg-slate-950/60 backdrop-blur-md text-white font-bold text-sm border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{t('emergency_sos.title')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. CLINICAL DEPARTMENTS EXCELLENCE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-wider font-extrabold text-[#0D9488]">
            Multi-Disciplinary Centers
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {t('home.departments_title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated institutes covering tertiary surgery, cardiology, neurosciences, and primary care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-subtle hover:shadow-premium hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-[#0D9488] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 group-hover:text-[#0D9488] transition-colors">
                {dept.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">
                {dept.description}
              </p>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Multi-Hospital Network</span>
                <Link
                  to={`/doctors?department_id=${dept.id}`}
                  className="text-[#0D9488] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Specialists</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. MULTILINGUAL AI ASSISTANT SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#0d2a42] via-[#123B5D] to-[#0D9488] text-white p-8 sm:p-12 relative overflow-hidden shadow-premium">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-200 text-xs font-semibold">
              <Bot className="w-4 h-4 text-teal-300" />
              <span>CareSphere Multilingual AI Engine</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ask in Tamil, Hindi, Telugu, or Any of 10 Indian Languages
            </h2>

            <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
              Have questions about doctor schedules, visiting hours, necessary appointment documents, or hospital facilities? CareSphere AI assistant communicates natively in your chosen language with instant, verified hospital facts and emergency triage detection.
            </p>

            {/* Audio Wave Visualizer Simulation */}
            <div className="flex items-center gap-2 pt-2 text-xs text-teal-200">
              <span className="font-semibold">Native Speech Synthesis:</span>
              <div className="flex items-center gap-1 h-4">
                <span className="w-1 bg-teal-300 rounded-full h-2 wave-bar-1" />
                <span className="w-1 bg-teal-400 rounded-full h-4 wave-bar-2" />
                <span className="w-1 bg-[#38BDF8] rounded-full h-3 wave-bar-3" />
                <span className="w-1 bg-teal-300 rounded-full h-4 wave-bar-1" />
                <span className="w-1 bg-white rounded-full h-2 wave-bar-2" />
              </div>
              <span className="text-[11px] text-teal-300">Active in 10 Regional Languages</span>
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const aiBtn = document.querySelector('button[aria-label="Open AI Assistant"]') as HTMLButtonElement;
                  if (aiBtn) aiBtn.click();
                }}
                className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
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

      {/* 7. FREQUENTLY ASKED QUESTIONS ACCORDION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs uppercase tracking-wider font-extrabold text-[#0D9488]">
            Patient Support
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {t('home.faqs_title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Common queries about booking, hospital admission, cashless insurance, and pharmacy orders.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 hover:text-[#0D9488] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
