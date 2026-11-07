import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';

export const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: LanguageOption) => {
    setLanguage(lang.code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        <span className="font-semibold">{currentLang.nativeName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {t('nav.switch_lang')}
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map(lang => {
              const isSelected = lang.code === currentLang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-brand-50/70 dark:hover:bg-slate-700/70 transition-colors ${
                    isSelected ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-400 ml-2">({lang.name})</span>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{lang.region}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
