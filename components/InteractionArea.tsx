import React from 'react';
import { AnalysisResult } from '../types';

interface InteractionAreaProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  questionText: string;
  setQuestionText: (text: string) => void;
  selectedLanguage?: string;
}

export const InteractionArea: React.FC<InteractionAreaProps> = ({ 
  result, 
  isAnalyzing, 
  questionText,
  setQuestionText,
  selectedLanguage = "English"
}) => {
  
  const copyToClipboard = (text: string) => {
    if (text) {
        navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="md:col-span-5 flex flex-col gap-6">
      
      {/* User Query Input Card */}
      <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900/70 p-6 transition-colors duration-200">
        <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">Your Question</p>
        
        {/* If we have a result with transcription, show it. Otherwise show editable text area */}
        {result?.transcription && result.transcription.trim() !== "" ? (
             <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 min-h-[100px] mb-2">
                 <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-bold">Audio Transcription</p>
                 <p className="text-slate-700 dark:text-slate-300 text-base font-normal leading-normal">
                    "{result.transcription}"
                 </p>
             </div>
        ) : null}

        <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type a specific question about the image or your symptoms here..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg p-3 min-h-[100px] border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-base"
        />
        <p className="text-xs text-slate-400 mt-2">
            You can use voice recording, this text field, or both.
        </p>
      </div>

      {/* AI Response Card - English (Always visible) */}
      <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900/70 p-6 flex-grow transition-colors duration-200 min-h-[200px]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Doctor's Response (English)</p>
          <button 
            onClick={() => copyToClipboard(result?.analysis || "")}
            className="flex items-center justify-center rounded-md h-8 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium gap-1 transition-colors">
            <span className="material-symbols-outlined !text-base">content_copy</span>
            Copy
          </button>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 relative">
          {isAnalyzing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[2px] rounded-lg z-10 transition-all">
                  <div className="flex flex-col items-center gap-6 p-8 rounded-2xl">
                      <div className="relative size-16">
                          <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      </div>
                      <div className="text-center space-y-2">
                          <p className="text-xl font-bold text-slate-800 dark:text-white animate-pulse">Analyzing...</p>
                      </div>
                  </div>
              </div>
          ) : result?.analysis ? (
             <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-base font-normal leading-relaxed whitespace-pre-wrap">
                {result.analysis}
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 opacity-60">
                <span className="material-symbols-outlined text-4xl mb-2">medical_services</span>
                <p className="text-sm font-normal leading-normal italic text-center">
                    Analysis will appear here...
                </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Response Card - Localized (Visible only if language selected and result exists) */}
      {(selectedLanguage !== 'English' && (isAnalyzing || result?.localizedAnalysis)) && (
          <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900/70 p-6 flex-grow transition-colors duration-200 min-h-[200px] border-t-4 border-primary/20">
            <div className="flex justify-between items-center mb-3">
              <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Doctor's Response ({selectedLanguage})</p>
              <button 
                onClick={() => copyToClipboard(result?.localizedAnalysis || "")}
                className="flex items-center justify-center rounded-md h-8 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium gap-1 transition-colors">
                <span className="material-symbols-outlined !text-base">content_copy</span>
                Copy
              </button>
            </div>
            <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 relative">
              {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-10">
                      <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Translating...</p>
                  </div>
              ) : result?.localizedAnalysis ? (
                 <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-base font-normal leading-relaxed whitespace-pre-wrap">
                    {result.localizedAnalysis}
                 </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 opacity-60">
                    <p className="text-sm font-normal leading-normal italic text-center">
                        Translation will appear here...
                    </p>
                </div>
              )}
            </div>
          </div>
      )}

    </div>
  );
};