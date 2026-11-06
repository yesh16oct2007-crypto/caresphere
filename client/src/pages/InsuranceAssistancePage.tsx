import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  PhoneCall,
  CheckCircle,
  FileCheck,
  Clock,
  AlertCircle,
  Plus,
  Lock,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiUrl } from '../services/api.js';
import { InsuranceProvider, HospitalInsurancePartner, PatientInsurancePolicy } from '../types/index.js';

export const InsuranceAssistancePage: React.FC = () => {
  const { user, token, isAuthenticated } = useAuth();

  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [partners, setPartners] = useState<HospitalInsurancePartner[]>([]);
  const [policies, setPolicies] = useState<PatientInsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'providers' | 'claim_guide' | 'vault' | 'tpa_desks'>('providers');

  // Policy Vault Add Modal
  const [addPolicyModalOpen, setAddPolicyModalOpen] = useState(false);
  const [policyNumber, setPolicyNumber] = useState('');
  const [holderName, setHolderName] = useState(user?.name || '');
  const [providerId, setProviderId] = useState<number | ''>('');
  const [sumInsured, setSumInsured] = useState<number>(500000);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [tpaName, setTpaName] = useState('Medi Assist TPA');
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsuranceData();
    if (token) {
      fetchUserPolicies();
    }
  }, [token]);

  const fetchInsuranceData = async () => {
    try {
      setLoading(true);
      const [provRes, partRes] = await Promise.all([
        fetch(apiUrl('/api/insurance/providers')),
        fetch(apiUrl('/api/insurance/hospitals'))
      ]);
      const provData = await provRes.json();
      const partData = await partRes.json();
      setProviders(provData.providers || []);
      setPartners(partData.partnerships || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPolicies = async () => {
    try {
      const res = await fetch(apiUrl('/api/insurance/my-policies'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSavingPolicy(true);
      setError(null);
      const selectedProv = providers.find((p) => p.id === Number(providerId));
      const res = await fetch(apiUrl('/api/insurance/my-policies'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          insurance_provider_id: providerId ? Number(providerId) : undefined,
          provider_name: selectedProv?.name || 'Comprehensive Health Plan',
          policy_number: policyNumber,
          policy_holder_name: holderName,
          sum_insured: sumInsured,
          valid_from: validFrom,
          valid_to: validTo,
          valid_until: validTo,
          tpa_name: tpaName,
          tpa_id: tpaName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save policy');

      setSuccessMsg('Insurance policy saved securely in your patient vault.');
      setAddPolicyModalOpen(false);
      setPolicyNumber('');
      fetchUserPolicies();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Saving policy failed');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async (policyId: number) => {
    if (!token || !confirm('Are you sure you want to remove this policy from your vault?')) return;
    try {
      const res = await fetch(apiUrl(`/api/insurance/my-policies/${policyId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Policy removed from vault.');
        fetchUserPolicies();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to remove policy');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove policy');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-700 via-medblue-700 to-indigo-800 rounded-3xl p-6 sm:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-4 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cashless Hospitalization Assistance</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Health Insurance & TPA Helpdesk
          </h1>
          <p className="text-teal-100 text-sm sm:text-base leading-relaxed mb-6">
            Verify cashless insurance coverage, track third-party administrator (TPA) approvals, and manage your policy cards securely in one place.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="bg-black/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              100% Cashless Pre-Authorizations
            </span>
            <span className="bg-black/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-300" />
              24/7 On-Premise TPA Assistance
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 mb-6 overflow-x-auto">
        {[
          { id: 'providers', label: 'Accepted Insurance & Cashless Matrix' },
          { id: 'claim_guide', label: 'Claim Step-by-Step Guide' },
          { id: 'tpa_desks', label: 'Hospital TPA Desks & Contacts' },
          { id: 'vault', label: 'My Policy Vault' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Accepted Insurers & Cashless Partnerships */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {providers.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-lg mb-4">
                    {p.name.charAt(0)}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                    {p.name}
                  </h3>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 mb-3">
                    Cashless Network Partner
                  </span>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.toll_free_number}</span>
                    </p>
                    <p className="truncate text-slate-400">{p.support_email}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-4 flex items-center justify-between text-xs">
                  <span className="text-emerald-600 font-semibold">Active in 3 Hospitals</span>
                  <span className="text-slate-400 font-mono text-[10px]">{p.code}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Hospital-Wise Comparison Matrix */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              Hospital Cashless Coverage Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-lg">Hospital</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Insurance Provider</th>
                    <th className="p-3">Cashless Status</th>
                    <th className="p-3 rounded-r-lg">TPA Desk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {partners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {partner.hospital_name}
                      </td>
                      <td className="p-3 text-slate-500">{partner.hospital_city}</td>
                      <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">
                        {partner.insurance_name}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle className="w-3 h-3" /> Cashless Approved
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {partner.tpa_room_location || 'Ground Floor Wing B'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Step-by-Step Claim Guide */}
      {activeTab === 'claim_guide' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Planned Hospitalization */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Planned Hospitalization (48 Hours Prior)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Follow these steps for scheduled surgeries, planned procedures, and non-emergency admissions.
            </p>
            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  <strong>Consult Treating Doctor:</strong> Obtain the official admission recommendation and cost estimate note.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  <strong>Visit Hospital TPA Desk:</strong> Submit pre-authorization form along with insurance e-card and photo ID at least 48 hours before admission.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <span>
                  <strong>Pre-Auth Sanction:</strong> The insurer verifies policy terms and issues an initial cashless sanction letter within 4 to 6 hours.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <span>
                  <strong>Cashless Discharge:</strong> Upon discharge, final itemized bills are sent directly to the insurer for settlement.
                </span>
              </li>
            </ol>
          </div>

          {/* Emergency Hospitalization */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Emergency Hospitalization (Within 24 Hours)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              For immediate trauma admissions, cardiac episodes, and acute critical care admissions.
            </p>
            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  <strong>Immediate Admission:</strong> Patient receives immediate emergency stabilization without delay.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  <strong>Intimate TPA Desk:</strong> Attendee presents insurance card to the Emergency TPA Desk within 24 hours of admission.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <span>
                  <strong>Emergency Fast-Track Approval:</strong> TPA issues emergency interim authorization within 2 hours of document submission.
                </span>
              </li>
            </ol>

            {/* Document Checklist */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Mandatory Documents Checklist</span>
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                <li>Original Health Insurance Card & Policy Schedule</li>
                <li>Aadhaar Card / PAN Card of Patient and Policy Holder</li>
                <li>Hospital Indoor Case Papers and Doctor's Admission Advice</li>
                <li>All Diagnostic Lab Reports & X-Ray / Scan films</li>
                <li>Pharmacy Receipts and Itemized Invoices</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Hospital TPA Desks */}
      {activeTab === 'tpa_desks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              hospital: 'CareSphere Central Hospital',
              city: 'Bengaluru',
              room: 'Room 104, Ground Floor, Near Main Registration',
              phone: '+91-80-2222-0104',
              email: 'tpa.blr@caresphere.health',
              timing: '24/7 Round the Clock'
            },
            {
              hospital: 'CareSphere Metro Hospital',
              city: 'Chennai',
              room: 'Room G-12, Emergency Bay Entrance',
              phone: '+91-44-2444-0104',
              email: 'tpa.chn@caresphere.health',
              timing: '24/7 Round the Clock'
            },
            {
              hospital: 'CareSphere City Hospital',
              city: 'Hyderabad',
              room: 'Room 201, 1st Floor, Tower A',
              phone: '+91-40-2333-0104',
              email: 'tpa.hyd@caresphere.health',
              timing: '24/7 Round the Clock'
            }
          ].map((desk, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{desk.hospital}</h3>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">{desk.city}</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <p>
                  <strong className="text-slate-400 block">Room Location:</strong>
                  {desk.room}
                </p>
                <p>
                  <strong className="text-slate-400 block">TPA Desk Hotline:</strong>
                  <span className="font-bold text-slate-900 dark:text-white">{desk.phone}</span>
                </p>
                <p>
                  <strong className="text-slate-400 block">Desk Hours:</strong>
                  {desk.timing}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Patient Policy Vault */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Personal Insurance Policy Vault
              </h3>
              <p className="text-xs text-slate-500">
                Encrypted storage for your family's health insurance cards and sum insured details.
              </p>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => setAddPolicyModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add Insurance Policy</span>
              </button>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
              <Lock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sign In Required</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                Please log in to your patient account to access your private insurance policy vault.
              </p>
            </div>
          ) : policies.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
              <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Policies Added Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                Store your Star Health, HDFC ERGO, or ICICI policy cards for instant 1-click cashless admissions.
              </p>
              <button
                onClick={() => setAddPolicyModalOpen(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold"
              >
                Add Your First Policy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {policies.map((pol) => (
                <div
                  key={pol.id}
                  className="bg-gradient-to-tr from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 shadow-xl border border-teal-500/30 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-teal-300 tracking-wider uppercase">
                        {pol.provider_name || 'Health Insurance'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {(pol.status || 'active').toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleDeletePolicy(pol.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                          title="Remove policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400">Policy Number</p>
                    <p className="font-mono text-lg font-bold tracking-wider mb-3">{pol.policy_number}</p>

                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="text-slate-400">Holder:</span> {pol.policy_holder_name}
                      </p>
                      <p>
                        <span className="text-slate-400">Sum Insured:</span> ₹{Number(pol.sum_insured || 0).toLocaleString()}
                      </p>
                      <p>
                        <span className="text-slate-400">TPA:</span> {pol.tpa_name || 'Medi Assist TPA'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Valid until: {pol.valid_to || (pol as any).valid_until || 'Ongoing'}</span>
                    <span className="text-teal-300 font-semibold">Cashless Verified</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Policy Modal */}
      {addPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              Save Insurance Policy
            </h3>
            <form onSubmit={handleAddPolicy} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Policy Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Insurance Provider
                </label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Select Insurer --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Policy Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POL-STAR-992819"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Sum Insured (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={50000}
                    value={sumInsured}
                    onChange={(e) => setSumInsured(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    required
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddPolicyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {savingPolicy ? 'Encrypting & Saving...' : 'Save to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
