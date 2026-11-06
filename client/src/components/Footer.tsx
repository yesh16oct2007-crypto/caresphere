import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Sparkles,
  PhoneCall,
  MapPin,
  Mail,
  ShieldCheck,
  Award,
  Globe,
  Building2,
  Calendar,
  Pill,
  FlaskConical,
  Video,
  ShieldAlert
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { setLanguage } = useAuth();

  return (
    <footer className="bg-[#0e2c45] text-slate-300 border-t border-slate-800 transition-colors">
      {/* 24/7 Emergency & Rapid Action Hotline Strip */}
      <div className="bg-[#0a2135] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="font-extrabold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>National & Hospital Emergency Response:</span>
            </span>
            <span className="text-slate-400 hidden sm:inline">24x7 Critical Care & Trauma Dispatch</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <a
              href="tel:108"
              className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors shadow-2xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Dial 108 (National Ambulance)</span>
            </a>
            <a
              href="tel:+918022739911"
              className="flex items-center gap-1.5 text-teal-300 hover:text-white transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Hospital Trauma: +91-80-CARE-911</span>
            </a>
            <span className="text-slate-400 hidden lg:inline">|</span>
            <a
              href="tel:+918049112000"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <span>General OPD: +91-80-4911-2000</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#123B5D] via-[#0D9488] to-[#38BDF8] flex items-center justify-center text-white shadow-md">
                <HeartPulse className="w-6 h-6" />
                <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-white tracking-tight">
                  Care<span className="text-[#38BDF8]">Sphere</span>
                </span>
                <p className="text-xs text-teal-300 font-medium">{t('app.tagline')}</p>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              CareSphere is an AI-powered multi-hospital healthcare platform offering inclusive, multilingual medical consultations, online pharmacy orders, digital prescriptions, and emergency assistance across partner medical institutions.
            </p>

            {/* Accreditations Badges */}
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1.5 bg-slate-800/80 text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/20">
                <Award className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>NABH Accredited</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>NABL Diagnostic Lab</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>ISO 9001:2015</span>
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Clinical Care</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/doctors" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  Find Doctor Specialists
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-teal-300 transition-colors font-medium text-teal-400 flex items-center gap-1.5">
                  Book OPD Appointment
                </Link>
              </li>
              <li>
                <Link to="/teleconsult" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  Online Video Teleconsult
                </Link>
              </li>
              <li>
                <Link to="/pharmacy" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  Online Pharmacy & Medicines
                </Link>
              </li>
              <li>
                <Link to="/lab" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  Diagnostic Lab Tests
                </Link>
              </li>
            </ul>
          </div>

          {/* Partner Hospital Network */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Hospital Network</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="hover:text-slate-200">CareSphere Multispeciality (Bengaluru)</li>
              <li className="hover:text-slate-200">Apollo Health City (Hyderabad)</li>
              <li className="hover:text-slate-200">Fortis Escorts Heart Institute (Delhi)</li>
              <li className="hover:text-slate-200">Manipal Hospital (Bengaluru)</li>
              <li className="hover:text-slate-200">Max Super Speciality (Gurugram)</li>
              <li className="hover:text-slate-200">Narayana Health City (Electronic City)</li>
            </ul>
          </div>

          {/* Multilingual Selector Shortcuts */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#38BDF8]" />
              <span>Languages</span>
            </h4>
            <p className="text-xs text-slate-400 mb-2">Instant language switch:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className="px-2 py-1 rounded-md bg-slate-800/90 hover:bg-[#123B5D] text-slate-300 hover:text-white text-[11px] border border-slate-700/80 transition-colors cursor-pointer"
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 CareSphere Multi-Hospital Technology Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>HIPAA-Compliant Architecture</span>
            <span>•</span>
            <span>ABDM Ready</span>
            <span>•</span>
            <span>Demonstration System</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
