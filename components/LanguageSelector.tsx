import React from 'react';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  disabled: boolean;
}

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Hindi', label: 'Hindi (हिंदी)' },
  { code: 'Kannada', label: 'Kannada (कन्नड़)' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)' },
  { code: 'Tamil', label: 'Tamil (தமிழ்)' },
  { code: 'Malayalam', label: 'Malayalam (മലയാളം)' },
  { code: 'Marathi', label: 'Marathi (मराठी)' },
  { code: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
  { code: 'Bengali', label: 'Bengali (বাংলা)' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'French', label: 'French (Français)' },
  { code: 'German', label: 'German (Deutsch)' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  selectedLanguage, 
  onLanguageChange,
  disabled
}) => {
  return (
    <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900/70 p-6 transition-colors duration-200">
      <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-1">Output Language</p>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mb-4">Select the language for the doctor's response.</p>
      
      <div className="relative">
        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg p-3 pr-10 appearance-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
          <span className="material-symbols-outlined">expand_more</span>
        </div>
      </div>
    </div>
  );
};