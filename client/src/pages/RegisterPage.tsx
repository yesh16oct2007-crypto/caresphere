import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  User,
  Stethoscope,
  Lock,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Globe,
  Upload,
  FileCheck,
  Trash2,
  ShieldCheck,
  Building2,
  Award,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { Department } from '../types/index.js';
import { apiUrl } from '../services/api.js';

export const POPULAR_HOSPITAL_LOCATIONS = [
  { name: 'CareSphere Super Specialty Hospital', location: 'Central Campus, Outer Ring Road, Bellandur, Bengaluru' },
  { name: 'CareSphere Multi-Specialty Hospital', location: 'Greams Road Campus, Thousand Lights, Chennai' },
  { name: 'CareSphere Advanced Healthcare Center', location: 'Hitec City Medical Enclave, Madhapur, Hyderabad' },
  { name: 'Apollo Hospitals - Bannerghatta', location: 'Bannerghatta Main Road, Opposite IIMB, Bengaluru' },
  { name: 'Fortis Hospital - Cunningham Road', location: '14, Cunningham Road, Vasanth Nagar, Bengaluru' },
  { name: 'Manipal Hospital - Old Airport Road', location: '98, HAL Old Airport Road, Kodihalli, Bengaluru' },
  { name: 'Max Super Specialty Hospital - Saket', location: '1, 2, Press Enclave Marg, Saket, New Delhi' },
  { name: 'Narayana Multispeciality Hospital - Whitefield', location: '3 & 4, ITPL Main Road, Whitefield, Bengaluru' },
  { name: 'AIIMS - All India Institute of Medical Sciences', location: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi' }
];

export const STATE_MEDICAL_COUNCILS = [
  'National Medical Commission (NMC) / Medical Council of India',
  'Tamil Nadu Medical Council',
  'Karnataka Medical Council',
  'Maharashtra Medical Council',
  'Delhi Medical Council',
  'Andhra Pradesh Medical Council',
  'Telangana State Medical Council',
  'West Bengal Medical Council',
  'Kerala State Medical Council',
  'Gujarat Medical Council',
  'Punjab Medical Council',
  'Uttar Pradesh Medical Council',
  'Madhya Pradesh Medical Council',
  'Rajasthan Medical Council',
  'Other State Medical Council'
];

export const RegisterPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'patient' | 'doctor' | 'hospital_admin'>('patient');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(i18n.language || 'en');

  // Hospital Admin Fields
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | ''>('');
  const [isNewHospital, setIsNewHospital] = useState(false);
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newHospitalCode, setNewHospitalCode] = useState('');
  const [newHospitalCity, setNewHospitalCity] = useState('');
  const [newHospitalLocation, setNewHospitalLocation] = useState('');
  const [newHospitalHotline, setNewHospitalHotline] = useState('');

  // Patient Fields
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [consent, setConsent] = useState(true);

  // Doctor Fields
  const [hospitalName, setHospitalName] = useState('CareSphere Super Specialty Hospital');
  const [hospitalLocation, setHospitalLocation] = useState('Main Campus, Bengaluru');
  const [regNumber, setRegNumber] = useState('');
  const [stateMedicalCouncil, setStateMedicalCouncil] = useState(STATE_MEDICAL_COUNCILS[0]);
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [specialization, setSpecialization] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experienceYears, setExperienceYears] = useState(5);
  const [consultationFee, setConsultationFee] = useState(600);
  const [bio, setBio] = useState('');

  // Certificate & Document Upload States
  const [councilCertFile, setCouncilCertFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [degreeCertFile, setDegreeCertFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [idProofFile, setIdProofFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [doctorSubmittedSuccess, setDoctorSubmittedSuccess] = useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: { name: string; size: string; dataUrl: string } | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`File "${file.name}" exceeds 5MB. Please choose a file smaller than 5MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        dataUrl: reader.result as string
      });
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetch(apiUrl('/api/hospital/departments'))
      .then(res => res.json())
      .then(data => {
        setDepartments(data.departments || []);
        if (data.departments?.[0]) setDepartmentId(data.departments[0].id);
      })
      .catch(err => console.error(err));

    fetch(apiUrl('/api/hospitals'))
      .then(res => res.json())
      .then(data => {
        const list = data.hospitals || [];
        setHospitals(list);
        if (list.length > 0) setSelectedHospitalId(list[0].id);
      })
      .catch(err => console.error(err));
  }, []);

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (!consent) {
      setErrorMsg('You must agree to the privacy and health data terms.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          preferred_language: preferredLanguage,
          date_of_birth: dob || null,
          gender,
          blood_group: bloodGroup,
          address,
          consent
        })
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Backend server unreachable (HTTP ${res.status}). Ensure the CareSphere backend is running on port 5001.`);
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed.');
        return;
      }

      login(data.token, data.user);
      navigate('/dashboard/patient');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Network error. Please make sure the CareSphere backend server is running on port 5001.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !regNumber || !specialization || !qualifications) {
      setErrorMsg('Please fill in all mandatory medical credential fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(apiUrl('/api/auth/register-doctor'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          hospital_name: hospitalName,
          hospital_location: hospitalLocation,
          registration_number: regNumber,
          state_medical_council: stateMedicalCouncil,
          department_id: departmentId,
          specialization,
          qualifications,
          experience_years: experienceYears,
          consultation_fee: consultationFee,
          bio,
          preferred_language: preferredLanguage,
          council_certificate_url: councilCertFile?.dataUrl || null,
          degree_certificate_url: degreeCertFile?.dataUrl || null,
          id_proof_url: idProofFile?.dataUrl || null
        })
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Backend server unreachable (HTTP ${res.status}). Ensure the CareSphere backend is running on port 5001.`);
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Doctor registration failed.');
        return;
      }

      login(data.token, data.user);
      setDoctorSubmittedSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Network error. Please make sure the CareSphere backend server is running on port 5001.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHospitalAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg('Please enter your administrator name, official work email, and password.');
      return;
    }

    if (isNewHospital && (!newHospitalName || !newHospitalCity)) {
      setErrorMsg('Please enter the new hospital facility name and city.');
      return;
    }

    if (!isNewHospital && !selectedHospitalId) {
      setErrorMsg('Please select your affiliated hospital facility.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(apiUrl('/api/auth/register-hospital-admin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          preferred_language: preferredLanguage,
          hospital_id: isNewHospital ? null : selectedHospitalId,
          new_hospital_name: isNewHospital ? newHospitalName : null,
          new_hospital_code: isNewHospital ? newHospitalCode : null,
          new_hospital_city: isNewHospital ? newHospitalCity : null,
          new_hospital_location: isNewHospital ? newHospitalLocation : null,
          new_hospital_hotline: isNewHospital ? newHospitalHotline : null
        })
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Backend server unreachable (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Hospital Administrator registration failed.');
        return;
      }

      login(data.token, data.user);
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (doctorSubmittedSuccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Application Received!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your medical credentials and registration number (<strong>{regNumber}</strong>) have been securely logged. The hospital administration committee will review your documents.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard/doctor"
              className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-xs inline-block"
            >
              Go to Doctor Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-9 shadow-xl shadow-brand-500/5 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800 text-[11px] font-bold mb-1">
            <HeartPulse className="w-3.5 h-3.5 text-brand-600" />
            <span>CareSphere Health Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Sign up to access consultations and hospital services in your preferred language
          </p>
        </div>

        {/* Tab Switcher: Patient vs Doctor vs Hospital Admin */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700">
          <button
            type="button"
            onClick={() => { setActiveTab('patient'); setErrorMsg(null); }}
            className={`py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'patient'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('auth.register_patient_title')}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('doctor'); setErrorMsg(null); }}
            className={`py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'doctor'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('auth.register_doctor_title')}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('hospital_admin'); setErrorMsg(null); }}
            className={`py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'hospital_admin'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Hospital Admin</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Patient Registration Form */}
        {activeTab === 'patient' && (
          <form onSubmit={handlePatientSubmit} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.email')} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.phone')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.password')} *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Language Preference on Registration */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.preferred_language')} *
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.date_of_birth')}
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.gender')}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.blood_group')}
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.address')}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="City, State"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="consent" className="text-xs text-slate-500 leading-normal cursor-pointer">
                {t('auth.consent_terms')}
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Creating Account...' : t('auth.create_account_btn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 2. Doctor Registration Form */}
        {activeTab === 'doctor' && (
          <form onSubmit={handleDoctorSubmit} className="space-y-4 text-xs sm:text-sm">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
              Doctor accounts require credential verification by Hospital Administration before becoming visible to patients.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Anand Verma"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-9876543200"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Hospital Affiliation & Practice Location */}
            <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-slate-900/60 border border-brand-200/70 dark:border-brand-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-950/80 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-900 dark:text-brand-300">
                    Hospital Affiliation & Practice Location *
                  </h3>
                </div>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                  Required for Patient Navigation
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    Hospital / Institution Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g. Apollo, Fortis, CareSphere, or any hospital name"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    Hospital Location / City / Campus *
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={hospitalLocation}
                      onChange={(e) => setHospitalLocation(e.target.value)}
                      placeholder="e.g. Bannerghatta Road, Bengaluru or South Delhi Campus"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Select Hospital Suggestions */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">
                  Select from accredited partner hospitals or type any medical institution above:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_HOSPITAL_LOCATIONS.map((loc, idx) => {
                    const isSelected = hospitalName === loc.name && hospitalLocation === loc.location;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setHospitalName(loc.name);
                          setHospitalLocation(loc.location);
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all font-medium ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400'
                        }`}
                      >
                        {loc.name.replace('Hospital', 'Hosp.').replace('Super Specialty', 'SS')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. MCI-2019-94812"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State Medical Council *
                </label>
                <select
                  value={stateMedicalCouncil}
                  onChange={(e) => setStateMedicalCouncil(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  {STATE_MEDICAL_COUNCILS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Department *
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specialization *
                </label>
                <input
                  type="text"
                  required
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Interventional Cardiology"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Degrees / Qualifications *
                </label>
                <input
                  type="text"
                  required
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="MBBS, MD, DM"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Experience
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fee (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Professional Bio & Achievements
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Summary of experience, publications, fellowships..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              />
            </div>

            {/* Secure Certificate & Credential Uploads Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Secure Certificate & Credential Uploads
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Upload your council registration certificate and medical degree for authoritative credential verification by the hospital administration committee. PDF, PNG, JPG (Max 5MB each).
              </p>

              {/* 1. Council Certificate Upload */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    1. State Medical Council Registration Certificate *
                  </span>
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">Mandatory</span>
                </div>

                {councilCertFile ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-medium truncate">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{councilCertFile.name}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">({councilCertFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCouncilCertFile(null)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-xl p-3 cursor-pointer transition-colors bg-white dark:bg-slate-800/80">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Select Medical Council Certificate
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => handleFileUpload(e, setCouncilCertFile)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 2. Degree Certificate Upload */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    2. MBBS / Specialization Degree Certificate *
                  </span>
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">Mandatory</span>
                </div>

                {degreeCertFile ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-medium truncate">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{degreeCertFile.name}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">({degreeCertFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDegreeCertFile(null)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-xl p-3 cursor-pointer transition-colors bg-white dark:bg-slate-800/80">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Select Degree / Post-Graduation Certificate
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => handleFileUpload(e, setDegreeCertFile)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 3. Identity Proof Upload (Optional) */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    3. Government Photo Identity Card (Aadhaar / Passport)
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Recommended</span>
                </div>

                {idProofFile ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-medium truncate">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{idProofFile.name}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">({idProofFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIdProofFile(null)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-xl p-3 cursor-pointer transition-colors bg-white dark:bg-slate-800/80">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Select Government Identity Proof (Optional)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => handleFileUpload(e, setIdProofFile)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Submitting Application...' : t('auth.submit_doctor_btn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 3. Hospital Admin Registration Form */}
        {activeTab === 'hospital_admin' && (
          <form onSubmit={handleHospitalAdminSubmit} className="space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-2xl flex items-start gap-3">
              <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div className="text-xs text-brand-900 dark:text-brand-200 leading-relaxed">
                <strong>Hospital Administrator Access:</strong> Authorizes administrative management for hospital emergency assistance, laboratory test bookings & reports, pharmacy inventory & medicine orders, and live hospital resource availability.
              </div>
            </div>

            {/* Hospital Facility Selection */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                  Associated Hospital Facility *
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewHospital(!isNewHospital)}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {isNewHospital ? '← Select Existing Hospital' : '+ Register New Hospital'}
                </button>
              </div>

              {!isNewHospital ? (
                <div>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-medium"
                  >
                    <option value="">-- Choose Participating Hospital --</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                      Hospital Facility Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Super Specialty Hospital"
                      value={newHospitalName}
                      onChange={(e) => setNewHospitalName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bengaluru, Chennai, Mumbai"
                        value={newHospitalCity}
                        onChange={(e) => setNewHospitalCity(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                        Facility Code (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. APL-BLR-02"
                        value={newHospitalCode}
                        onChange={(e) => setNewHospitalCode(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                      Campus / Street Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bannerghatta Road Campus"
                      value={newHospitalLocation}
                      onChange={(e) => setNewHospitalLocation(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                      Emergency Department Hotline
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 1066 or +91-80-2630-4050"
                      value={newHospitalHotline}
                      onChange={(e) => setNewHospitalHotline(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Administrator Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Nair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@hospital.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91-9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-medium"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password * (min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Creating Administrator Account...' : 'Register as Hospital Administrator'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-slate-500">
          {t('auth.already_have_account')}{' '}
          <Link to="/login" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
            {t('auth.sign_in_here')}
          </Link>
        </div>
      </div>
    </div>
  );
};
