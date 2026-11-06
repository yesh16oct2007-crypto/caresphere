import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Stethoscope, ArrowRight, HeartPulse, Brain, Bone, Baby, Sparkles } from 'lucide-react';
import { Department } from '../types/index.js';
import { apiUrl } from '../services/api.js';

export const DepartmentsPage: React.FC = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/api/hospital/departments'))
      .then(res => res.json())
      .then(data => setDepartments(data.departments || []))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          Centers of Excellence
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
          Specialized Clinical Departments
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl mt-1">
          Each clinical department across CareSphere&apos;s participating hospital network is led by senior specialist consultants and supported by specialized diagnostic equipment.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs hover:shadow-lg hover:border-brand-300 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-50 to-teal-100 dark:from-brand-950/60 dark:to-teal-950/60 text-brand-600 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60 flex items-center justify-center mb-4 shadow-2xs">
                  <Building2 className="w-6 h-6" />
                </div>

                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {dept.name}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    {dept.code}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {dept.description}
                </p>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div><strong>Head of Dept:</strong> {dept.head_of_department}</div>
                  <div><strong>Clinical Network:</strong> Multi-Hospital Outpatient Coverage</div>
                  <div><strong>Phone Ext:</strong> {dept.phone_extension}</div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                  {dept.approved_doctors_count || 1} Verified Specialists
                </span>
                <Link
                  to={`/doctors?department_id=${dept.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  <span>View Doctors</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
