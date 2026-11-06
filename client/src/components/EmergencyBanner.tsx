import React, { useState } from 'react';
import { PhoneCall, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmergencySOSModal } from './EmergencySOSModal.js';

export const EmergencyBanner: React.FC = () => {
  const { t } = useTranslation();
  const [sosModalOpen, setSosModalOpen] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-inner transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-200 animate-pulse shrink-0" />
            <span className="font-extrabold uppercase tracking-wider text-[11px] bg-red-800/80 px-2 py-0.5 rounded">EMERGENCY SOS</span>
            <span className="hidden md:inline text-red-100">{t('emergency.banner_text')}</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <button
              onClick={() => setSosModalOpen(true)}
              className="bg-white text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg font-black text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>SOS DESK</span>
            </button>
            <a
              href="tel:108"
              className="flex items-center gap-1.5 bg-red-800 hover:bg-red-900 text-white px-2.5 py-1 rounded-lg font-bold transition-colors shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>108 Ambulance</span>
            </a>
          </div>
        </div>
      </div>
      <EmergencySOSModal isOpen={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </>
  );
};
