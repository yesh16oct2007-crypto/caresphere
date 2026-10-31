import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Navigation,
  Compass,
  Building2,
  Clock,
  CheckCircle2,
  X,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  PhoneCall
} from 'lucide-react';
import { DoctorProfile } from '../types/index.js';

interface DoctorNavigationModalProps {
  doctor: Partial<DoctorProfile> | null;
  onClose: () => void;
}

export const DoctorNavigationModal: React.FC<DoctorNavigationModalProps> = ({ doctor, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!doctor) return null;

  const room = doctor.room_number || 'Chamber 101';
  const floor = doctor.floor || doctor.department_floor || '1st Floor';
  const wing = doctor.wing || `${doctor.department_name || 'Clinical'} Wing`;
  const presence = doctor.current_presence_status || 'in_opd';
  const instructions = doctor.navigation_instructions ||
    `Enter via Main Hospital Atrium. Proceed to Elevator Bank A and take elevator to ${floor}. Walk toward the ${doctor.department_name || ''} corridor. ${room} is located opposite the Nursing Station.`;

  const getPresenceBadge = (status: string) => {
    switch (status) {
      case 'in_opd':
        return {
          label: 'Available in Chamber',
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
          dot: 'bg-emerald-500 animate-pulse'
        };
      case 'in_consultation':
        return {
          label: 'In Consultation with Patient',
          bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200',
          dot: 'bg-amber-500'
        };
      case 'on_rounds':
        return {
          label: 'On Inpatient Ward Rounds',
          bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
          dot: 'bg-blue-500'
        };
      case 'in_surgery':
        return {
          label: 'In Surgery / Operation Theatre',
          bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200',
          dot: 'bg-purple-500'
        };
      case 'off_duty':
        return {
          label: 'Off Duty at Present',
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400',
          dot: 'bg-slate-400'
        };
      default:
        return {
          label: 'In Hospital',
          bg: 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200',
          dot: 'bg-teal-500'
        };
    }
  };

  const presenceInfo = getPresenceBadge(presence);

  const handleCopyDirections = () => {
    const textToCopy = `CareSphere Indoor Navigation for ${doctor.name}:\nLocation: ${room}, ${floor}, ${wing}\nDirections: ${instructions}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 sm:p-7 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  Hospital Indoor GPS
                </span>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${presenceInfo.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${presenceInfo.dot}`} />
                  <span>{presenceInfo.label}</span>
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {doctor.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{doctor.specialization} • {doctor.department_name}</span>
                {doctor.hospital_name && (
                  <span className="font-semibold text-brand-700 dark:text-brand-300">
                    • {doctor.hospital_name} {doctor.hospital_location ? `(${doctor.hospital_location})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-5 pr-1 text-slate-700 dark:text-slate-200 text-xs">
          {/* Real-time Chamber Coordinates Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gradient-to-br from-brand-50 to-teal-50 dark:from-slate-900 dark:to-slate-800/80 p-4 rounded-2xl border border-brand-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-brand-600 flex items-center justify-center shadow-xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Consultation Chamber</span>
                <strong className="text-sm font-extrabold text-slate-900 dark:text-white">{room}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-teal-600 flex items-center justify-center shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Building Floor</span>
                <strong className="text-sm font-extrabold text-slate-900 dark:text-white">{floor}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-medblue-600 flex items-center justify-center shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Department Wing</span>
                <strong className="text-xs font-bold text-slate-900 dark:text-white truncate block">{wing}</strong>
              </div>
            </div>
          </div>

          {/* Interactive Hospital Floor Map Blueprint (SVG Diagram) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 p-4 overflow-hidden relative shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-teal-400" />
                <span>Interactive Floor Schematic — {floor}</span>
              </span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                You Are Viewing: {wing}
              </span>
            </div>

            {/* SVG Floorplan Diagram */}
            <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800 overflow-x-auto">
              <svg viewBox="0 0 600 240" className="w-full h-auto min-w-[500px]" xmlns="http://www.w3.org/2000/svg">
                {/* Background grid */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="600" height="240" fill="url(#grid)" />

                {/* Main Hallway Corridor */}
                <rect x="80" y="90" width="440" height="50" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                <text x="300" y="120" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="2">
                  MAIN CLINICAL CORRIDOR
                </text>

                {/* Entrance / Elevators Zone */}
                <rect x="20" y="75" width="60" height="80" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                <text x="50" y="110" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">ELEVATOR</text>
                <text x="50" y="125" fill="#38bdf8" fontSize="8" textAnchor="middle">BANK A</text>

                {/* Nursing Station */}
                <rect x="220" y="30" width="100" height="50" rx="4" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="270" y="55" fill="#93c5fd" fontSize="9" fontWeight="bold" textAnchor="middle">NURSING DESK</text>
                <text x="270" y="70" fill="#60a5fa" fontSize="8" textAnchor="middle">Help & Vitals</text>

                {/* Other Doctor Chambers */}
                <rect x="100" y="30" width="80" height="50" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="140" y="60" fill="#64748b" fontSize="8" textAnchor="middle">Chamber 301</text>

                <rect x="100" y="150" width="80" height="50" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="140" y="180" fill="#64748b" fontSize="8" textAnchor="middle">Diagnostics</text>

                <rect x="220" y="150" width="100" height="50" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="270" y="180" fill="#64748b" fontSize="8" textAnchor="middle">Patient Waiting Lounge</text>

                <rect x="360" y="150" width="100" height="50" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="410" y="180" fill="#64748b" fontSize="8" textAnchor="middle">Treatment Room</text>

                {/* Doctor's Destination Chamber (Highlighted with glowing border) */}
                <rect
                  x="360"
                  y="25"
                  width="130"
                  height="60"
                  rx="8"
                  fill="#064e3b"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
                <text x="425" y="50" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">
                  ★ {room}
                </text>
                <text x="425" y="65" fill="#a7f3d0" fontSize="8" textAnchor="middle">
                  {doctor.name?.replace('Dr. ', '')}
                </text>
                <text x="425" y="77" fill="#6ee7b7" fontSize="7" textAnchor="middle">
                  {presenceInfo.label}
                </text>

                {/* Navigation Walking Route (Dotted Neon Line with Arrow) */}
                <path
                  d="M 80 115 L 425 115 L 425 88"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />

                {/* Beacon Pin Point */}
                <circle cx="425" cy="88" r="5" fill="#10b981" />
                <circle cx="425" cy="88" r="9" fill="none" stroke="#34d399" strokeWidth="1.5" className="animate-ping" />
              </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
              <span>● Green Beacon: Doctor's Chamber</span>
              <span>--- Cyan Dotted Line: Walking Route from Elevators</span>
            </div>
          </div>

          {/* Turn-by-Turn Wayfinding Steps */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              <span>Step-by-Step Wayfinding Guide</span>
            </h4>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Main Hospital Lobby Entry:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter through the main CareSphere hospital gate and proceed past the Central Registration Atrium.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Elevator to {floor}:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Take Elevator Bank A (or the wide patient ramp) up to the <strong>{floor}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Arrive at {room}:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {instructions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            For wheelchair assistance or porter guidance, dial hospital extension <strong>#100</strong> from any corridor phone.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDirections}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Directions'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
