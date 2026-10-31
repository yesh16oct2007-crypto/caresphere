import React from 'react';
import { PhoneCall, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const EmergencyBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-red-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-inner transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-200 animate-pulse shrink-0" />
          <span className="font-semibold">{t('emergency.banner_title')}:</span>
          <span className="hidden md:inline text-red-100">{t('emergency.banner_text')}</span>
        </div>
        <div className="flex items-center gap-4 text-xs sm:text-sm">
          <a
            href="tel:+918022739911"
            className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 text-white px-2.5 py-1 rounded-md font-bold transition-colors shadow-sm"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>+91-80-CARE-911</span>
          </a>
          <span className="bg-red-800/80 px-2 py-0.5 rounded text-red-100 text-xs font-semibold">
            {t('emergency.ambulance')}
          </span>
        </div>
      </div>
    </div>
  );
};
