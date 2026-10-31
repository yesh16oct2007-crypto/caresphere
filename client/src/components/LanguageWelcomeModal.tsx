import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Search, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageOption, detectBrowserLanguage } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';

export const LanguageWelcomeModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState(i18n.language || 'en');
  const [detectedCode, setDetectedCode] = useState('en');

  useEffect(() => {
    const hasSeenModal = localStorage.getItem('caresphere_first_visit_completed');
    if (!hasSeenModal) {
      const detected = detectBrowserLanguage();
      setDetectedCode(detected);
      setSelectedCode(detected);
      setIsOpen(true);
    }
  }, []);

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
    l.region.toLowerCase().includes(search.toLowerCase())
  );

  const detectedLangObj = SUPPORTED_LANGUAGES.find(l => l.code === detectedCode) || SUPPORTED_LANGUAGES[0];

  const handleConfirm = () => {
    setLanguage(selectedCode);
    localStorage.setItem('caresphere_first_visit_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 sm:p-8 overflow-hidden relative">
        {/* Decorative ambient background */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-medblue-500 text-white flex items-center justify-center shadow-md">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              Welcome to CareSphere!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Which language would you prefer? / உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்
            </p>
          </div>
        </div>

        {/* Auto-detected suggestion badge */}
        {detectedCode !== 'en' && (
          <div className="my-4 p-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <div className="text-xs text-brand-900 dark:text-brand-200">
                <span>Detected from browser: </span>
                <strong className="font-semibold text-brand-700 dark:text-brand-300">
                  {detectedLangObj.nativeName} ({detectedLangObj.name})
                </strong>
              </div>
            </div>
            <button
              onClick={() => setSelectedCode(detectedCode)}
              className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline px-2 py-1"
            >
              Use Detected
            </button>
          </div>
        )}

        {/* Search input */}
        <div className="relative mt-4 mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search language (English, தமிழ், हिन्दी, తెలుగు...)"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 my-3">
          {filteredLanguages.map((lang: LanguageOption) => {
            const isSelected = selectedCode === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setSelectedCode(lang.code)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 ring-2 ring-brand-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-brand-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-base font-bold">{lang.nativeName}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{lang.name}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{lang.region}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
            You can change your language anytime from the top navigation bar.
          </span>
          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <span>Proceed in {SUPPORTED_LANGUAGES.find(l => l.code === selectedCode)?.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
