import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DemonstrationBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-amber-500/10 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-b border-amber-500/20 px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2">
      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span>{t('home.demo_disclaimer')}</span>
    </div>
  );
};
