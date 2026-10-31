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
  Globe
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { setLanguage } = useAuth();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-medblue-500 flex items-center justify-center text-white shadow-md">
                <HeartPulse className="w-6 h-6" />
                <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-white tracking-tight">CareSphere</span>
                <p className="text-xs text-brand-400 font-medium">{t('app.tagline')}</p>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              CareSphere is an AI-powered hospital information and patient assistance platform dedicated to providing inclusive, high-standard healthcare across all major Indian languages.
            </p>

            {/* Accreditations Badges */}
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 bg-slate-800/90 text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/20">
                <Award className="w-3.5 h-3.5" />
                <span>NABH Accredited</span>
              </span>
              <span className="flex items-center gap-1 bg-slate-800/90 text-blue-300 px-2.5 py-1 rounded-lg border border-blue-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>NABL Lab Certified</span>
              </span>
              <span className="flex items-center gap-1 bg-slate-800/90 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ISO 9001:2015</span>
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Explore</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/doctors" className="hover:text-brand-400 transition-colors">Find a Doctor</Link>
              </li>
              <li>
                <Link to="/departments" className="hover:text-brand-400 transition-colors">Specialized Departments</Link>
              </li>
              <li>
                <Link to="/facilities" className="hover:text-brand-400 transition-colors">Hospital Facilities</Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-brand-400 transition-colors font-medium text-teal-400">Book Appointment</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-400 transition-colors">Patient & Doctor Login</Link>
              </li>
            </ul>
          </div>

          {/* Contact & Emergency */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">24/7 Helpline</h4>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <PhoneCall className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">Emergency Trauma Unit:</span>
                  <a href="tel:+918022739911" className="text-white font-bold hover:text-red-400">+91-80-CARE-911</a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <PhoneCall className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">General OPD Enquiry:</span>
                  <span className="text-slate-200">+91-80-4911-2000</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-400 text-xs leading-relaxed">
                  Healthcare Boulevard, Electronic City Phase 1, Bengaluru 560100
                </span>
              </div>
            </div>
          </div>

          {/* Multilingual Selector Shortcuts */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-brand-400" />
              <span>Languages</span>
            </h4>
            <p className="text-xs text-slate-400 mb-2">Instant language switch:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-brand-900/60 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 CareSphere Multispeciality Hospital Platform. All rights reserved.
          </div>
          <div className="text-center sm:text-right">
            Demonstration Healthcare System — All doctor and patient accounts are for demonstration purposes.
          </div>
        </div>
      </div>
    </footer>
  );
};
