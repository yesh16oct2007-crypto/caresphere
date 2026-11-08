import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Sparkles,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ShieldCheck,
  Stethoscope,
  Video,
  FileCheck,
  Shield,
  FlaskConical,
  Pill,
  ShieldAlert,
  ChevronDown,
  Activity,
  Navigation,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { LanguageSelector } from './LanguageSelector.js';
import { NotificationDropdown } from './NotificationDropdown.js';
import { EmergencySOSModal } from './EmergencySOSModal.js';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;
  const isAdminRole = role === 'admin' || role === 'hospital_admin' || role === 'superadmin' || role === 'lab_staff' || role === 'pharmacy_staff';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#123B5D] via-[#0D9488] to-[#38BDF8] flex items-center justify-center text-white shadow-md shadow-[#123B5D]/20 group-hover:scale-105 transition-all duration-300">
            <HeartPulse className="w-6 h-6 text-white" />
            <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#123B5D] dark:text-white">
                Care<span className="text-[#0D9488] dark:text-[#38BDF8]">Sphere</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hidden sm:inline-block">
                AI Health
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block leading-none mt-0.5">
              {t('app.tagline')}
            </p>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Link
            to="/doctors"
            className={`px-3 py-2 rounded-xl transition-all duration-200 ${
              isActive('/doctors')
                ? 'text-[#123B5D] dark:text-teal-300 font-bold bg-teal-50/70 dark:bg-slate-800 shadow-2xs'
                : 'hover:text-[#123B5D] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            {t('nav.doctors')}
          </Link>

          <Link
            to="/teleconsult"
            className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
              isActive('/teleconsult')
                ? 'text-[#0D9488] dark:text-teal-300 font-bold bg-teal-50/80 dark:bg-slate-800'
                : 'hover:text-[#0D9488] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>{t('nav.teleconsult')}</span>
          </Link>

          <Link
            to="/pharmacy"
            className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
              isActive('/pharmacy')
                ? 'text-[#123B5D] dark:text-[#38BDF8] font-bold bg-sky-50 dark:bg-slate-800'
                : 'hover:text-[#123B5D] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-sky-600" />
            <span>{t('nav.pharmacy')}</span>
          </Link>

          <Link
            to="/lab"
            className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
              isActive('/lab')
                ? 'text-[#0D9488] dark:text-teal-300 font-bold bg-teal-50 dark:bg-slate-800'
                : 'hover:text-[#0D9488] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>{t('nav.lab_tests')}</span>
          </Link>

          <Link
            to="/insurance"
            className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
              isActive('/insurance')
                ? 'text-[#0D9488] dark:text-teal-300 font-bold bg-teal-50 dark:bg-slate-800'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('nav.insurance')}</span>
          </Link>

          <Link
            to="/ai-report-explainer"
            className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
              isActive('/ai-report-explainer')
                ? 'text-[#0D9488] dark:text-teal-300 font-bold bg-teal-50 dark:bg-slate-800'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>{t('nav.ai_explainer')}</span>
          </Link>

          {/* More Services Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              onBlur={() => setTimeout(() => setMoreMenuOpen(false), 250)}
              className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                isActive('/resources') || isActive('/indoor-navigation') || isActive('/records')
                  ? 'text-[#0D9488] dark:text-teal-300 font-bold bg-teal-50 dark:bg-slate-800'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>{t('nav.facilities')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <Link
                  to="/resources"
                  onClick={() => setMoreMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors ${
                    isActive('/resources') ? 'text-[#0D9488] font-bold' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div>{t('nav.resources')}</div>
                    <div className="text-[10px] text-slate-400 font-normal">Live ICU, beds & ambulances</div>
                  </div>
                </Link>
                <Link
                  to="/indoor-navigation"
                  onClick={() => setMoreMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors ${
                    isActive('/indoor-navigation') ? 'text-[#0D9488] font-bold' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Navigation className="w-4 h-4 text-sky-500 shrink-0" />
                  <div>
                    <div>{t('nav.indoor_navigation')}</div>
                    <div className="text-[10px] text-slate-400 font-normal">Hospital floor maps & turn-by-turn</div>
                  </div>
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/records"
                    onClick={() => setMoreMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors ${
                      isActive('/records') ? 'text-[#0D9488] font-bold' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                    <div>
                      <div>{t('nav.medical_records')}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Encrypted digital health vault</div>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Role specific dashboard link */}
          {isAuthenticated && role === 'patient' && (
            <Link
              to="/dashboard/patient"
              className={`px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive('/dashboard/patient')
                  ? 'text-[#123B5D] dark:text-white font-bold bg-brand-50/70 dark:bg-slate-800'
                  : 'hover:text-[#123B5D] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              {t('nav.patient_dashboard')}
            </Link>
          )}

          {isAuthenticated && role === 'doctor' && (
            <Link
              to="/dashboard/doctor"
              className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                isActive('/dashboard/doctor')
                  ? 'text-[#123B5D] dark:text-white font-bold bg-brand-50/70 dark:bg-slate-800'
                  : 'hover:text-[#123B5D] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-[#0D9488]" />
              <span>{t('nav.doctor_dashboard')}</span>
            </Link>
          )}

          {isAuthenticated && isAdminRole && (
            <Link
              to="/dashboard/admin"
              className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                isActive('/dashboard/admin')
                  ? 'text-[#123B5D] dark:text-white font-bold bg-brand-50/70 dark:bg-slate-800'
                  : 'hover:text-[#123B5D] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#123B5D] dark:text-[#38BDF8]" />
              <span>{t('nav.admin_dashboard')}</span>
            </Link>
          )}
        </nav>

        {/* Right Action Tools: Language, Theme, SOS, Appointments, Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector Dropdown */}
          <LanguageSelector />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notification Bell */}
          {isAuthenticated && <NotificationDropdown />}

          {/* Emergency SOS High-Visibility Alert Button */}
          <button
            onClick={() => setSosModalOpen(true)}
            className="relative flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black shadow-glow-sos transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Emergency SOS Assistance Desk"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>SOS</span>
          </button>

          {/* Primary Action Button: Book Appointment */}
          <Link
            to="/book"
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-[#123B5D] to-[#0D9488] hover:from-[#0e304d] hover:to-[#0f766e] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-[#123B5D]/20 hover:shadow-lg transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>{t('nav.book_appointment')}</span>
          </Link>

          {/* Auth State Button */}
          {isAuthenticated && user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to={role === 'doctor' ? '/dashboard/doctor' : isAdminRole ? '/dashboard/admin' : '/dashboard/patient'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#0D9488]" />
                <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title={t('nav.sign_out')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('nav.sign_in')}
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#123B5D] text-white hover:bg-[#0e304d] dark:bg-white dark:text-[#123B5D] dark:hover:bg-slate-100 transition-colors shadow-subtle"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md space-y-1.5 animate-in slide-in-from-top-2 duration-150 text-xs">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/doctors"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.doctors')}
          </Link>
          <Link
            to="/teleconsult"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800"
          >
            {t('nav.online_video_teleconsult')}
          </Link>
          <Link
            to="/pharmacy"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800"
          >
            {t('nav.hospital_pharmacy_orders')}
          </Link>
          <Link
            to="/lab"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800"
          >
            {t('nav.lab_tests_booking')}
          </Link>
          <Link
            to="/insurance"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.insurance_desk_long')}
          </Link>
          <Link
            to="/ai-report-explainer"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.ai_explainer_long')}
          </Link>
          <Link
            to="/resources"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800"
          >
            {t('nav.resources')}
          </Link>
          <Link
            to="/indoor-navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800"
          >
            {t('nav.indoor_navigation')}
          </Link>

          {/* Mobile Emergency SOS Button */}
          <button
            onClick={() => {
              setSosModalOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3.5 py-2.5 rounded-xl font-extrabold text-white bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-between shadow-glow-sos"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{t('nav.emergency_sos_caps')}</span>
            </div>
            <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-black">24x7</span>
          </button>

          <Link
            to="/book"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl font-semibold bg-gradient-to-r from-[#123B5D] to-[#0D9488] text-white shadow-sm"
          >
            {t('nav.book_appointment')}
          </Link>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <Link
                to={role === 'doctor' ? '/dashboard/doctor' : isAdminRole ? '/dashboard/admin' : '/dashboard/patient'}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl font-semibold text-[#123B5D] dark:text-[#38BDF8]"
              >
                {role === 'doctor'
                  ? t('nav.doctor_dashboard')
                  : isAdminRole
                  ? t('nav.admin_dashboard')
                  : t('nav.patient_dashboard')}
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-xl font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {t('nav.sign_out')} ({user?.name})
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {t('nav.sign_in')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 font-semibold rounded-xl bg-[#123B5D] text-white shadow-sm"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Emergency SOS High-Alert Modal */}
      <EmergencySOSModal isOpen={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </header>
  );
};
