import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Upload,
  Share2,
  Trash2,
  Download,
  History,
  Shield,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiUrl } from '../services/api.js';
import { MedicalRecord, MedicalRecordAccessLog, DoctorProfile } from '../types/index.js';

export const MedicalRecordsPage: React.FC = () => {
  const { t } = useTranslation();
  const { token, user } = useAuth();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [shareModalRecord, setShareModalRecord] = useState<MedicalRecord | null>(null);
  const [auditModalRecord, setAuditModalRecord] = useState<MedicalRecord | null>(null);
  const [accessLogs, setAccessLogs] = useState<MedicalRecordAccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Doctors for sharing
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [shareValidDays, setShareValidDays] = useState(30);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('lab_report');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploadDoctor, setUploadDoctor] = useState('');
  const [uploadHospital, setUploadHospital] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch records
  const fetchRecords = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (selectedType !== 'all') query.set('type', selectedType);
      if (searchQuery) query.set('search', searchQuery);

      const res = await fetch(apiUrl(`/api/records?${query.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to load medical records');
      }
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message || 'Error loading records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRecords();
    } else {
      setLoading(false);
    }
  }, [token, selectedType]);

  // Load doctors for sharing modal
  useEffect(() => {
    if (token) {
      fetch(apiUrl('/api/doctors?limit=50'), {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => setDoctors(data.doctors || []))
        .catch(() => {});
    }
  }, [token]);

  // Handle Document Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('document_type', uploadType);
      formData.append('document_date', uploadDate);
      formData.append('record_date', uploadDate);
      formData.append('doctor_name', uploadDoctor);
      formData.append('hospital_name', uploadHospital);
      formData.append('notes', uploadNotes);

      const res = await fetch(apiUrl('/api/records'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload document');
      }

      setSuccessMsg('Medical document uploaded securely and encrypted in your vault.');
      setUploadModalOpen(false);
      // Reset form
      setUploadTitle('');
      setUploadFile(null);
      setUploadNotes('');
      fetchRecords();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle Secure Download
  const handleDownload = async (record: MedicalRecord) => {
    try {
      const res = await fetch(apiUrl(`/api/records/${record.id}/download`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to retrieve secure document');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = record.file_name || `record-${record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    }
  };

  // Handle Sharing record with doctor
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareModalRecord || !selectedDoctorId) return;

    try {
      const validUntil = new Date(Date.now() + shareValidDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await fetch(apiUrl(`/api/records/${shareModalRecord.id}/share`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: Number(selectedDoctorId),
          valid_until: validUntil
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to share record');
      }

      setSuccessMsg('Consent granted: record successfully shared with doctor.');
      setShareModalRecord(null);
      setSelectedDoctorId('');
      fetchRecords();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Sharing failed');
    }
  };

  // Open Access Audit Logs
  const openAuditLogs = async (record: MedicalRecord) => {
    setAuditModalRecord(record);
    setLoadingLogs(true);
    try {
      const res = await fetch(apiUrl(`/api/records/${record.id}/access-logs`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch access logs');
      const data = await res.json();
      setAccessLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Could not load access logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Delete Record
  const handleDelete = async (recordId: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this medical record from your vault?')) {
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/records/${recordId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete medical record');
      setSuccessMsg('Record deleted successfully.');
      fetchRecords();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Deletion failed');
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.doctor_name && r.doctor_name.toLowerCase().includes(q)) ||
      (r.hospital_name && r.hospital_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              <FileText className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Digital Patient Medical Records
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Secure, end-to-end encrypted health documents vault with granular doctor consent and immutable audit logging.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 hover:to-medblue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-teal-500/20 hover:shadow-lg transition-all text-sm shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Medical Document</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, doctor, or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          {[
            { id: 'all', label: 'All Records' },
            { id: 'lab_report', label: 'Lab Reports' },
            { id: 'prescription', label: 'Prescriptions' },
            { id: 'scan_imaging', label: 'Scans & X-Rays' },
            { id: 'discharge_summary', label: 'Discharge' },
            { id: 'vaccination', label: 'Vaccination' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedType === type.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medical Documents Grid */}
      {!user ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Secure Digital Health Records Vault
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Please sign in to access your encrypted medical documents vault, diagnostic lab tests, prescriptions, and imaging reports.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="/login"
              className="bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 hover:to-medblue-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all text-sm"
            >
              Sign In to Patient Portal
            </a>
            <a
              href="/login"
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
            >
              Doctor Sign In
            </a>
          </div>
        </div>
      ) : loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading secure medical records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No medical documents found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Upload diagnostic reports, lab results, prescriptions, and imaging scans to have them safely stored in your encrypted vault.
          </p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow"
          >
            <Upload className="w-4 h-4" />
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {record.document_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {new Date(record.document_date || (record as any).record_date || record.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 line-clamp-1">
                  {record.title}
                </h3>

                {(record as any).patient_name && (
                  <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-2">
                    Patient: {(record as any).patient_name}
                  </p>
                )}

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
                  {record.doctor_name && (
                    <p className="flex items-center gap-1.5">
                      <span className="text-slate-400">Doctor:</span>
                      <span className="font-medium">{record.doctor_name}</span>
                    </p>
                  )}
                  {record.hospital_name && (
                    <p className="flex items-center gap-1.5">
                      <span className="text-slate-400">Hospital:</span>
                      <span className="font-medium">{record.hospital_name}</span>
                    </p>
                  )}
                  {record.notes && (
                    <p className="text-slate-500 italic line-clamp-2 mt-1">"{record.notes}"</p>
                  )}
                </div>

                {record.active_shares_count !== undefined && record.active_shares_count > 0 && (
                  <div className="mb-4 inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Shared with {record.active_shares_count} authorized doctor(s)</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDownload(record)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 transition-colors"
                  title="Download Secure Document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <div className="flex items-center gap-1">
                  {(user?.role === 'patient' || user?.id === record.patient_id) && (
                    <button
                      onClick={() => setShareModalRecord(record)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Share with Doctor (Consent)"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => openAuditLogs(record)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-medblue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="View Access Audit History"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  {(user?.role === 'patient' || user?.id === record.patient_id || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-5">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload Medical Document</h2>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Complete Blood Count Report (CBC)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Document Type *
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="lab_report">Lab Report</option>
                    <option value="prescription">Prescription</option>
                    <option value="scan_imaging">Scan / X-Ray / MRI</option>
                    <option value="discharge_summary">Discharge Summary</option>
                    <option value="vaccination">Vaccination Record</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Document Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Prescribing Doctor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. Arun Sharma"
                    value={uploadDoctor}
                    onChange={(e) => setUploadDoctor(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Hospital / Lab Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., CareSphere Central"
                    value={uploadHospital}
                    onChange={(e) => setUploadHospital(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  File Attachment (PDF, PNG, JPG - Max 25MB) *
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-950 dark:file:text-teal-300 hover:file:bg-teal-100 cursor-pointer"
                  />
                  {uploadFile && (
                    <p className="mt-2 text-xs text-teal-600 dark:text-teal-400 font-medium">
                      Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Notes / Clinical Indications
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or doctor instructions..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Encrypting & Uploading...</span>
                    </>
                  ) : (
                    <span>Upload & Save</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Sharing Consent Modal */}
      {shareModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Share Medical Document</h2>
              </div>
              <button
                onClick={() => setShareModalRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl mb-4 text-xs text-teal-800 dark:text-teal-300">
              <p className="font-semibold mb-1">Explicit Consent Agreement:</p>
              <p>
                By authorizing access to <span className="font-bold">"{shareModalRecord.title}"</span>, you grant the selected doctor legal permission to inspect this medical record for consultation purposes.
              </p>
            </div>

            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Select Certified Doctor *
                </label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.user_id} value={doc.user_id}>
                      {doc.name} ({doc.specialization} - {doc.hospital_name || 'CareSphere'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Access Duration (Days)
                </label>
                <select
                  value={shareValidDays}
                  onChange={(e) => setShareValidDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={7}>7 Days (Single consultation)</option>
                  <option value={30}>30 Days (Standard follow-up period)</option>
                  <option value={90}>90 Days (Quarterly treatment)</option>
                  <option value={365}>1 Year (Chronic care)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShareModalRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedDoctorId}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50"
                >
                  Grant Doctor Consent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Audit Logs Modal */}
      {auditModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-medblue-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Record Access Audit Log</h2>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{auditModalRecord.title}</p>
                </div>
              </div>
              <button
                onClick={() => setAuditModalRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-medblue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Retrieving immutable audit logs...</p>
              </div>
            ) : accessLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No external accesses recorded yet. Only you have accessed this document.
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {accessLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.accessor_name || 'System / Authorized User'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">
                        {log.action}
                      </span>
                      {log.purpose && <span>Purpose: {log.purpose}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setAuditModalRecord(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
