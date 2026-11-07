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
  Ban,
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  PieChart,
  Bed,
  Truck,
  Droplet,
  HeartPulse,
  DollarSign,
  Siren,
  FlaskConical,
  Pill,
  PhoneCall,
  RefreshCw,
  Upload,
  PackageCheck,
  Check,
  X,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Award,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { User, Appointment, AuditLog, EmergencyRequest, LabBooking, PharmacyOrder } from '../types/index.js';
import { apiUrl } from '../services/api.js';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const isHospitalAdmin = user?.role === 'hospital_admin';
  const isLabStaff = user?.role === 'lab_staff';
  const isPharmacyStaff = user?.role === 'pharmacy_staff';

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
  const initialTab = isPharmacyStaff ? 'pharmacy' : isLabStaff ? 'laboratory' : 'analytics';
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'verification' | 'appointments' | 'users' | 'logs' | 'announcements' | 'emergency' | 'laboratory' | 'pharmacy'
  >(initialTab);

  // Feature 3: Hospital Analytics State
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | 'all'>(
    (isHospitalAdmin || isLabStaff || isPharmacyStaff) && user?.hospital_id ? user.hospital_id : 'all'
  );
  const [adminHospitals, setAdminHospitals] = useState<any[]>([]);
  const [analyticsOverview, setAnalyticsOverview] = useState<any>(null);
  const [hospitalDetailed, setHospitalDetailed] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [analyticsDeptFilter, setAnalyticsDeptFilter] = useState('all');
  const [hospitalCategoryFilter, setHospitalCategoryFilter] = useState<'all' | 'caresphere' | 'partner' | 'affiliated'>('all');
  const [exportingCsv, setExportingCsv] = useState(false);

  // ---------------- FEATURE 1: EMERGENCY SOS QUEUE STATE ----------------
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [loadingEmergency, setLoadingEmergency] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyRequest | null>(null);
  const [emergencyTriageFilter, setEmergencyTriageFilter] = useState<string>('all');
  const [emergencyStatusFilter, setEmergencyStatusFilter] = useState<string>('all');
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [updatingEmergencyStatus, setUpdatingEmergencyStatus] = useState<string>('acknowledged');
  const [dispatchService, setDispatchService] = useState('');
  const [emergencyResolutionNotes, setEmergencyResolutionNotes] = useState('');
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  // ---------------- FEATURE 2: LABORATORY DIAGNOSTIC STATE ----------------
  const [labBookings, setLabBookings] = useState<LabBooking[]>([]);
  const [loadingLab, setLoadingLab] = useState(false);
  const [labStatusFilter, setLabStatusFilter] = useState<string>('all');
  const [labSearch, setLabSearch] = useState('');
  const [uploadReportModalOpen, setUploadReportModalOpen] = useState(false);
  const [selectedLabBooking, setSelectedLabBooking] = useState<LabBooking | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportNotes, setReportNotes] = useState('');

  // ---------------- FEATURE 3: PHARMACY & MEDICINE ORDERS STATE ----------------
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyOrder[]>([]);
  const [pharmacyInventory, setPharmacyInventory] = useState<any[]>([]);
  const [pharmacySales, setPharmacySales] = useState<any>(null);
  const [loadingPharmacy, setLoadingPharmacy] = useState(false);
  const [pharmacySection, setPharmacySection] = useState<'orders' | 'inventory' | 'sales'>('orders');
  const [pharmacyStatusFilter, setPharmacyStatusFilter] = useState<string>('all');
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [verifyingOrder, setVerifyingOrder] = useState<PharmacyOrder | null>(null);
  const [verifyRxNotes, setVerifyRxNotes] = useState('');
  const [stockModalItem, setStockModalItem] = useState<any | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(0);
  const [updatingStock, setUpdatingStock] = useState(false);
  const [addMedicineModalOpen, setAddMedicineModalOpen] = useState(false);
  const [newMedForm, setNewMedForm] = useState({
    name: '',
    brand_name: '',
    generic_name: '',
    strength: '',
    dosage_form: 'Tablet',
    manufacturer: '',
    category: 'Antibiotics',
    prescription_required: 1,
    mrp_price: 120,
    selling_price: 95,
    stock_quantity: 100,
    low_stock_threshold: 15,
    pharmacy_id: ''
  });
  const [addingMedicine, setAddingMedicine] = useState(false);

  // Authoritative Verification Checklist Modal State
  const [verifyingDoc, setVerifyingDoc] = useState<any | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'verified' | 'pending' | 'rejected' | 'suspended'>('verified');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [viewingProfileDoc, setViewingProfileDoc] = useState<any | null>(null);
  const [viewingDocsDoc, setViewingDocsDoc] = useState<any | null>(null);
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

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      setLoadingAnalytics(true);
      const hRes = await fetch(apiUrl('/api/admin/analytics/hospitals'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (hRes.ok) {
        const hData = await hRes.json();
        setAdminHospitals(hData.hospitals || []);
      }

      if (selectedHospitalId === 'all') {
        const oRes = await fetch(apiUrl(`/api/admin/analytics/overview?date_range=${analyticsDateRange}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (oRes.ok) {
          const oData = await oRes.json();
          setAnalyticsOverview(oData);
        }
      } else {
        const dRes = await fetch(apiUrl(`/api/admin/analytics/hospital/${selectedHospitalId}?date_range=${analyticsDateRange}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dRes.ok) {
          const dData = await dRes.json();
          setHospitalDetailed(dData);
        }
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleExportCsv = async () => {
    if (!token) return;
    try {
      setExportingCsv(true);
      const q = selectedHospitalId !== 'all' ? `hospital_id=${selectedHospitalId}&format=csv` : 'format=csv';
      const res = await fetch(apiUrl(`/api/admin/analytics/export?${q}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export CSV report');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `caresphere-analytics-${selectedHospitalId !== 'all' ? `hosp-${selectedHospitalId}` : 'all'}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      alert('CSV Export failed');
    } finally {
      setExportingCsv(false);
    }
  };

  // ---------------- FETCH HANDLERS FOR NEW FEATURES ----------------
  const fetchEmergencyRequests = async () => {
    if (!token) return;
    try {
      setLoadingEmergency(true);
      const url = apiUrl(
        selectedHospitalId !== 'all'
          ? `/api/emergency/hospital-requests?hospital_id=${selectedHospitalId}`
          : '/api/emergency/hospital-requests'
      );
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEmergencyRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load emergency requests:', err);
    } finally {
      setLoadingEmergency(false);
    }
  };

  const fetchLabBookings = async () => {
    if (!token) return;
    try {
      setLoadingLab(true);
      const url = apiUrl(
        selectedHospitalId !== 'all'
          ? `/api/lab/hospital-bookings?hospital_id=${selectedHospitalId}`
          : '/api/lab/hospital-bookings'
      );
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLabBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load lab bookings:', err);
    } finally {
      setLoadingLab(false);
    }
  };

  const fetchPharmacyData = async () => {
    if (!token) return;
    try {
      setLoadingPharmacy(true);
      const hospParam = selectedHospitalId !== 'all' ? `?hospital_id=${selectedHospitalId}` : '';
      const [ordersRes, invRes, salesRes] = await Promise.all([
        fetch(apiUrl(`/api/pharmacy/hospital-orders${hospParam}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl(`/api/pharmacy/inventory${hospParam}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl(`/api/pharmacy/sales-report${selectedHospitalId !== 'all' ? `?pharmacy_id=${selectedHospitalId}` : ''}`), {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setPharmacyOrders(oData.orders || []);
      }
      if (invRes.ok) {
        const iData = await invRes.json();
        setPharmacyInventory(iData.medicines || []);
      }
      if (salesRes.ok) {
        const sData = await salesRes.json();
        setPharmacySales(sData.sales_report || null);
      }
    } catch (err) {
      console.error('Failed to load pharmacy data:', err);
    } finally {
      setLoadingPharmacy(false);
    }
  };

  // Sync hospital admin's selected hospital once user profile loads
  useEffect(() => {
    if ((isHospitalAdmin || isLabStaff || isPharmacyStaff) && user?.hospital_id && selectedHospitalId === 'all') {
      setSelectedHospitalId(user.hospital_id);
    }
  }, [isHospitalAdmin, isLabStaff, isPharmacyStaff, user?.hospital_id, selectedHospitalId]);

  useEffect(() => {
    fetchAdminData();
    fetchAnalytics();
    if (activeTab === 'emergency') fetchEmergencyRequests();
    if (activeTab === 'laboratory') fetchLabBookings();
    if (activeTab === 'pharmacy') fetchPharmacyData();
  }, [token, selectedHospitalId, activeTab, analyticsDateRange]);

  // Emergency status updater
  const handleUpdateEmergencyStatus = async () => {
    if (!selectedEmergency || !token) return;
    try {
      setEmergencySubmitting(true);
      const res = await fetch(apiUrl(`/api/emergency/requests/${selectedEmergency.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: updatingEmergencyStatus,
          dispatched_service: dispatchService || null,
          resolution_notes: emergencyResolutionNotes || null
        })
      });

      if (res.ok) {
        setDispatchModalOpen(false);
        setSelectedEmergency(null);
        setDispatchService('');
        setEmergencyResolutionNotes('');
        await fetchEmergencyRequests();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update emergency status');
      }
    } catch (err) {
      alert('Network error updating emergency');
    } finally {
      setEmergencySubmitting(false);
    }
  };

  // Lab Quick Status
  const handleQuickLabStatus = async (bookingId: number, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/lab/bookings/${bookingId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchLabBookings();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update lab booking status');
      }
    } catch (e) {
      alert('Network error updating lab booking');
    }
  };

  // Upload Lab Report
  const handleUploadLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabBooking || !token) return;
    try {
      setUploadingReport(true);
      const formData = new FormData();
      if (reportFile) {
        formData.append('file', reportFile);
      }
      if (reportNotes) {
        formData.append('notes', reportNotes);
      }

      const res = await fetch(apiUrl(`/api/lab/bookings/${selectedLabBooking.id}/upload-report`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setUploadReportModalOpen(false);
        setSelectedLabBooking(null);
        setReportFile(null);
        setReportNotes('');
        alert('Diagnostic report uploaded successfully and automatically ingested into patient Digital Medical Records!');
        fetchLabBookings();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to upload report');
      }
    } catch (e) {
      alert('Network error uploading lab report');
    } finally {
      setUploadingReport(false);
    }
  };

  // Pharmacy update order status
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/pharmacy/orders/${orderId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchPharmacyData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update order status');
      }
    } catch (e) {
      alert('Network error updating pharmacy order');
    }
  };

  // Pharmacy verify prescription
  const handleVerifyPrescription = async (orderId: number, approved: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/pharmacy/orders/${orderId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: approved ? 'confirmed' : 'cancelled',
          prescription_verified: approved ? 1 : 0,
          verification_notes: verifyRxNotes || (approved ? 'Prescription verified by clinical pharmacist.' : 'Prescription rejected.')
        })
      });
      if (res.ok) {
        setVerifyingOrder(null);
        setVerifyRxNotes('');
        fetchPharmacyData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to verify prescription');
      }
    } catch (e) {
      alert('Network error during verification');
    }
  };

  // Pharmacy update stock
  const handleUpdateStock = async () => {
    if (!stockModalItem || !token) return;
    try {
      setUpdatingStock(true);
      const res = await fetch(apiUrl(`/api/pharmacy/inventory/${stockModalItem.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stock_quantity: Number(newStockQty),
          selling_price: Number(newSellingPrice)
        })
      });
      if (res.ok) {
        setStockModalItem(null);
        fetchPharmacyData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update stock');
      }
    } catch (e) {
      alert('Network error updating inventory');
    } finally {
      setUpdatingStock(false);
    }
  };

  const handleAddSpecificMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedForm.name || !newMedForm.strength || !token) return;
    try {
      setAddingMedicine(true);
      const res = await fetch(apiUrl('/api/pharmacy/medicines'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newMedForm,
          pharmacy_id: newMedForm.pharmacy_id ? Number(newMedForm.pharmacy_id) : undefined
        })
      });
      if (res.ok) {
        setAddMedicineModalOpen(false);
        setNewMedForm({
          name: '',
          brand_name: '',
          generic_name: '',
          strength: '',
          dosage_form: 'Tablet',
          manufacturer: '',
          category: 'Antibiotics',
          prescription_required: 1,
          mrp_price: 120,
          selling_price: 95,
          stock_quantity: 100,
          low_stock_threshold: 15,
          pharmacy_id: ''
        });
        alert('Specific medicine successfully added to pharmacy inventory.');
        fetchPharmacyData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add medicine');
      }
    } catch (e) {
      alert('Network error adding medicine');
    } finally {
      setAddingMedicine(false);
    }
  };

  const openReviewModal = (doc: any, overrideStatus?: 'verified' | 'pending' | 'rejected' | 'suspended') => {
    setVerifyingDoc(doc);
    let initialChecklist = {
      council_reg_verified: false,
      id_verified: false,
      degree_verified: false,
      background_cleared: false,
      chamber_assigned: false
    };

    if (overrideStatus === 'verified' || (!overrideStatus && (doc.verification_status === 'verified' || doc.verification_status === 'approved'))) {
      initialChecklist = {
        council_reg_verified: true,
        id_verified: true,
        degree_verified: true,
        background_cleared: true,
        chamber_assigned: true
      };
    } else if (doc.verification_checklist) {
      try {
        const parsed = typeof doc.verification_checklist === 'string'
          ? JSON.parse(doc.verification_checklist)
          : doc.verification_checklist;
        initialChecklist = { ...initialChecklist, ...parsed };
      } catch (e) {
        // ignore
      }
    }

    setChecklist(initialChecklist);
    setVerifyStatus(
      overrideStatus || (doc.verification_status === 'approved' ? 'verified' : doc.verification_status) || 'verified'
    );
    setVerifyNotes(overrideStatus === 'rejected' ? (doc.rejection_reason || '') : (doc.verification_notes || ''));
  };

  const handleVerifyDoctorSubmit = async () => {
    if (!verifyingDoc || !token) return;
    if (verifyStatus === 'rejected' && !verifyNotes.trim()) {
      alert('Please provide a mandatory rejection reason explaining why the credentials were not approved.');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch(apiUrl('/api/admin/verify-doctor'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_profile_id: verifyingDoc.doctor_profile_id || verifyingDoc.id,
          status: verifyStatus,
          notes: verifyNotes,
          rejection_reason: verifyStatus === 'rejected' ? verifyNotes : undefined,
          checklist
        })
      });

      if (res.ok) {
        setVerifyingDoc(null);
        setVerifyNotes('');
        await fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error || data.message || 'Verification update failed.');
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
      {/* Hospital-Branded Portal Header for Hospital Administrators (Requirement 1 & 9) */}
      {isHospitalAdmin && (
        <div className="bg-gradient-to-r from-[#123B5D] via-[#144167] to-[#0D9488] rounded-3xl p-6 sm:p-7 text-white shadow-premium border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-teal-200 text-xs font-bold backdrop-blur border border-white/20">
              <Building2 className="w-3.5 h-3.5 text-teal-300" />
              <span>Independent Hospital Administration Portal</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {stats?.hospital?.name || user?.hospital?.name || user?.hospital_name || 'Hospital Administration'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-3xl leading-relaxed">
              Campus: <strong>{stats?.hospital?.location || user?.hospital?.location || 'Main Campus'}</strong> • City: <strong>{stats?.hospital?.city || user?.hospital?.city || 'Bengaluru'}</strong> • Code: <span className="font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">{stats?.hospital?.code || user?.hospital?.code || 'CS-HOSP'}</span> • Emergency: <strong>{stats?.hospital?.emergency_hotline || '+91-80-CARE-911'}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-teal-200 block">Assigned Admin</span>
              <span className="text-xs font-bold text-white block">{user?.name}</span>
              <span className="text-[10px] text-teal-300 block">{user?.email}</span>
            </div>
          </div>
        </div>
      )}

      {/* Title & Hospital Governance Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-teal-600 dark:text-teal-400">
            {isHospitalAdmin ? 'Designated Hospital Governance' : 'CareSphere Central Oversight'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {isHospitalAdmin ? `${stats?.hospital?.name || user?.hospital?.name || 'Hospital'} Admin Center` : 'Central Hospital Administration'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isHospitalAdmin
              ? 'Doctor credential approvals, hospital analytics, patient bookings, and department oversight.'
              : 'Multi-hospital network analytics, authoritative doctor verification, security audit review, and central resource governance.'}
          </p>
        </div>

        {/* Hospital Selector & Export Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hospital Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <Building2 className="w-4 h-4 text-teal-600" />
            {isHospitalAdmin ? (
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {stats?.hospital?.name || user?.hospital?.name || user?.hospital_name || 'My Assigned Hospital'}
              </span>
            ) : (
              <select
                value={selectedHospitalId}
                onChange={(e) =>
                  setSelectedHospitalId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Hospitals & Medical Centers (Central View)</option>
                <optgroup label="CareSphere Flagship Network">
                  {adminHospitals
                    .filter((h) => (h.network_category === 'CareSphere Network' || h.name.toLowerCase().includes('caresphere')))
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Partner Hospital Chains (Apollo, Fortis, Manipal, Max, Narayana)">
                  {adminHospitals
                    .filter((h) => h.network_category === 'Partner Hospital Chains' || ['apollo', 'fortis', 'manipal', 'max', 'narayana'].some(k => h.name.toLowerCase().includes(k)))
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Affiliated & Doctor-Registered Hospitals">
                  {adminHospitals
                    .filter((h) => !h.name.toLowerCase().includes('caresphere') && !['apollo', 'fortis', 'manipal', 'max', 'narayana'].some(k => h.name.toLowerCase().includes(k)))
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                </optgroup>
              </select>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Print PDF Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Print Report</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>{isHospitalAdmin ? 'Hospital Admin' : 'Super Admin'}</span>
          </div>
        </div>
      </div>

      {/* Operational Statistics Cards (Requirement 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] text-slate-400 font-medium">Pending Approvals</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats?.pending_doctors !== undefined ? stats.pending_doctors : pendingDoctors.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] text-slate-400 font-medium">Approved Doctors</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats?.approved_doctors !== undefined ? stats.approved_doctors : allDoctors.filter(d => ['verified', 'approved'].includes(d.verification_status)).length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] text-slate-400 font-medium">Rejected Applications</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats?.rejected_doctors !== undefined ? stats.rejected_doctors : allDoctors.filter(d => d.verification_status === 'rejected').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] text-slate-400 font-medium">Hospital Patients</div>
          <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
            {stats?.total_patients || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] text-slate-400 font-medium">Total Appointments</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats?.total_appointments || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] text-slate-400 font-medium">Today's Visits</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
            {stats?.today_appointments || 0}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#38BDF8]" />
          <span>Hospital Analytics & Metrics</span>
        </button>

        {/* Feature 1: Emergency SOS Queue Tab */}
        <button
          onClick={() => setActiveTab('emergency')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'emergency'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-glow-sos'
              : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
          }`}
        >
          <Siren className="w-4 h-4 animate-pulse text-current" />
          <span>Emergency SOS Queue ({emergencyRequests.filter((r) => r.status !== 'resolved' && r.status !== 'cancelled').length})</span>
        </button>

        {/* Feature 2: Laboratory Queue Tab */}
        <button
          onClick={() => setActiveTab('laboratory')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'laboratory'
              ? 'bg-[#0D9488] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Diagnostic Lab ({labBookings.length})</span>
        </button>

        {/* Feature 3: Pharmacy Orders & Inventory Tab */}
        <button
          onClick={() => setActiveTab('pharmacy')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'pharmacy'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Pill className="w-4 h-4 text-[#38BDF8]" />
          <span>Hospital Pharmacy & Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'verification'
              ? 'bg-[#123B5D] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Doctor Verification ({pendingDoctors.length} Pending / {allDoctors.length} Total)
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

      {/* FEATURE 3: HOSPITAL-WISE ANALYTICS TAB CONTENT */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Controls: Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Horizon:</span>
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAnalyticsDateRange(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    analyticsDateRange === r
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {selectedHospitalId === 'all'
                ? `Displaying Network-Wide Statistics across ${adminHospitals.length || 8} Multi-Hospital Healthcare Systems & Clinics`
                : `Scoped to: ${adminHospitals.find((h) => h.id === selectedHospitalId)?.name || 'Selected Hospital'}`}
            </div>
          </div>

          {loadingAnalytics ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Computing real-time hospital analytics...</p>
            </div>
          ) : selectedHospitalId === 'all' && (analyticsOverview?.overview || analyticsOverview?.stats) ? (
            /* ========================================================================= */
            /* SUPER ADMIN: CENTRAL NETWORK-WIDE OVERVIEW & SEPARATE HOSPITAL SECTIONS   */
            /* ========================================================================= */
            (() => {
              const overview = analyticsOverview.overview || analyticsOverview.stats || {};
              const comparisonList = analyticsOverview.hospital_comparison || [];
              const monthlyTrendsList = analyticsOverview.monthly_trends && analyticsOverview.monthly_trends.length > 0
                ? analyticsOverview.monthly_trends
                : [
                    { month_key: 'Jun', in_person_count: 42, online_count: 18 },
                    { month_key: 'Jul', in_person_count: 58, online_count: 24 },
                    { month_key: 'Aug', in_person_count: 65, online_count: 31 },
                    { month_key: 'Sep', in_person_count: 72, online_count: 45 },
                    { month_key: 'Oct', in_person_count: 88, online_count: 52 },
                    { month_key: 'Nov', in_person_count: 96, online_count: 68 }
                  ];

              // Categorize hospitals into separate sections
              const caresphereList = comparisonList.filter((h: any) =>
                h.network_category === 'CareSphere Network' || (h.name && h.name.toLowerCase().includes('caresphere'))
              );
              const partnerList = comparisonList.filter((h: any) =>
                h.network_category === 'Partner Hospital Chains' ||
                (['apollo', 'fortis', 'manipal', 'max', 'narayana'].some((k: string) => (h.name || '').toLowerCase().includes(k)))
              );
              const affiliatedList = comparisonList.filter((h: any) =>
                !caresphereList.some((c: any) => c.id === h.id) &&
                !partnerList.some((p: any) => p.id === h.id)
              );

              const sectionsToRender = [
                {
                  id: 'caresphere',
                  title: 'CareSphere Health System Network',
                  subtitle: 'Flagship multi-specialty healthcare centers with integrated digital ICU & surgical suites',
                  badge: 'CareSphere Flagship Network',
                  badgeColor: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
                  icon: Building2,
                  list: caresphereList
                },
                {
                  id: 'partner',
                  title: 'National Partner Hospital Chains (Apollo, Fortis, Manipal, Max, Narayana)',
                  subtitle: 'Accredited multi-chain medical institutions supporting joint teleconsultations & specialized patient referrals',
                  badge: 'Accredited Partner Chains',
                  badgeColor: 'bg-medblue-50 dark:bg-medblue-950/60 text-medblue-700 dark:text-medblue-300 border-medblue-200 dark:border-medblue-800',
                  icon: Building2,
                  list: partnerList
                },
                {
                  id: 'affiliated',
                  title: 'Affiliated & Physician-Registered Hospitals',
                  subtitle: 'Independent hospitals, clinics, and community medical institutions registered by onboarding doctors',
                  badge: 'Physician-Registered Facilities',
                  badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                  icon: Stethoscope,
                  list: affiliatedList
                }
              ].filter((sec) => hospitalCategoryFilter === 'all' || hospitalCategoryFilter === sec.id);

              return (
                <div className="space-y-6">
                  {/* Central Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Total Hospitals
                      </span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {overview.total_hospitals ?? comparisonList.length}
                      </div>
                      <span className="text-[11px] text-teal-600 font-medium block truncate">
                        {caresphereList.length} CareSphere • {partnerList.length} Partner • {affiliatedList.length} Registered
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Registered Patients
                      </span>
                      <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
                        {overview.total_patients ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500">Enrolled across all institutions</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Total Doctors
                      </span>
                      <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                        {overview.total_doctors ?? 0}
                      </div>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {overview.approved_doctors ?? 0} Approved & Verified
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Total Consultations
                      </span>
                      <div className="text-2xl font-black text-medblue-600 dark:text-medblue-400 mt-1">
                        {overview.total_appointments ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {overview.online_consultations ?? 0} Online Teleconsultations
                      </span>
                    </div>
                  </div>

                  {/* Central Interactive Chart: Monthly Trends Across Hospitals */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-teal-600" />
                          <span>Cross-Network Appointments & Teleconsult Volume Trends</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Unified distribution across CareSphere, Partner Chains, and Registered Healthcare Centers
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-teal-600" /> In-Person Visits
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-medblue-500" /> Online Video
                        </span>
                      </div>
                    </div>

                    {/* Visual Chart with Gradient Bars */}
                    <div className="h-64 w-full flex items-end justify-between gap-4 pt-6 px-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4">
                      {monthlyTrendsList.map((d: any, i: number) => {
                        const inPerson = d.in_person_count ?? d.inPerson ?? 0;
                        const online = d.online_count ?? d.online ?? 0;
                        const label = d.month_key ?? d.month ?? `P${i + 1}`;
                        const total = inPerson + online;
                        const maxVal = Math.max(10, ...monthlyTrendsList.map((m: any) => (m.in_person_count ?? m.inPerson ?? 0) + (m.online_count ?? m.online ?? 0)));

                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-xs">
                              {total} total
                            </div>
                            <div className="w-full max-w-[48px] flex items-end gap-1.5 h-full justify-center">
                              <div
                                className="w-1/2 bg-gradient-to-t from-[#0D9488] to-[#14b8a6] rounded-t-lg transition-all duration-300 hover:brightness-110 shadow-sm"
                                style={{ height: `${Math.max(8, (inPerson / maxVal) * 160)}px` }}
                                title={`In-Person: ${inPerson}`}
                              />
                              <div
                                className="w-1/2 bg-gradient-to-t from-[#123B5D] to-[#38BDF8] rounded-t-lg transition-all duration-300 hover:brightness-110 shadow-sm"
                                style={{ height: `${Math.max(8, (online / maxVal) * 160)}px` }}
                                title={`Online Video: ${online}`}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section Filter Pills */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        Hospital Networks & Institutional Breakdown
                      </h3>
                      <p className="text-xs text-slate-500">
                        Separate operational intelligence sections for CareSphere campuses, partner hospital chains, and doctor-registered facilities.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { id: 'all', label: `All Facilities (${comparisonList.length})` },
                        { id: 'caresphere', label: `CareSphere Network (${caresphereList.length})` },
                        { id: 'partner', label: `Partner Chains (${partnerList.length})` },
                        { id: 'affiliated', label: `Registered & Affiliated (${affiliatedList.length})` }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setHospitalCategoryFilter(cat.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            hospitalCategoryFilter === cat.id
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SEPARATE SECTIONS FOR DIFFERENT HOSPITALS */}
                  <div className="space-y-6">
                    {sectionsToRender.map((section) => {
                      const IconComp = section.icon;
                      return (
                        <div
                          key={section.id}
                          className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 border border-teal-200 dark:border-teal-800">
                                <IconComp className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{section.title}</span>
                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${section.badgeColor}`}>
                                    {section.list.length} Facilities
                                  </span>
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px]">
                                <tr>
                                  <th className="p-3 rounded-l-xl">Hospital Facility</th>
                                  <th className="p-3">Location & City</th>
                                  <th className="p-3">Active Doctors</th>
                                  <th className="p-3">Total Visits</th>
                                  <th className="p-3">Teleconsults</th>
                                  <th className="p-3">Bed Capacity</th>
                                  <th className="p-3">Rating</th>
                                  <th className="p-3 rounded-r-xl">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {section.list.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="p-6 text-center text-slate-400">
                                      {section.id === 'affiliated'
                                        ? 'No physician-registered facilities yet. When a doctor enters a new hospital during registration, it will automatically populate here.'
                                        : 'No hospitals listed under this network section.'}
                                    </td>
                                  </tr>
                                ) : (
                                  section.list.map((hosp: any) => (
                                    <tr key={hosp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                                        <div className="flex items-center gap-2">
                                          <span>{hosp.name}</span>
                                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                                            {hosp.code}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-slate-500">{hosp.city}</td>
                                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                        {hosp.total_doctors} doctors ({hosp.approved_doctors} verified)
                                      </td>
                                      <td className="p-3 font-mono font-bold text-teal-600">
                                        {hosp.total_appointments}
                                      </td>
                                      <td className="p-3 font-mono text-medblue-600">
                                        {hosp.online_consultations}
                                      </td>
                                      <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                                        {hosp.total_beds || 200} Beds
                                      </td>
                                      <td className="p-3">
                                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                                          ★ {hosp.patient_rating}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <button
                                          onClick={() => setSelectedHospitalId(hosp.id)}
                                          className="px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-semibold text-xs transition-colors"
                                        >
                                          Drill Down
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : hospitalDetailed && hospitalDetailed.hospital ? (
            /* ========================================================================= */
            /* HOSPITAL-WISE DETAILED ANALYTICS (HOSPITAL ADMIN OR DRILLED DOWN VIEW)   */
            /* ========================================================================= */
            (() => {
              const hosp = hospitalDetailed.hospital || {};
              const docStats = hospitalDetailed.doctor_stats || {};
              const patStats = hospitalDetailed.patient_stats || {};
              const apptSummary = hospitalDetailed.appointments_summary || {};
              const depts = hospitalDetailed.department_breakdown || [];
              const docs = hospitalDetailed.doctor_breakdown || [];
              const resList = hospitalDetailed.resources || [];
              const dailyTrends = hospitalDetailed.daily_trends || [];
              const recentFeedback = hospitalDetailed.recent_feedback || [];

              return (
                <div className="space-y-6">
                  {/* Hospital Overview Banner */}
                  <div className="bg-gradient-to-r from-teal-700 to-medblue-700 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-white border border-white/20">
                          {hosp.network_category || (hosp.name?.toLowerCase().includes('caresphere') ? 'CareSphere Network' : 'Accredited Healthcare Facility')}
                        </span>
                        <span className="text-xs uppercase tracking-wider text-teal-200 font-bold">
                          • Hospital Intelligence
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black mt-0.5">
                        {hosp.name} ({hosp.city})
                      </h2>
                      <p className="text-xs text-teal-100 mt-1">
                        {hosp.address || hosp.location || 'Hospital Campus'} • Emergency Hotline: {hosp.emergency_hotline || '+91-80-CARE-911'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl text-xs backdrop-blur shrink-0">
                      <div>
                        <span className="block text-slate-300">Total Bed Capacity</span>
                        <strong className="text-base text-white">{hosp.total_beds ?? 250} Beds</strong>
                      </div>
                      <div className="h-6 w-px bg-white/20" />
                      <div>
                        <span className="block text-slate-300">ICU Suites</span>
                        <strong className="text-base text-white">{hosp.icu_beds ?? Math.round((hosp.total_beds || 250) * 0.15)} Units</strong>
                      </div>
                      <div className="h-6 w-px bg-white/20" />
                      <div>
                        <span className="block text-slate-300">Affiliated Doctors</span>
                        <strong className="text-base text-white">{docStats.total_doctors ?? 0} Physicians</strong>
                      </div>
                    </div>
                  </div>

                  {/* Hospital Metrics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Hospital Doctors
                      </span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {docStats.total_doctors ?? 0}
                      </div>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {docStats.approved_doctors ?? 0} Approved & Active
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Associated Patients
                      </span>
                      <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
                        {patStats.total_associated_patients ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500">Hospital OPD Registrations</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Total Visits
                      </span>
                      <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                        {apptSummary.total_appointments ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {apptSummary.completed_appointments ?? 0} Completed
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Teleconsultations
                      </span>
                      <div className="text-2xl font-black text-medblue-600 dark:text-medblue-400 mt-1">
                        {apptSummary.online_consultations ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500">Encrypted Video Sessions</span>
                    </div>
                  </div>

                  {/* Daily Appointment Volume Chart (if available) */}
                  {dailyTrends.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-teal-600" />
                            <span>Daily Consultation Volume History</span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Volume breakdown for {hosp.name} over selected period
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-teal-600" /> In-Person
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-medblue-500" /> Online Video
                          </span>
                        </div>
                      </div>

                      <div className="h-48 w-full flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-3 overflow-x-auto">
                        {dailyTrends.map((d: any, i: number) => {
                          const inPerson = d.in_person_count || 0;
                          const online = d.online_count || 0;
                          const total = d.total || (inPerson + online);
                          const maxVal = Math.max(5, ...dailyTrends.map((t: any) => t.total || 0));

                          return (
                            <div key={i} className="flex-1 min-w-[36px] flex flex-col items-center gap-1 h-full justify-end group">
                              <div className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white dark:bg-slate-800 px-1 py-0.5 rounded shadow-xs">
                                {total} appts
                              </div>
                              <div className="w-full max-w-[32px] flex items-end gap-1 h-full justify-center">
                                <div
                                  className="w-1/2 bg-teal-600 rounded-t transition-all"
                                  style={{ height: `${Math.max(6, (inPerson / maxVal) * 110)}px` }}
                                  title={`In-Person: ${inPerson}`}
                                />
                                <div
                                  className="w-1/2 bg-medblue-500 rounded-t transition-all"
                                  style={{ height: `${Math.max(6, (online / maxVal) * 110)}px` }}
                                  title={`Online: ${online}`}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-slate-500 truncate max-w-[44px]">
                                {d.date ? d.date.split('-').slice(1).join('/') : `#${i + 1}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interactive Charts: Department Distribution & Doctor Performance */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Department-Wise Distribution Chart */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-teal-600" />
                          <span>Department-Wise Consultations</span>
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">
                          {depts.length} Departments
                        </span>
                      </div>

                      <div className="space-y-3">
                        {depts.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-6">
                            No department consultation records logged yet.
                          </p>
                        ) : (
                          depts.map((dept: any) => {
                            const total = apptSummary.total_appointments || 1;
                            const pct = Math.round(((dept.appointment_count || 0) / total) * 100);
                            return (
                              <div key={dept.id} className="text-xs space-y-1">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-slate-800 dark:text-slate-200">{dept.department_name}</span>
                                  <span className="text-slate-500">{dept.appointment_count || 0} visits ({pct}%)</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className="h-full bg-teal-600 rounded-full transition-all"
                                    style={{ width: `${Math.max(5, pct)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Doctor-Wise Performance Breakdown */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-medblue-600" />
                          <span>Doctor Consultation Volume & Satisfaction</span>
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">
                          {docs.length} Active Specialists
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {docs.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-6">
                            No doctors currently assigned to this hospital.
                          </p>
                        ) : (
                          docs.map((doc: any) => (
                            <div
                              key={doc.doctor_id}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{doc.doctor_name}</span>
                                <span className="text-slate-400 block text-[11px]">{doc.specialization}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-teal-600 block">
                                  {doc.total_appointments} Visits
                                </span>
                                <span className="text-[10px] text-amber-500 font-bold">★ {doc.rating}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Resource & Bed Occupancy Breakdown */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Bed className="w-5 h-5 text-teal-600" />
                      <span>Hospital Resource & Bed Occupancy Gauges</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {resList.length === 0 ? (
                        <div className="col-span-full py-6 text-center text-xs text-slate-400">
                          No resource gauges configured for this hospital.
                        </div>
                      ) : (
                        resList.map((res: any, idx: number) => {
                          const available = res.available_capacity ?? res.available_count ?? 0;
                          const total = res.total_capacity || 0;
                          const pct = total > 0 ? Math.round((available / total) * 100) : 0;

                          return (
                            <div
                              key={res.id || idx}
                              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs space-y-2"
                            >
                              <div className="flex justify-between items-center capitalize font-bold text-slate-800 dark:text-slate-200">
                                <span>{(res.resource_type || '').replace(/_/g, ' ')}</span>
                                <span className="text-[10px] uppercase font-bold text-teal-600">
                                  {res.status || 'available'}
                                </span>
                              </div>
                              <div className="text-lg font-black text-slate-900 dark:text-white">
                                {available} <span className="text-xs text-slate-400">/ {total}</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct > 30 ? 'bg-emerald-500' : pct > 10 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Recent Patient Feedback */}
                  {recentFeedback.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-teal-600" />
                        <span>Recent Patient Verified Feedback</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {recentFeedback.map((fb: any) => (
                          <div
                            key={fb.id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-100">{fb.patient_name}</span>
                              <span className="text-amber-500 font-bold">★ {fb.rating} / 5</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 italic">"{fb.review}"</p>
                            {fb.doctor_name && (
                              <span className="text-[10px] text-teal-600 font-medium block">
                                Attending: {fb.doctor_name}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            /* Fallback state if analytics cannot load or are empty */
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
              <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Hospital Metrics Ready to Display</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                {selectedHospitalId === 'all'
                  ? 'Click below to load network-wide metrics and hospital comparisons.'
                  : 'Select an accredited hospital from the dropdown or click below to retrieve detailed intelligence.'}
              </p>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Analytics & Metrics</span>
              </button>
            </div>
          )}
        </div>
      )}

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
                      <div className="flex items-start gap-3.5">
                        {/* Profile Photograph / Avatar (Requirement 3) */}
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#123B5D] to-[#0D9488] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs overflow-hidden">
                          {doc.avatar_url ? (
                            <img src={doc.avatar_url} alt={doc.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{doc.name?.replace('Dr. ', '').slice(0, 2).toUpperCase() || 'DR'}</span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                              {doc.name}
                            </h3>

                            {/* Verification Status Badge (Requirement 3) */}
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Approved Specialist</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pending Approval</span>
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
                                <span>Application Rejected</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                            {doc.specialization} • {doc.department_name}
                          </div>
                        </div>
                      </div>

                      {/* Presence / Location status */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-600" />
                          <span>{doc.room_number || 'Chamber TBD'} {doc.floor ? `(${doc.floor})` : ''}</span>
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg font-medium text-[11px] ${
                          doc.current_presence_status === 'available' || doc.current_presence_status === 'in_opd'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.current_presence_status === 'in_consultation'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          ● {doc.current_presence_status?.replace('_', ' ') || 'on duty'}
                        </span>
                      </div>
                    </div>

                    {/* Registration & Credentials Details (Requirement 3) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Selected Hospital</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {doc.hospital_name || doc.hospital_official_name || 'CareSphere Hospital'}
                        </span>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400 block">
                          {doc.hospital_location || doc.hospital_city || 'Main Campus'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Medical Council & Reg No</span>
                        <span className="font-mono font-bold text-brand-700 dark:text-brand-400 block">
                          {doc.registration_number || 'N/A'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {doc.state_medical_council || 'State Medical Council'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Qualifications & Exp</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium block">{doc.qualifications}</span>
                        <span className="text-[11px] text-slate-500">{doc.experience_years} Years Experience • ₹{doc.consultation_fee} OPD</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact & Registered On</span>
                        <span className="text-slate-700 dark:text-slate-300 block truncate">{doc.email}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {doc.phone ? `${doc.phone} • ` : ''}{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    {/* Rejection Reason Notice (if rejected) */}
                    {(doc.rejection_reason || isRejected) && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Official Rejection Reason:</span> {doc.rejection_reason || doc.verification_notes || 'Credentials did not satisfy hospital requirements.'}
                        </div>
                      </div>
                    )}

                    {/* Action Bar (Requirement 3: Approve, Reject, View Documents, View Profile) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setViewingDocsDoc(doc)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span>View Doctor Documents</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingProfileDoc(doc)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-brand-600" />
                          <span>View Doctor Profile</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Reject Doctor Button */}
                        {doc.verification_status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => openReviewModal(doc, 'rejected')}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject Doctor</span>
                          </button>
                        )}

                        {/* Approve Doctor Button */}
                        {!isVerified && (
                          <button
                            type="button"
                            onClick={() => openReviewModal(doc, 'verified')}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Doctor</span>
                          </button>
                        )}

                        {/* Full 5-step checklist button */}
                        <button
                          type="button"
                          onClick={() => openReviewModal(doc)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                          <span>Governance Review</span>
                        </button>
                      </div>
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

      {/* ========================================================================= */}
      {/* FEATURE 1: EMERGENCY SOS MANAGEMENT DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'emergency' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Siren className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Emergency SOS Response & Ambulance Dispatch Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time emergency assistance requests triaged by severity. Respond immediately and log authorized ambulance units.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchEmergencyRequests}
                disabled={loadingEmergency}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEmergency ? 'animate-spin' : ''}`} />
                <span>Refresh Requests</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900">
              <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Critical Red Triage</div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                {emergencyRequests.filter((r) => r.triage_level === 'RED' && r.status !== 'resolved').length}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Urgent Yellow Triage</div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {emergencyRequests.filter((r) => r.triage_level === 'YELLOW' && r.status !== 'resolved').length}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-300">Active / In Progress</div>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                {emergencyRequests.filter((r) => ['received', 'acknowledged', 'assistance_arranged'].includes(r.status)).length}
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Resolved Cases</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {emergencyRequests.filter((r) => r.status === 'resolved').length}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Triage:</span>
            {['all', 'RED', 'YELLOW', 'GREEN'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setEmergencyTriageFilter(lvl)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                  emergencyTriageFilter === lvl
                    ? lvl === 'RED'
                      ? 'bg-rose-600 text-white'
                      : lvl === 'YELLOW'
                      ? 'bg-amber-500 text-white'
                      : lvl === 'GREEN'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status:</span>
            {['all', 'received', 'acknowledged', 'assistance_arranged', 'resolved', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setEmergencyStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  emergencyStatusFilter === st
                    ? 'bg-brand-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Emergency Requests List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">Ref # & Time</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Emergency Type & Triage</th>
                    <th className="p-3.5">Hospital & Location</th>
                    <th className="p-3.5">Status & Dispatch</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {emergencyRequests
                    .filter((r) => (emergencyTriageFilter === 'all' ? true : r.triage_level === emergencyTriageFilter))
                    .filter((r) => (emergencyStatusFilter === 'all' ? true : r.status === emergencyStatusFilter))
                    .map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3.5 align-top">
                          <span className="font-mono font-bold text-brand-600 dark:text-brand-400 block">
                            {req.reference_no}
                          </span>
                          <span className="text-[11px] text-slate-400">{req.created_at}</span>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{req.patient_name}</div>
                          <a
                            href={`tel:${req.contact_phone}`}
                            className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-mono text-[11px] mt-0.5"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>{req.contact_phone}</span>
                          </a>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                req.triage_level === 'RED'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                  : req.triage_level === 'YELLOW'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              {req.triage_level}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                              {req.emergency_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {req.notes && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 max-w-xs">{req.notes}</p>
                          )}
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {req.hospital_name || 'Nearest Participating Emergency ER'}
                          </div>
                          {req.latitude && req.longitude ? (
                            <a
                              href={`https://maps.google.com/?q=${req.latitude},${req.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline mt-1"
                            >
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span>View GPS Location</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">Location not shared</span>
                          )}
                        </td>
                        <td className="p-3.5 align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              req.status === 'received'
                                ? 'bg-rose-100 text-rose-700'
                                : req.status === 'acknowledged'
                                ? 'bg-amber-100 text-amber-700'
                                : req.status === 'assistance_arranged'
                                ? 'bg-blue-100 text-blue-700'
                                : req.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.status.replace(/_/g, ' ')}
                          </span>
                          {req.dispatched_service && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono mt-1">
                              Unit: {req.dispatched_service}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 align-top text-right">
                          <button
                            onClick={() => {
                              setSelectedEmergency(req);
                              setUpdatingEmergencyStatus(req.status);
                              setDispatchService(req.dispatched_service || '');
                              setEmergencyResolutionNotes(req.resolution_notes || '');
                              setDispatchModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold text-xs transition-colors"
                          >
                            Manage / Dispatch
                          </button>
                        </td>
                      </tr>
                    ))}
                  {emergencyRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No active emergency requests in this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 2: LABORATORY DIAGNOSTIC MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'laboratory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-600" />
                <span>Hospital Diagnostic Laboratory & Pathology Bookings</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage sample collections, test progress, and securely upload completed diagnostic reports with automatic ingestion into Digital Medical Records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLabBookings}
                disabled={loadingLab}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLab ? 'animate-spin' : ''}`} />
                <span>Refresh Bookings</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-900">
              <div className="text-xs font-bold text-purple-700 dark:text-purple-300">Total Diagnostic Bookings</div>
              <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                {labBookings.length}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Scheduled / Sample Pending</div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {labBookings.filter((b) => b.status === 'scheduled').length}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-300">Processing in Lab</div>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                {labBookings.filter((b) => ['sample_collected', 'processing'].includes(b.status)).length}
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Completed & Ingested</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {labBookings.filter((b) => b.status === 'completed').length}
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Filter:</span>
              {['all', 'scheduled', 'sample_collected', 'processing', 'completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setLabStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize whitespace-nowrap transition-colors ${
                    labStatusFilter === st
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient or test..."
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Lab Bookings Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">Ref # & Date</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Test Details</th>
                    <th className="p-3.5">Hospital</th>
                    <th className="p-3.5">Price & Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {labBookings
                    .filter((b) => (labStatusFilter === 'all' ? true : b.status === labStatusFilter))
                    .filter((b) =>
                      labSearch === ''
                        ? true
                        : (b.patient_name || '').toLowerCase().includes(labSearch.toLowerCase()) ||
                          (b.test_name || '').toLowerCase().includes(labSearch.toLowerCase()) ||
                          (b.booking_reference || '').toLowerCase().includes(labSearch.toLowerCase())
                    )
                    .map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3.5 align-top">
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400 block">
                            {booking.booking_reference}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {booking.booking_date} ({booking.booking_time})
                          </span>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{booking.patient_name}</div>
                          {booking.patient_phone && (
                            <a
                              href={`tel:${booking.patient_phone}`}
                              className="text-[11px] text-slate-500 hover:text-teal-600 block mt-0.5 font-mono"
                            >
                              {booking.patient_phone}
                            </a>
                          )}
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{booking.test_name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {booking.sample_type || 'Blood'}
                            </span>
                            {booking.prescription_number && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono">
                                Rx: {booking.prescription_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 align-top">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {booking.hospital_name}
                          </span>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-bold text-slate-900 dark:text-slate-100">₹{booking.price}</div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                              booking.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : booking.status === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : booking.status === 'sample_collected'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {booking.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3.5 align-top text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {booking.status === 'scheduled' && (
                              <button
                                onClick={() => handleQuickLabStatus(booking.id, 'sample_collected')}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] border border-purple-200"
                              >
                                Mark Sample Collected
                              </button>
                            )}
                            {booking.status === 'sample_collected' && (
                              <button
                                onClick={() => handleQuickLabStatus(booking.id, 'processing')}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200"
                              >
                                Mark Processing
                              </button>
                            )}
                            {booking.status !== 'completed' && (
                              <button
                                onClick={() => {
                                  setSelectedLabBooking(booking);
                                  setUploadReportModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center gap-1"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Certified Report</span>
                              </button>
                            )}
                            {booking.status === 'completed' && (
                              <a
                                href={apiUrl(`/api/lab/bookings/${booking.id}/report`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Report Ingested (View)</span>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {labBookings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No laboratory bookings registered in this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 3: HOSPITAL PHARMACY & INVENTORY MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'pharmacy' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                <span>Hospital Pharmacy, Prescription Orders & Inventory Management</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage prescription verification, express counter pickups, home deliveries, and live medicine inventory stock.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPharmacyData}
                disabled={loadingPharmacy}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPharmacy ? 'animate-spin' : ''}`} />
                <span>Refresh Pharmacy</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <button
              onClick={() => setPharmacySection('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pharmacySection === 'orders'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Prescription Orders ({pharmacyOrders.length})
            </button>
            <button
              onClick={() => setPharmacySection('inventory')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pharmacySection === 'inventory'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Medicine Inventory ({pharmacyInventory.length})
            </button>
            <button
              onClick={() => setPharmacySection('sales')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pharmacySection === 'sales'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Sales & Revenue Report
            </button>
          </div>

          {/* SECTION 1: ORDERS */}
          {pharmacySection === 'orders' && (
            <div className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Total Pharmacy Orders</div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {pharmacyOrders.length}
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Needs Rx Review</div>
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                    {pharmacyOrders.filter((o) => o.status === 'prescription_verification' || (o.prescription_id && !o.prescription_verified)).length}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-300">Counter Pickup Ready</div>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                    {pharmacyOrders.filter((o) => o.status === 'ready_for_pickup').length}
                  </div>
                </div>
                <div className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-900">
                  <div className="text-xs font-bold text-teal-700 dark:text-teal-300">Delivered / Dispensed</div>
                  <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">
                    {pharmacyOrders.filter((o) => o.status === 'delivered').length}
                  </div>
                </div>
              </div>

              {/* Status filter */}
              <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Filter:</span>
                {['all', 'pending', 'prescription_verification', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPharmacyStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                      pharmacyStatusFilter === st
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Orders Table */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3.5">Order # & Time</th>
                        <th className="p-3.5">Patient Details</th>
                        <th className="p-3.5">Fulfillment & Pickup Code</th>
                        <th className="p-3.5">Medicines Ordered</th>
                        <th className="p-3.5">Amount & Rx Review</th>
                        <th className="p-3.5 text-right">Workflow Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {pharmacyOrders
                        .filter((o) => (pharmacyStatusFilter === 'all' ? true : o.status === pharmacyStatusFilter))
                        .map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="p-3.5 align-top">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                                {order.order_number}
                              </span>
                              <span className="text-[11px] text-slate-400">{order.created_at}</span>
                            </td>
                            <td className="p-3.5 align-top">
                              <div className="font-bold text-slate-800 dark:text-slate-100">{order.patient_name}</div>
                              <a
                                href={`tel:${order.contact_phone}`}
                                className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:underline font-mono mt-0.5"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>{order.contact_phone}</span>
                              </a>
                            </td>
                            <td className="p-3.5 align-top">
                              {order.fulfillment_type === 'hospital_pickup' ? (
                                <div>
                                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                                    Express Counter Pickup
                                  </span>
                                  {order.pickup_code && (
                                    <div className="mt-1 font-mono font-black text-xs text-brand-700 dark:text-brand-300">
                                      Token: {order.pickup_code}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] uppercase">
                                    Home Delivery
                                  </span>
                                  <div className="text-[11px] text-slate-500 mt-1 max-w-xs truncate">
                                    {order.delivery_address || 'Address on record'}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 align-top">
                              <div className="space-y-1">
                                {(order.items || []).map((item) => (
                                  <div key={item.id} className="text-[11px] text-slate-700 dark:text-slate-300">
                                    <span className="font-bold">{item.medicine_name}</span> ({item.strength}) x {item.quantity}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3.5 align-top">
                              <div className="font-bold text-slate-900 dark:text-white">₹{order.total_amount}</div>
                              <div className="mt-1">
                                {order.prescription_id ? (
                                  order.prescription_verified ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                      <Check className="w-3 h-3" />
                                      <span>Rx Verified</span>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setVerifyingOrder(order)}
                                      className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold"
                                    >
                                      Verify Rx
                                    </button>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-400">OTC Order</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 align-top text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    order.status === 'delivered'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : order.status === 'ready_for_pickup' || order.status === 'out_for_delivery'
                                      ? 'bg-blue-100 text-blue-800'
                                      : order.status === 'preparing'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {order.status.replace(/_/g, ' ')}
                                </span>

                                {order.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] border border-purple-200"
                                  >
                                    Mark Preparing
                                  </button>
                                )}
                                {order.status === 'preparing' && order.fulfillment_type === 'hospital_pickup' && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200"
                                  >
                                    Ready for Pickup
                                  </button>
                                )}
                                {order.status === 'preparing' && order.fulfillment_type === 'home_delivery' && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200"
                                  >
                                    Dispatch for Delivery
                                  </button>
                                )}
                                {(order.status === 'ready_for_pickup' || order.status === 'out_for_delivery') && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                                  >
                                    Mark Dispensed / Delivered
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      {pharmacyOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No pharmacy orders in this queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: INVENTORY */}
          {pharmacySection === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                    Total SKU in Stock: {pharmacyInventory.length}
                  </span>
                  <button
                    onClick={() => setAddMedicineModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Specific Medicine</span>
                  </button>
                </div>
                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search medicine brand, generic..."
                    value={pharmacySearch}
                    onChange={(e) => setPharmacySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3.5">Medicine Name</th>
                        <th className="p-3.5">Brand & Manufacturer</th>
                        <th className="p-3.5">Dosage Form & Strength</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Stock Status</th>
                        <th className="p-3.5">Price</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {pharmacyInventory
                        .filter((item) =>
                          pharmacySearch === ''
                            ? true
                            : (item.name || '').toLowerCase().includes(pharmacySearch.toLowerCase()) ||
                              (item.brand_name || '').toLowerCase().includes(pharmacySearch.toLowerCase()) ||
                              (item.category || '').toLowerCase().includes(pharmacySearch.toLowerCase())
                        )
                        .map((item) => {
                          const isLowStock = item.stock_quantity <= item.low_stock_threshold;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="p-3.5 align-top">
                                <div className="font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                                {item.prescription_required === 1 && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 text-[10px] font-bold">
                                    Rx Required
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 align-top">
                                <div className="font-semibold text-slate-700 dark:text-slate-300">{item.brand_name}</div>
                                <div className="text-[11px] text-slate-400">{item.manufacturer}</div>
                              </td>
                              <td className="p-3.5 align-top">
                                <div className="font-medium text-slate-800 dark:text-slate-200">{item.strength}</div>
                                <div className="text-[11px] text-slate-400 capitalize">{item.dosage_form}</div>
                              </td>
                              <td className="p-3.5 align-top">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                                  {item.category}
                                </span>
                              </td>
                              <td className="p-3.5 align-top">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-black text-sm ${
                                      isLowStock ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {item.stock_quantity} units
                                  </span>
                                  {isLowStock && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[9px] uppercase tracking-wider animate-pulse">
                                      Low Stock
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">Reorder at &le; {item.low_stock_threshold}</div>
                              </td>
                              <td className="p-3.5 align-top">
                                <div className="font-bold text-slate-900 dark:text-slate-100">₹{item.selling_price}</div>
                                {item.mrp_price && (
                                  <div className="text-[10px] text-slate-400 line-through">MRP: ₹{item.mrp_price}</div>
                                )}
                              </td>
                              <td className="p-3.5 align-top text-right">
                                <button
                                  onClick={() => {
                                    setStockModalItem(item);
                                    setNewStockQty(item.stock_quantity);
                                    setNewSellingPrice(item.selling_price);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200"
                                >
                                  Update Stock
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: SALES & REVENUE REPORT */}
          {pharmacySection === 'sales' && pharmacySales && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Total Pharmacy Revenue</div>
                  <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
                    ₹{pharmacySales.total_revenue || 0}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/40 p-5 rounded-2xl border border-blue-200 dark:border-blue-900">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-300">Total Orders Fulfilled</div>
                  <div className="text-3xl font-black text-blue-700 dark:text-blue-400 mt-2">
                    {pharmacySales.completed_orders || 0}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-5 rounded-2xl border border-purple-200 dark:border-purple-900">
                  <div className="text-xs font-bold text-purple-700 dark:text-purple-300">Express Counter Pickups</div>
                  <div className="text-3xl font-black text-purple-700 dark:text-purple-400 mt-2">
                    {pharmacySales.counter_pickups || 0}
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-2xl border border-amber-200 dark:border-amber-900">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Low Stock SKUs Requiring Reorder</div>
                  <div className="text-3xl font-black text-amber-700 dark:text-amber-400 mt-2">
                    {pharmacySales.low_stock_items || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EMERGENCY RESPONSE & DISPATCH MODAL */}
      {/* ========================================================================= */}
      {dispatchModalOpen && selectedEmergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Emergency Dispatcher Console
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Siren className="w-5 h-5 text-rose-600" />
                  <span>Update Emergency Request #{selectedEmergency.reference_no}</span>
                </h3>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  Patient: {selectedEmergency.patient_name}
                </div>
                <div className="text-slate-500 font-mono">Contact: {selectedEmergency.contact_phone}</div>
                <div className="text-slate-500 capitalize">
                  Emergency: {selectedEmergency.emergency_type.replace(/_/g, ' ')} ({selectedEmergency.triage_level})
                </div>
                {selectedEmergency.notes && (
                  <div className="text-slate-600 dark:text-slate-300 italic mt-1">"{selectedEmergency.notes}"</div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Update Status:</label>
                <select
                  value={updatingEmergencyStatus}
                  onChange={(e) => setUpdatingEmergencyStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                >
                  <option value="received">Received</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="assistance_arranged">Assistance Arranged (Ambulance Dispatched)</option>
                  <option value="resolved">Resolved</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dispatched Service / Ambulance Unit:
                </label>
                <input
                  type="text"
                  placeholder="e.g. BLR-AMB-108-04 / Paramedic Team Alpha"
                  value={dispatchService}
                  onChange={(e) => setDispatchService(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution / Clinical Notes:
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes on triage, ETA, responder actions, or case resolution..."
                  value={emergencyResolutionNotes}
                  onChange={(e) => setEmergencyResolutionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
              <a
                href={`tel:${selectedEmergency.contact_phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Patient</span>
              </a>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  disabled={emergencySubmitting}
                  onClick={handleUpdateEmergencyStatus}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                >
                  {emergencySubmitting ? 'Updating...' : 'Save & Dispatch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD DIAGNOSTIC LAB REPORT MODAL */}
      {/* ========================================================================= */}
      {uploadReportModalOpen && selectedLabBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  Diagnostic Pathology Sign-off
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-purple-600" />
                  <span>Upload Certified Report #{selectedLabBooking.booking_reference}</span>
                </h3>
              </div>
              <button
                onClick={() => setUploadReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadLabReport} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-1">
                <div className="font-bold text-purple-900 dark:text-purple-200">
                  {selectedLabBooking.test_name}
                </div>
                <div className="text-purple-700 dark:text-purple-300">
                  Patient: {selectedLabBooking.patient_name} | Hospital: {selectedLabBooking.hospital_name}
                </div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                  Automatic Integration: This report will be immediately signed, certified, and ingested into the patient's Digital Medical Records Vault.
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Lab Report PDF (Optional - system generates certified PDF if omitted):
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setReportFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pathologist Clinical Findings / Remarks:
                </label>
                <textarea
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="e.g. All hematological parameters normal. Platelet count adequate. No atypical cells detected."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setUploadReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingReport}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>{uploadingReport ? 'Uploading & Ingesting...' : 'Complete & Ingest Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRESCRIPTION VERIFICATION MODAL */}
      {/* ========================================================================= */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Clinical Pharmacist Review
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Verify Prescription Order #{verifyingOrder.order_number}</span>
                </h3>
              </div>
              <button
                onClick={() => setVerifyingOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  Patient: {verifyingOrder.patient_name}
                </div>
                <div className="text-slate-500 font-mono">Prescription ID: #{verifyingOrder.prescription_id}</div>
                <div className="mt-2 space-y-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Prescribed Medicines:</span>
                  {(verifyingOrder.items || []).map((it) => (
                    <div key={it.id} className="text-slate-700 dark:text-slate-300">
                      • {it.medicine_name} ({it.strength}) x {it.quantity}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pharmacist Verification Notes:
                </label>
                <textarea
                  rows={3}
                  value={verifyRxNotes}
                  onChange={(e) => setVerifyRxNotes(e.target.value)}
                  placeholder="e.g. Valid digital prescription verified against hospital database. Dosages confirmed safe."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => handleVerifyPrescription(verifyingOrder.id, false)}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs"
              >
                Reject Order
              </button>
              <button
                onClick={() => handleVerifyPrescription(verifyingOrder.id, true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                Approve & Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INVENTORY STOCK & PRICE UPDATE MODAL */}
      {/* ========================================================================= */}
      {stockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Inventory Stock Control
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Update {stockModalItem.name}
                </h3>
              </div>
              <button
                onClick={() => setStockModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Stock Quantity (units):
                </label>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price (₹):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setStockModalItem(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={updatingStock}
                onClick={handleUpdateStock}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                {updatingStock ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD SPECIFIC MEDICINE MODAL (ADMIN / PHARMACY STAFF) */}
      {/* ========================================================================= */}
      {addMedicineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Pharmacy Inventory Master
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  <span>Add Specific Medicine to Pharmacy</span>
                </h3>
              </div>
              <button
                onClick={() => setAddMedicineModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSpecificMedicine} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Medicine Formulation Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cefixime 200mg or Insulin Aspart"
                  value={newMedForm.name}
                  onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Brand Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zifi 200"
                    value={newMedForm.brand_name}
                    onChange={(e) => setNewMedForm({ ...newMedForm, brand_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Generic Active Ingredient:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cefixime Trihydrate"
                    value={newMedForm.generic_name}
                    onChange={(e) => setNewMedForm({ ...newMedForm, generic_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Strength / Potency:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 200 mg or 100 IU/ml"
                    value={newMedForm.strength}
                    onChange={(e) => setNewMedForm({ ...newMedForm, strength: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dosage Form:
                  </label>
                  <select
                    value={newMedForm.dosage_form}
                    onChange={(e) => setNewMedForm({ ...newMedForm, dosage_form: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup / Suspension</option>
                    <option value="Injection">Injection / Pen</option>
                    <option value="Inhaler">Inhaler / Respules</option>
                    <option value="Drops">Eye / Ear Drops</option>
                    <option value="Ointment">Gel / Ointment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Manufacturer / Pharma:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FDC Limited / Cipla"
                    value={newMedForm.manufacturer}
                    onChange={(e) => setNewMedForm({ ...newMedForm, manufacturer: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Therapeutic Category:
                  </label>
                  <select
                    value={newMedForm.category}
                    onChange={(e) => setNewMedForm({ ...newMedForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Diabetology">Diabetology</option>
                    <option value="Analgesics & Antipyretics">Analgesics & Antipyretics</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                    <option value="Pain Relief">Pain Relief</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    MRP Price (₹):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMedForm.mrp_price}
                    onChange={(e) => setNewMedForm({ ...newMedForm, mrp_price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (₹):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMedForm.selling_price}
                    onChange={(e) => setNewMedForm({ ...newMedForm, selling_price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stock (units):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMedForm.stock_quantity}
                    onChange={(e) => setNewMedForm({ ...newMedForm, stock_quantity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Low Stock Alert at (&le;):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMedForm.low_stock_threshold}
                    onChange={(e) => setNewMedForm({ ...newMedForm, low_stock_threshold: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rxReqCheck"
                  checked={newMedForm.prescription_required === 1}
                  onChange={(e) => setNewMedForm({ ...newMedForm, prescription_required: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="rxReqCheck" className="font-bold text-slate-700 dark:text-slate-300">
                  Prescription Required (Schedule H/H1 Drug)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAddMedicineModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMedicine}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  {addingMedicine ? 'Adding...' : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </div>
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

            {/* Audit Notes / Rejection Reason (Requirement 3 & 7) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                {verifyStatus === 'rejected'
                  ? '4. Mandatory Rejection Reason (Doctor will see this when logging in): *'
                  : '4. Administrative Audit Remarks / Justification:'}
              </label>
              <textarea
                rows={2}
                value={verifyNotes}
                required={verifyStatus === 'rejected'}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder={
                  verifyStatus === 'rejected'
                    ? 'e.g., Medical registration number could not be validated against State Medical Council records. Please re-upload active registration.'
                    : 'e.g., Council registration cross-referenced with TNMC registry on Oct 2026. All five authoritative checks passed.'
                }
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

      {/* ========================================================================= */}
      {/* MODAL: VIEW DOCTOR DOCUMENTS MODAL (Requirement 3) */}
      {/* ========================================================================= */}
      {viewingDocsDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Doctor Application Documents
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Credentials for {viewingDocsDoc.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hospital: <strong>{viewingDocsDoc.hospital_name || viewingDocsDoc.hospital_official_name}</strong> • Reg: <span className="font-mono font-bold text-teal-600">{viewingDocsDoc.registration_number}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingDocsDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Council Certificate */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                      State Medical Council Certificate
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Council: {viewingDocsDoc.state_medical_council || 'State Medical Council'}
                    </span>
                  </div>
                </div>
                {viewingDocsDoc.council_certificate_url ? (
                  <a
                    href={viewingDocsDoc.council_certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <span>View / Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not Uploaded</span>
                )}
              </div>

              {/* Degree Certificate */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                      Medical Degree / Post-Graduation Certificate
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Degree: {viewingDocsDoc.qualifications}
                    </span>
                  </div>
                </div>
                {viewingDocsDoc.degree_certificate_url ? (
                  <a
                    href={viewingDocsDoc.degree_certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <span>View / Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not Uploaded</span>
                )}
              </div>

              {/* Government ID Proof */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                      Government Photo Identity Proof
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Aadhaar / Passport / Medical ID
                    </span>
                  </div>
                </div>
                {viewingDocsDoc.id_proof_url ? (
                  <a
                    href={viewingDocsDoc.id_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <span>View / Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not Uploaded</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400">
                Documents encrypted & verified on CareSphere Network.
              </span>
              <button
                onClick={() => setViewingDocsDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW DOCTOR PROFILE MODAL (Requirement 3) */}
      {/* ========================================================================= */}
      {viewingProfileDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#123B5D] to-[#0D9488] text-white flex items-center justify-center font-bold text-sm shadow-xs overflow-hidden shrink-0">
                  {viewingProfileDoc.avatar_url ? (
                    <img src={viewingProfileDoc.avatar_url} alt={viewingProfileDoc.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{viewingProfileDoc.name?.replace('Dr. ', '').slice(0, 2).toUpperCase() || 'DR'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {viewingProfileDoc.name}
                  </h3>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                    {viewingProfileDoc.specialization} • {viewingProfileDoc.department_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingProfileDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Hospital</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {viewingProfileDoc.hospital_name || viewingProfileDoc.hospital_official_name}
                </span>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 block">{viewingProfileDoc.hospital_location || viewingProfileDoc.hospital_city}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration License</span>
                <span className="font-mono font-bold text-brand-700 dark:text-brand-400 text-sm">{viewingProfileDoc.registration_number}</span>
                <span className="text-[11px] text-slate-500 block">{viewingProfileDoc.state_medical_council || 'State Medical Council'}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Qualifications & Exp</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{viewingProfileDoc.qualifications}</span>
                <span className="text-[11px] text-slate-500 block">{viewingProfileDoc.experience_years} years clinical experience</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultation Fee & OPD</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">₹{viewingProfileDoc.consultation_fee} per consultation</span>
                <span className="text-[11px] text-slate-500 block">{viewingProfileDoc.room_number || 'Room 101'} • {viewingProfileDoc.floor || '1st Floor'}</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Clinical Biography</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 leading-relaxed">
                {viewingProfileDoc.bio || 'Doctor has submitted complete clinical qualifications for review by the hospital administration committee.'}
              </p>
            </div>

            {/* Contact */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Information</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfileDoc.email}</span>
                {viewingProfileDoc.phone && <span className="text-slate-500 block">{viewingProfileDoc.phone}</span>}
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                Status: {viewingProfileDoc.verification_status}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setViewingProfileDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const doc = viewingProfileDoc;
                  setViewingProfileDoc(null);
                  openReviewModal(doc);
                }}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Open Governance Review</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
