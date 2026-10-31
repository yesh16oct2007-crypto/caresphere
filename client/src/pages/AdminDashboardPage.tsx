import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Building2,
  Stethoscope,
  Send,
  Trash2,
  Activity,
  Search,
  FileCheck,
  ExternalLink,
  CheckSquare,
  Square,
  MapPin,
  Navigation,
  Eye,
  AlertOctagon,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { User, Appointment, AuditLog } from '../types/index.js';
import { apiUrl } from '../services/api.js';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<'all' | 'pending' | 'verified' | 'suspended' | 'rejected'>('all');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active section tab
  const [activeTab, setActiveTab] = useState<'verification' | 'appointments' | 'users' | 'logs' | 'announcements'>('verification');

  // Authoritative Verification Checklist Modal State
  const [verifyingDoc, setVerifyingDoc] = useState<any | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'verified' | 'pending' | 'rejected' | 'suspended'>('verified');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [checklist, setChecklist] = useState({
    council_reg_verified: false,
    id_verified: false,
    degree_verified: false,
    background_cleared: false,
    chamber_assigned: false
  });
  const [isVerifying, setIsVerifying] = useState(false);

  // Announcement state
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnPriority, setNewAnnPriority] = useState('normal');

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [statsRes, pendingRes, allDocsRes, usersRes, apptsRes, logsRes] = await Promise.all([
        fetch(apiUrl('/api/admin/stats'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/api/admin/pending-doctors'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/api/admin/doctors'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/api/admin/users'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/api/appointments/my'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/api/admin/audit-logs'), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.ok) setStats((await statsRes.json()).stats);
      if (pendingRes.ok) setPendingDoctors((await pendingRes.json()).pending_doctors || []);
      if (allDocsRes.ok) setAllDoctors((await allDocsRes.json()).doctors || []);
      if (usersRes.ok) setUsersList((await usersRes.json()).users || []);
      if (apptsRes.ok) setAppointmentsList((await apptsRes.json()).appointments || []);
      if (logsRes.ok) setAuditLogs((await logsRes.json()).audit_logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const openReviewModal = (doc: any) => {
    setVerifyingDoc(doc);
    let initialChecklist = {
      council_reg_verified: false,
      id_verified: false,
      degree_verified: false,
      background_cleared: false,
      chamber_assigned: false
    };

    if (doc.verification_checklist) {
      try {
        const parsed = typeof doc.verification_checklist === 'string'
          ? JSON.parse(doc.verification_checklist)
          : doc.verification_checklist;
        initialChecklist = { ...initialChecklist, ...parsed };
      } catch (e) {
        // ignore
      }
    } else if (doc.verification_status === 'verified' || doc.verification_status === 'approved') {
      initialChecklist = {
        council_reg_verified: true,
        id_verified: true,
        degree_verified: true,
        background_cleared: true,
        chamber_assigned: true
      };
    }

    setChecklist(initialChecklist);
    setVerifyStatus(
      (doc.verification_status === 'approved' ? 'verified' : doc.verification_status) || 'verified'
    );
    setVerifyNotes(doc.verification_notes || '');
  };

  const handleVerifyDoctorSubmit = async () => {
    if (!verifyingDoc || !token) return;
    setIsVerifying(true);
    try {
      const res = await fetch(apiUrl('/api/admin/verify-doctor'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_profile_id: verifyingDoc.doctor_profile_id,
          status: verifyStatus,
          notes: verifyNotes,
          checklist
        })
      });

      if (res.ok) {
        setVerifyingDoc(null);
        setVerifyNotes('');
        await fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.message || 'Verification update failed.');
      }
    } catch (err) {
      console.error('Verification failed:', err);
      alert('Verification network error.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnContent || !token) return;
    try {
      const res = await fetch(apiUrl('/api/admin/announcements'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newAnnTitle,
          content: newAnnContent,
          priority: newAnnPriority
        })
      });
      if (res.ok) {
        setNewAnnTitle('');
        setNewAnnContent('');
        alert('Announcement published successfully.');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to publish announcement:', err);
    }
  };

  // Filtered doctors list
  const filteredDoctors = allDoctors.filter((doc) => {
    const matchesFilter =
      doctorFilter === 'all'
        ? true
        : doctorFilter === 'verified'
        ? doc.verification_status === 'verified' || doc.verification_status === 'approved'
        : doc.verification_status === doctorFilter;

    const matchesSearch =
      doctorSearch === '' ||
      doc.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.registration_number?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.state_medical_council?.toLowerCase().includes(doctorSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const allPassed =
    checklist.council_reg_verified &&
    checklist.id_verified &&
    checklist.degree_verified &&
    checklist.background_cleared &&
    checklist.chamber_assigned;

  const toggleAllChecks = () => {
    const nextVal = !allPassed;
    setChecklist({
      council_reg_verified: nextVal,
      id_verified: nextVal,
      degree_verified: nextVal,
      background_cleared: nextVal,
      chamber_assigned: nextVal
    });
    if (nextVal && verifyStatus !== 'verified') {
      setVerifyStatus('verified');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-brand-600 dark:text-brand-400">
            CareSphere Governance & Oversight
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            Hospital Administration Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Credential verification, user management, audit review, and hospital broadcast controls.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Admin Access Verified</span>
        </div>
      </div>

      {/* Operational Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Pending Approvals</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats?.pending_doctors || pendingDoctors.length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Verified Doctors</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats?.approved_doctors || allDoctors.filter(d => ['verified', 'approved'].includes(d.verification_status)).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Registered Patients</div>
          <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
            {stats?.total_patients || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Active Bookings</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats?.active_appointments || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Today's Visits</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
            {stats?.today_appointments || 0}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'verification'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Doctor Credential Verification ({pendingDoctors.length} Pending / {allDoctors.length} Total)
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'appointments'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Hospital Appointments
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'users'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          User Accounts ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'logs'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Security Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'announcements'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Publish Announcements
        </button>
      </div>

      {/* 1. Doctor Verification & Governance Queue */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>Doctor Verification & Authoritative Governance</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative checks must be completed before granting the Verified Specialist Badge. Only verified doctors can accept patient bookings.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by doctor, council, reg..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Sub-filter Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              onClick={() => setDoctorFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                doctorFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Doctors ({allDoctors.length})
            </button>
            <button
              onClick={() => setDoctorFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                doctorFilter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
            >
              Pending Review ({allDoctors.filter((d) => d.verification_status === 'pending').length})
            </button>
            <button
              onClick={() => setDoctorFilter('verified')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                doctorFilter === 'verified'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              Verified ({allDoctors.filter((d) => ['verified', 'approved'].includes(d.verification_status)).length})
            </button>
            <button
              onClick={() => setDoctorFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                doctorFilter === 'suspended'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
              }`}
            >
              Suspended ({allDoctors.filter((d) => d.verification_status === 'suspended').length})
            </button>
            <button
              onClick={() => setDoctorFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                doctorFilter === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}
            >
              Rejected ({allDoctors.filter((d) => d.verification_status === 'rejected').length})
            </button>
          </div>

          {filteredDoctors.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              No doctors found under the selected filter criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((doc) => {
                const isVerified = doc.verification_status === 'verified' || doc.verification_status === 'approved';
                const isPending = doc.verification_status === 'pending';
                const isSuspended = doc.verification_status === 'suspended';
                const isRejected = doc.verification_status === 'rejected';

                return (
                  <div
                    key={doc.doctor_profile_id || doc.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {doc.name}
                          </h3>

                          {/* Verification Status Badge */}
                          {isVerified && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified Specialist</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pending Verification</span>
                            </span>
                          )}
                          {isSuspended && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                              <Ban className="w-3.5 h-3.5 text-purple-600" />
                              <span>Suspended</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-1">
                          {doc.specialization} • {doc.department_name}
                        </div>
                      </div>

                      {/* Presence / Location status */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-600" />
                          <span>{doc.room_number || 'Room TBD'} {doc.floor ? `(${doc.floor})` : ''}</span>
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg font-medium text-[11px] ${
                          doc.current_presence_status === 'available'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.current_presence_status === 'in_consultation'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          ● {doc.current_presence_status?.replace('_', ' ') || 'available'}
                        </span>
                      </div>
                    </div>

                    {/* Registration & Credentials Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Hospital Affiliation</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {doc.hospital_name || 'CareSphere Super Specialty Hospital'}
                          {doc.hospital_location ? ` • ${doc.hospital_location}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Medical Council</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {doc.state_medical_council || 'State Medical Council (TBD)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration Number</span>
                        <span className="font-mono font-bold text-brand-700 dark:text-brand-400">
                          {doc.registration_number || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {doc.email} {doc.phone ? `• ${doc.phone}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Qualifications</span>
                        <span className="text-slate-700 dark:text-slate-300">{doc.qualifications}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Experience & Fee</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {doc.experience_years} years • ₹{doc.consultation_fee}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Navigation Route</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate block">
                          {doc.navigation_instructions || 'Take central elevator to specified floor.'}
                        </span>
                      </div>
                    </div>

                    {/* Certificate Documents View */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                        Credentials:
                      </span>
                      {doc.council_certificate_url ? (
                        <a
                          href={doc.council_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Council Certificate</span>
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No council doc</span>
                      )}

                      {doc.degree_certificate_url ? (
                        <a
                          href={doc.degree_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Degree Certificate</span>
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                        </a>
                      ) : null}

                      {doc.id_proof_url ? (
                        <a
                          href={doc.id_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Govt ID Proof</span>
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                        </a>
                      ) : null}

                      {doc.verification_notes && (
                        <span className="text-slate-500 italic ml-2">
                          Note: "{doc.verification_notes}"
                        </span>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => openReviewModal(doc)}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authoritative Verification Review</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Hospital Appointments Monitor */}
      {activeTab === 'appointments' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              All Hospital Bookings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5">Patient</th>
                  <th className="p-3.5">Doctor</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {appointmentsList.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-200">{a.reference_no}</td>
                    <td className="p-3.5 font-medium">{a.patient_name}</td>
                    <td className="p-3.5 font-medium">{a.doctor_name}</td>
                    <td className="p-3.5">{a.department_name}</td>
                    <td className="p-3.5">{a.appointment_date} at {a.appointment_time}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        a.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. User Accounts Directory */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Registered Patients, Doctors & Administrators
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Language</th>
                  <th className="p-3.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-100">{u.name}</td>
                    <td className="p-3.5 text-slate-500">{u.email}</td>
                    <td className="p-3.5 text-slate-500">{u.phone || '—'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'doctor' ? 'bg-teal-100 text-teal-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold uppercase text-brand-600">{u.preferred_language}</td>
                    <td className="p-3.5 text-slate-400">{u.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Security Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              System Audit Trail & Security Events
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Resource</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">{log.created_at}</td>
                    <td className="p-3.5 font-medium">{log.user_name || 'System'} ({log.user_role || 'sys'})</td>
                    <td className="p-3.5 font-bold text-brand-600 dark:text-brand-400">{log.action}</td>
                    <td className="p-3.5 text-slate-500">{log.resource}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-sm truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Publish Announcements */}
      {activeTab === 'announcements' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs max-w-xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Publish Hospital Announcement
          </h2>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Title:
              </label>
              <input
                type="text"
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                placeholder="e.g. Free Health Screening Camp..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Body:
              </label>
              <textarea
                rows={3}
                value={newAnnContent}
                onChange={(e) => setNewAnnContent(e.target.value)}
                placeholder="Announcement details for patients and visitors..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority:
              </label>
              <select
                value={newAnnPriority}
                onChange={(e) => setNewAnnPriority(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              >
                <option value="normal">Normal</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Now</span>
            </button>
          </form>
        </div>
      )}

      {/* Comprehensive Authoritative Verification Checklist Modal */}
      {verifyingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  Authoritative Governance
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-600" />
                  <span>Credential Verification & Checklist Review</span>
                </h3>
              </div>
              <button
                onClick={() => setVerifyingDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Doctor Info Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{verifyingDoc.name}</h4>
                  <p className="text-brand-600 dark:text-brand-400 font-semibold">{verifyingDoc.specialization} • {verifyingDoc.department_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Medical Registration No.</span>
                  <span className="font-mono font-bold text-brand-700 dark:text-brand-400">{verifyingDoc.registration_number}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Hospital & Campus:</span>
                  <strong className="text-brand-700 dark:text-brand-400 truncate block">
                    {verifyingDoc.hospital_name || 'CareSphere Hospital'} ({verifyingDoc.hospital_location || 'Main Campus'})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">State Medical Council:</span>
                  <strong className="text-slate-700 dark:text-slate-300">{verifyingDoc.state_medical_council || 'State Council TBD'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Qualifications:</span>
                  <strong className="text-slate-700 dark:text-slate-300">{verifyingDoc.qualifications}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Chamber Room:</span>
                  <strong className="text-teal-600 dark:text-teal-400">{verifyingDoc.room_number || 'Room TBD'} ({verifyingDoc.floor || 'Floor 1'})</strong>
                </div>
              </div>
            </div>

            {/* Document Verification Links */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                1. Inspect Uploaded Credentials & Proofs:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href={verifyingDoc.council_certificate_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                    verifyingDoc.council_certificate_url
                      ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 hover:bg-teal-100/50'
                      : 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>Council Registration</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {verifyingDoc.council_certificate_url ? 'Click to inspect document' : 'Not provided'}
                  </span>
                </a>

                <a
                  href={verifyingDoc.degree_certificate_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                    verifyingDoc.degree_certificate_url
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 hover:bg-blue-100/50'
                      : 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>Degree Certificate</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {verifyingDoc.degree_certificate_url ? 'Click to inspect document' : 'Not provided'}
                  </span>
                </a>

                <a
                  href={verifyingDoc.id_proof_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                    verifyingDoc.id_proof_url
                      ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300 hover:bg-purple-100/50'
                      : 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>Govt Photo ID</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {verifyingDoc.id_proof_url ? 'Click to inspect document' : 'Not provided'}
                  </span>
                </a>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  2. Administrator Verification Checklist (Mandatory for Verified Status):
                </label>
                <button
                  type="button"
                  onClick={toggleAllChecks}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                >
                  {allPassed ? 'Deselect All' : 'Select All Passed'}
                </button>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checklist.council_reg_verified}
                    onChange={(e) => setChecklist({ ...checklist, council_reg_verified: e.target.checked })}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      State Medical Council Registry Verified
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Verified registration number and active standing directly on the official state medical council or NMC registry.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checklist.id_verified}
                    onChange={(e) => setChecklist({ ...checklist, id_verified: e.target.checked })}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Identity & Photo ID Check
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Doctor name, facial photo, and date of birth confirmed against government identification proof.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checklist.degree_verified}
                    onChange={(e) => setChecklist({ ...checklist, degree_verified: e.target.checked })}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Degree & Specialization Authenticity Check
                    </span>
                    <p className="text-[11px] text-slate-500">
                      MBBS / MD / MS / DM diplomas and specialized fellowship credentials authenticated.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checklist.background_cleared}
                    onChange={(e) => setChecklist({ ...checklist, background_cleared: e.target.checked })}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Disciplinary & Malpractice Clearance
                    </span>
                    <p className="text-[11px] text-slate-500">
                      No adverse medical tribunal sanctions, malpractice suspensions, or active ethical complaints found.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checklist.chamber_assigned}
                    onChange={(e) => setChecklist({ ...checklist, chamber_assigned: e.target.checked })}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Hospital Chamber & Navigation Configured
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Assigned to consultation chamber, floor, wing, and turn-by-turn navigation instructions mapped for patients.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Decision Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                3. Final Credential Verification Decision:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  verifyStatus === 'verified'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="decision"
                    className="sr-only"
                    checked={verifyStatus === 'verified'}
                    onChange={() => setVerifyStatus('verified')}
                  />
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Grant Verified Specialist badge & enable booking
                  </span>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  verifyStatus === 'pending'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="decision"
                    className="sr-only"
                    checked={verifyStatus === 'pending'}
                    onChange={() => setVerifyStatus('pending')}
                  />
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span>Pending</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Keep under review or request additional proofs
                  </span>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  verifyStatus === 'suspended'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 ring-2 ring-purple-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="decision"
                    className="sr-only"
                    checked={verifyStatus === 'suspended'}
                    onChange={() => setVerifyStatus('suspended')}
                  />
                  <div className="flex items-center gap-1.5 font-bold text-xs text-purple-700 dark:text-purple-400">
                    <Ban className="w-4 h-4" />
                    <span>Suspended</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Temporarily freeze consultations & directory
                  </span>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  verifyStatus === 'rejected'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="decision"
                    className="sr-only"
                    checked={verifyStatus === 'rejected'}
                    onChange={() => setVerifyStatus('rejected')}
                  />
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span>Rejected</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Decline application due to invalid credentials
                  </span>
                </label>
              </div>
            </div>

            {/* Audit Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                4. Administrative Audit Remarks / Justification:
              </label>
              <textarea
                rows={2}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="e.g., Council registration cross-referenced with TNMC registry on Oct 2026. All five authoritative checks passed."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400">
                Action will be permanently recorded in Security Audit Logs.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVerifyingDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  disabled={isVerifying}
                  onClick={handleVerifyDoctorSubmit}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-1.5 ${
                    verifyStatus === 'verified'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : verifyStatus === 'suspended'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : verifyStatus === 'rejected'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isVerifying ? 'Updating...' : `Save Decision (${verifyStatus.toUpperCase()})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
