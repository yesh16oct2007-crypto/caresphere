import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Ambulance,
  HeartPulse,
  Navigation,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { EmergencyContact, EmergencyRequest } from '../types/index.js';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHospitalId?: number;
}

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({
  isOpen,
  onClose,
  defaultHospitalId
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'immediate' | 'request' | 'contacts' | 'tracking'>('immediate');
  const [officialHotlines, setOfficialHotlines] = useState<any[]>([]);
  const [hospitalHotlines, setHospitalHotlines] = useState<any[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Emergency Request Form State
  const [patientName, setPatientName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(defaultHospitalId || null);
  const [emergencyType, setEmergencyType] = useState<string>('cardiac');
  const [triageLevel, setTriageLevel] = useState<'RED' | 'YELLOW' | 'GREEN'>('RED');
  const [emergencyNotes, setEmergencyNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<EmergencyRequest | null>(null);
  const [myRequests, setMyRequests] = useState<EmergencyRequest[]>([]);

  // Add Contact Form State
  const [newContactName, setNewContactName] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactPrimary, setNewContactPrimary] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHotlines();
      if (isAuthenticated) {
        loadMyContacts();
        loadMyRequests();
      }
      if (user) {
        setPatientName(user.name || '');
        setContactPhone(user.phone || '');
      }
    }
  }, [isOpen, isAuthenticated, user]);

  const loadHotlines = async () => {
    try {
      const res = await fetch('/api/emergency/hotlines');
      if (res.ok) {
        const data = await res.json();
        setOfficialHotlines(data.official_hotlines || []);
        setHospitalHotlines(data.hospital_hotlines || []);
        if (!selectedHospitalId && data.hospital_hotlines?.length > 0) {
          setSelectedHospitalId(data.hospital_hotlines[0].hospital_id);
        }
      }
    } catch (err) {
      console.error('Failed to load hotlines:', err);
    }
  };

  const loadMyContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/emergency/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmergencyContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  const loadMyRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/emergency/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  // Request browser GPS Location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });

        // Query nearest hospitals from server
        try {
          const res = await fetch(`/api/emergency/nearby-hospitals?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            setNearbyHospitals(data.hospitals || []);
            if (data.nearest) {
              setSelectedHospitalId(data.nearest.id);
            }
          }
        } catch (fetchErr) {
          console.error('Failed to find nearby hospitals:', fetchErr);
        }

        // Reverse geocode placeholder
        setLocationAddress(`Current GPS Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        setLocationError(`Location access denied or unavailable: ${err.message}. You can manually type your address.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Add Contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactRelation || !newContactPhone) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/emergency/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newContactName,
          relationship: newContactRelation,
          phone: newContactPhone,
          is_primary: newContactPrimary ? 1 : 0
        })
      });

      if (res.ok) {
        setNewContactName('');
        setNewContactRelation('');
        setNewContactPhone('');
        setNewContactPrimary(false);
        setAddingContact(false);
        loadMyContacts();
      }
    } catch (err) {
      console.error('Failed to add contact:', err);
    }
  };

  // Handle Delete Contact
  const handleDeleteContact = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/emergency/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadMyContacts();
      }
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  // Submit Emergency Request
  const handleSubmitEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !contactPhone) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/emergency/request', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patient_name: patientName,
          contact_phone: contactPhone,
          hospital_id: selectedHospitalId,
          emergency_type: emergencyType,
          triage_level: triageLevel,
          latitude: userLocation?.lat || null,
          longitude: userLocation?.lng || null,
          address: locationAddress || null,
          notes: emergencyNotes || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitSuccess(data.emergency_request);
        setActiveTab('tracking');
        if (isAuthenticated) loadMyRequests();
      }
    } catch (err) {
      console.error('Failed to submit emergency request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-red-500/40 overflow-hidden my-8">
        {/* Header with High-Alert Branding */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight">CareSphere 24/7 Emergency SOS</h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-white text-red-700 rounded-full">
                  Critical Response
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Immediate clinical assistance and trauma coordination across participating hospitals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-3 px-5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Life-Threatening Emergency Notice:</span> If the patient is unconscious, not breathing, or experiencing severe acute chest trauma, directly dial{' '}
            <a href="tel:108" className="font-bold underline text-red-700 dark:text-red-400">
              108 (National Ambulance)
            </a>{' '}
            or{' '}
            <a href="tel:112" className="font-bold underline text-red-700 dark:text-red-400">
              112 (ERSS)
            </a>{' '}
            without waiting for online forms.
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2 gap-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('immediate')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'immediate'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Immediate Call</span>
          </button>

          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'request'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Ambulance className="w-3.5 h-3.5" />
            <span>Request Assistance</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'contacts'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Emergency Contacts ({emergencyContacts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'tracking'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Track Requests ({myRequests.length})</span>
          </button>
        </div>

        {/* Tab 1: Immediate Call Desk */}
        {activeTab === 'immediate' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                1. Official National Emergency Hotlines (Toll-Free)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="tel:108"
                  className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Ambulance className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xl font-extrabold tracking-tight">108</div>
                      <div className="text-xs text-red-100">Ambulance & Critical Trauma</div>
                    </div>
                  </div>
                  <PhoneCall className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </a>

                <a
                  href="tel:112"
                  className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white shadow-lg shadow-slate-900/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <div className="text-xl font-extrabold tracking-tight">112</div>
                      <div className="text-xs text-slate-300">National Unified ERSS</div>
                    </div>
                  </div>
                  <PhoneCall className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                2. Participating CareSphere Trauma Center Helplines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {hospitalHotlines.map((h) => (
                  <div
                    key={h.hospital_id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {h.hospital_name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {h.location}
                      </div>
                    </div>
                    <a
                      href={`tel:${h.emergency_hotline.replace(/[^0-9+]/g, '')}`}
                      className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{h.emergency_hotline}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Saved Emergency Contacts */}
            {emergencyContacts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  3. Quick Call Saved Contacts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {emergencyContacts.map((c) => (
                    <a
                      key={c.id}
                      href={`tel:${c.phone}`}
                      className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 flex items-center justify-between text-teal-950 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.is_primary === 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100 font-extrabold">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-teal-700 dark:text-teal-400">
                          {c.relationship} • {c.phone}
                        </div>
                      </div>
                      <PhoneCall className="w-4 h-4 text-teal-600" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Request Assistance Form */}
        {activeTab === 'request' && (
          <form onSubmit={handleSubmitEmergency} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Callback Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>

            {/* Emergency Type & Triage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Medical Category *
                </label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="cardiac">Cardiac Emergency / Chest Pain</option>
                  <option value="accident_trauma">Severe Road Accident / Trauma</option>
                  <option value="breathing_distress">Acute Breathing Difficulty / Asthma</option>
                  <option value="stroke_neuro">Stroke / Paralysis / Sudden Weakness</option>
                  <option value="burns_fire">Burns / Fire Injury</option>
                  <option value="pregnancy_delivery">Obstetric / Emergency Labor</option>
                  <option value="poisoning">Poisoning / Toxic Ingestion</option>
                  <option value="other">Other Acute Medical Distress</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Severity Triage Level *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTriageLevel('RED')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                      triageLevel === 'RED'
                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    RED (Critical)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriageLevel('YELLOW')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                      triageLevel === 'YELLOW'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    YELLOW (Urgent)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriageLevel('GREEN')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                      triageLevel === 'GREEN'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    GREEN (Stable)
                  </button>
                </div>
              </div>
            </div>

            {/* Geolocation Sharing */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>Patient Location Details</span>
                </div>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Navigation className={`w-3.5 h-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
                  <span>{locationLoading ? 'Detecting GPS...' : 'Detect Nearest Hospital'}</span>
                </button>
              </div>

              {locationError && (
                <p className="text-xs text-red-600 dark:text-red-400">{locationError}</p>
              )}

              {userLocation && (
                <div className="text-xs text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>GPS Coordinates captured ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}).</span>
                </div>
              )}

              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Street address, landmark, floor, or apartment number"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
              />

              {/* Nearest Hospitals List */}
              {nearbyHospitals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Calculated Nearest Hospitals:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {nearbyHospitals.slice(0, 2).map((nh) => (
                      <div
                        key={nh.id}
                        onClick={() => setSelectedHospitalId(nh.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                          selectedHospitalId === nh.id
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-200'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{nh.name}</span>
                          {nh.distance_km !== null && (
                            <span className="text-[10px] font-extrabold text-red-600">
                              {nh.distance_km} km away
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Hotline: {nh.emergency_hotline}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hospital Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Designated Trauma Hospital
              </label>
              <select
                value={selectedHospitalId || ''}
                onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              >
                {hospitalHotlines.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.hospital_name} ({h.location}) - Hotline: {h.emergency_hotline}
                  </option>
                ))}
              </select>
            </div>

            {/* Symptoms / Clinical Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Patient Current Symptoms & Remarks
              </label>
              <textarea
                rows={2}
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
                placeholder="e.g. Severe chest pain radiating to left arm, sweating profusely, history of hypertension..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-sm shadow-xl shadow-red-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span>{submitting ? 'TRANSMITTING SOS REQUEST...' : 'SUBMIT SOS EMERGENCY REQUEST'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Emergency Contacts Management */}
        {activeTab === 'contacts' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Personal Emergency Contacts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  CareSphere trauma team will notify these individuals in case of critical emergency admission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingContact(!addingContact)}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Add Contact Form */}
            {addingContact && (
              <form onSubmit={handleAddContact} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Relationship (e.g. Spouse, Brother)"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone (+91-...)"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newContactPrimary}
                      onChange={(e) => setNewContactPrimary(e.target.checked)}
                      className="rounded"
                    />
                    <span>Set as primary emergency contact</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAddingContact(false)}
                      className="px-3 py-1 rounded-xl text-xs text-slate-500 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700"
                    >
                      Save Contact
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Contacts List */}
            {emergencyContacts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No emergency contacts saved yet. Add at least one trusted contact.
              </div>
            ) : (
              <div className="space-y-2">
                {emergencyContacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.is_primary === 1 && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {c.relationship} • {c.phone}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${c.phone}`}
                        className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Track Requests */}
        {activeTab === 'tracking' && (
          <div className="p-6 space-y-4">
            {submitSuccess && (
              <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Emergency Request Active: {submitSuccess.reference_no}</span>
                </div>
                <p className="text-xs">
                  Your SOS broadcast has reached the trauma response desk at {submitSuccess.hospital_name || 'CareSphere Super Specialty'}. Keep your phone free.
                </p>
              </div>
            )}

            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              My Emergency Requests History
            </h3>

            {myRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No emergency requests submitted.
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-red-600 dark:text-red-400">
                        {r.reference_no}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          r.status === 'received'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                            : r.status === 'assistance_arranged'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                            : r.status === 'resolved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Type: <span className="capitalize">{r.emergency_type.replace(/_/g, ' ')}</span> • Triage: <span className="font-bold">{r.triage_level}</span>
                    </div>

                    {r.hospital_name && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Hospital: {r.hospital_name}
                      </div>
                    )}

                    {r.dispatched_service && (
                      <div className="text-xs p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium">
                        Dispatched: {r.dispatched_service}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      Logged on: {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
