import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  User,
  Stethoscope,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiUrl } from '../services/api.js';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Backend server unreachable (HTTP ${res.status}). Ensure the CareSphere backend is running on port 5001.`);
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Login failed. Please verify your credentials.');
        return;
      }

      login(data.token, data.user);

      // Handle redirect
      if (redirectPath) {
        navigate(redirectPath);
      } else if (data.user.role === 'admin') {
        navigate('/dashboard/admin');
      } else if (data.user.role === 'doctor') {
        navigate('/dashboard/doctor');
      } else {
        navigate('/dashboard/patient');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Network error. Please make sure the CareSphere backend server is running on port 5001.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 p-7 sm:p-9 shadow-xl shadow-brand-500/5 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-sky-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('auth.login_title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('auth.login_sub')}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>{isLoading ? 'Signing in...' : t('auth.sign_in_btn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials Autofill */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            {t('auth.quick_demo_login')}
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoFill('ravi.kumar@example.com', 'Patient@12345')}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-brand-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-left transition-colors flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-brand-600" />
              <span className="truncate">{t('auth.demo_patient')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill('dr.sharma@caresphere.health', 'Doctor@12345')}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-teal-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-left transition-colors flex items-center gap-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span className="truncate">{t('auth.demo_doctor')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill('dr.anand@caresphere.health', 'Doctor@12345')}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-amber-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-left transition-colors flex items-center gap-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5 text-amber-600" />
              <span className="truncate">{t('auth.demo_pending_doc')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill('admin@caresphere.health', 'Admin@12345')}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-purple-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-left transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span className="truncate">{t('auth.demo_admin')}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('auth.dont_have_account')}{' '}
          <Link to="/register" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
            {t('auth.register_here')}
          </Link>
        </div>
      </div>
    </div>
  );
};
