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
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { LanguageSelector } from './LanguageSelector.js';
import { NotificationDropdown } from './NotificationDropdown.js';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-teal-500 to-medblue-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <HeartPulse className="w-6 h-6" />
            <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-brand-700 via-teal-700 to-medblue-600 dark:from-brand-300 dark:via-teal-300 dark:to-medblue-400 bg-clip-text text-transparent">
                CareSphere
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hidden sm:inline-block">
                AI Health
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block leading-none mt-0.5">
              {t('app.tagline')}
            </p>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link
            to="/"
            className={`px-3 py-2 rounded-xl transition-colors ${
              isActive('/') ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-slate-800' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/doctors"
            className={`px-3 py-2 rounded-xl transition-colors ${
              isActive('/doctors') ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-slate-800' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {t('nav.doctors')}
          </Link>
          <Link
            to="/departments"
            className={`px-3 py-2 rounded-xl transition-colors ${
              isActive('/departments') ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-slate-800' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {t('nav.departments')}
          </Link>
          <Link
            to="/facilities"
            className={`px-3 py-2 rounded-xl transition-colors ${
              isActive('/facilities') ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-slate-800' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {t('nav.facilities')}
          </Link>

          {/* Role specific dashboard link */}
          {isAuthenticated && role === 'patient' && (
            <Link
              to="/dashboard/patient"
              className={`px-3 py-2 rounded-xl transition-colors ${
                isActive('/dashboard/patient') ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-slate-800' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {t('nav.patient_dashboard')}
            </Link>
          )}

          {isAuthenticated && role === 'doctor' && (
            <Link
              to="/dashboard/doctor"
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                isActive('/dashboard/doctor') ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-slate-800' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-brand-600" />
              <span>{t('nav.doctor_dashboard')}</span>
            </Link>
          )}

          {isAuthenticated && role === 'admin' && (
            <Link
              to="/dashboard/admin"
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                isActive('/dashboard/admin') ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-slate-800' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>{t('nav.admin_dashboard')}</span>
            </Link>
          )}
        </nav>

        {/* Right Action Tools: Language, Theme, Notifications, Auth */}
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

          {/* Primary Action Button: Book Appointment */}
          <Link
            to="/book"
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-brand-500/20 hover:shadow-lg transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>{t('nav.book_appointment')}</span>
          </Link>

          {/* Auth State Button */}
          {isAuthenticated && user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to={role === 'doctor' ? '/dashboard/doctor' : role === 'admin' ? '/dashboard/admin' : '/dashboard/patient'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-brand-600" />
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
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
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
        <div className="lg:hidden px-4 pt-2 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/doctors"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.doctors')}
          </Link>
          <Link
            to="/departments"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.departments')}
          </Link>
          <Link
            to="/facilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('nav.facilities')}
          </Link>
          <Link
            to="/book"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300"
          >
            {t('nav.book_appointment')}
          </Link>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <Link
                to={role === 'doctor' ? '/dashboard/doctor' : role === 'admin' ? '/dashboard/admin' : '/dashboard/patient'}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-semibold text-brand-600 dark:text-brand-400"
              >
                {role === 'doctor' ? t('nav.doctor_dashboard') : role === 'admin' ? t('nav.admin_dashboard') : t('nav.patient_dashboard')}
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {t('nav.sign_out')} ({user?.name})
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {t('nav.sign_in')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-semibold rounded-xl bg-brand-600 text-white"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
