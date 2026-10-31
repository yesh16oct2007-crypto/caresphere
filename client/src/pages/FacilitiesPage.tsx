import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Clock, PhoneCall, MapPin, Award, CheckCircle2 } from 'lucide-react';
import { Facility } from '../types/index.js';
import { apiUrl } from '../services/api.js';

export const FacilitiesPage: React.FC = () => {
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/api/hospital/facilities'))
      .then(res => res.json())
      .then(data => setFacilities(data.facilities || []))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          Hospital Infrastructure
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
          Hospital Facilities & Diagnostic Services
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl mt-1">
          CareSphere is equipped with 24/7 Level-1 trauma resuscitation facilities, NABL-certified automated laboratories, high-resolution diagnostic imaging, and fully accessible patient desks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilities.map((fac) => (
          <div
            key={fac.id}
            className={`p-6 sm:p-7 rounded-3xl border transition-all flex flex-col justify-between ${
              fac.is_emergency_facility === 1
                ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  {fac.category}
                </span>
                {fac.is_emergency_facility === 1 && (
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                    24/7 Emergency
                  </span>
                )}
              </div>

              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                {fac.name}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {fac.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span>{fac.timing}</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
                <a href={`tel:${fac.contact_number}`} className="hover:underline font-semibold text-slate-700 dark:text-slate-200">
                  {fac.contact_number}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{fac.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
