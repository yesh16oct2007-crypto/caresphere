import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Bed,
  HeartPulse,
  Truck,
  Droplet,
  Wind,
  PhoneCall,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  Edit3,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiUrl } from '../services/api.js';
import { HospitalResource } from '../types/index.js';

export const HospitalResourcesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [resources, setResources] = useState<HospitalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Modal for Hospital Admin
  const [editingResource, setEditingResource] = useState<HospitalResource | null>(null);
  const [editAvailable, setEditAvailable] = useState<number>(0);
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('available');
  const [editDetails, setEditDetails] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const isHospitalAdmin = user?.role === 'hospital_admin' || user?.role === 'superadmin' || user?.role === 'admin';

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (selectedCity !== 'all') query.set('city', selectedCity);
      if (selectedType !== 'all') {
        query.set('type', selectedType);
        query.set('resource_type', selectedType);
      }

      const res = await fetch(apiUrl(`/api/resources?${query.toString()}`));
      if (!res.ok) throw new Error('Failed to load hospital resources');
      const data = await res.json();
      setResources(data.resources || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    const interval = setInterval(fetchResources, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [selectedCity, selectedType]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(apiUrl(`/api/resources/${editingResource.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          available_capacity: editAvailable,
          total_capacity: editTotal,
          status: editStatus,
          details: editDetails
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update resource');

      setSuccessMsg(`Resource updated successfully for ${editingResource.hospital_name}`);
      setEditingResource(null);
      fetchResources();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const isStale = (lastUpdatedStr?: string) => {
    if (!lastUpdatedStr) return true;
    const time = new Date(lastUpdatedStr).getTime();
    if (isNaN(time)) return true;
    const diffHours = (Date.now() - time) / (1000 * 60 * 60);
    return diffHours > 4;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'general_beds':
        return <Bed className="w-5 h-5 text-teal-600" />;
      case 'icu_beds':
        return <HeartPulse className="w-5 h-5 text-red-600" />;
      case 'emergency_beds':
        return <Activity className="w-5 h-5 text-amber-600" />;
      case 'ambulances':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'blood_bank':
        return <Droplet className="w-5 h-5 text-rose-600" />;
      case 'oxygen_cylinders':
      case 'ventilators':
        return <Wind className="w-5 h-5 text-cyan-600" />;
      default:
        return <Activity className="w-5 h-5 text-teal-600" />;
    }
  };

  const cities = Array.from(new Set(resources.map((r) => r.hospital_city).filter(Boolean)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              <Activity className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Live Hospital Resource & Bed Availability
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time verified status of ICU units, emergency bays, general beds, ambulances, and blood bank reserves.
          </p>
        </div>

        {/* Emergency Dispatch Banner */}
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 rounded-2xl text-xs text-red-800 dark:text-red-200 shrink-0">
          <PhoneCall className="w-4 h-4 text-red-600 shrink-0" />
          <div>
            <span className="font-bold">{t('footer.dial_108')}</span> • {t('footer.hospital_trauma')}
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

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* City & Resource Type Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-wrap items-center justify-between gap-4">
        {/* City Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">City:</span>
          <button
            onClick={() => setSelectedCity('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedCity === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Cities
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedCity === city
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Resource Type Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resource:</span>
          {[
            { id: 'all', label: 'All Resources' },
            { id: 'icu_beds', label: 'ICU Beds' },
            { id: 'general_beds', label: 'General Beds' },
            { id: 'emergency_beds', label: 'Emergency Bay' },
            { id: 'ambulances', label: 'Ambulances' },
            { id: 'blood_bank', label: 'Blood Bank' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedType === type.id
                  ? 'bg-medblue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchResources}
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Live</span>
        </button>
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Retrieving real-time hospital capacities...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
            No resources match this filter
          </h3>
          <p className="text-xs text-slate-500">Try selecting 'All Cities' or 'All Resources'.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => {
            const stale = isStale(res.last_updated || (res as any).updated_at);
            const avail = res.available_capacity ?? (res as any).available_count ?? 0;
            const total = res.total_capacity ?? 0;
            const percentage = total > 0 ? Math.round((avail / total) * 100) : 0;

            const canEdit =
              isHospitalAdmin &&
              (user?.role === 'superadmin' || user?.role === 'admin' || user?.hospital_id === res.hospital_id);

            return (
              <div
                key={res.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        {getResourceIcon(res.resource_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white capitalize">
                          {res.resource_type.replace('_', ' ')}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{res.hospital_name}</span> • <span className="font-medium text-slate-700 dark:text-slate-300">{res.hospital_city}</span>
                        </p>
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingResource(res);
                          setEditAvailable(avail);
                          setEditTotal(total);
                          setEditStatus(res.status);
                          setEditDetails(typeof res.details === 'object' ? JSON.stringify(res.details) : (res.details || ''));
                        }}
                        className="p-1.5 rounded-xl text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors"
                        title="Update Live Capacity (Hospital Admin)"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Stale Warning Badge if applicable */}
                  {stale ? (
                    <div className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Availability not confirmed recently</span>
                    </div>
                  ) : (
                    <div className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Real-Time Capacity</span>
                    </div>
                  )}

                  {/* Available Capacity Counter */}
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs text-slate-500">Available Units:</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {avail}
                        </span>
                        <span className="text-xs text-slate-400"> / {total}</span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage > 30 ? 'bg-emerald-500' : percentage > 10 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                      />
                    </div>
                  </div>

                  {res.details && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 bg-white dark:bg-slate-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      {typeof res.details === 'object' ? JSON.stringify(res.details) : String(res.details)}
                    </p>
                  )}
                </div>

                {/* Footer with Timestamp */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Updated {(() => {
                        const raw = res.last_updated || (res as any).updated_at;
                        if (!raw) return 'Recently';
                        const d = new Date(raw);
                        return isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </span>
                  </span>
                  <span className="font-semibold uppercase text-teal-600 dark:text-teal-400">
                    {res.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hospital Admin Edit Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Update Resource Availability
                </h3>
                <p className="text-xs text-teal-600 dark:text-teal-400">
                  {editingResource.hospital_name} — {editingResource.resource_type.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={() => setEditingResource(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Available Units *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editAvailable}
                    onChange={(e) => setEditAvailable(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Total Capacity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editTotal}
                    onChange={(e) => setEditTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Availability Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="available">Available (Normal flow)</option>
                  <option value="low">Low (Nearing full capacity)</option>
                  <option value="critical">Critical (Emergency only)</option>
                  <option value="full">Full (No intake)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Details / Notes (e.g. Blood groups, ventilator models)
                </label>
                <textarea
                  rows={2}
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {saving ? 'Publishing Updates...' : 'Publish Real-Time Capacity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
