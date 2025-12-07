import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoiceInput } from './components/VoiceInput';
import { ImageInput } from './components/ImageInput';
import { LanguageSelector } from './components/LanguageSelector';
import { InteractionArea } from './components/InteractionArea';
import { OutputArea } from './components/OutputArea';
import { analyzeMedicalInput, generateVoiceResponse } from './services/geminiService';
import { AnalysisResult } from './types';

function App() {
  const [isDark, setIsDark] = useState(false);
  const [sessionId, setSessionId] = useState(0); // Used to force-reset child components
  const [language, setLanguage] = useState("English");
  
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lastAnalyzedImage, setLastAnalyzedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [voiceResponseUrl, setVoiceResponseUrl] = useState<string | null>(null);

  // Theme Toggling
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleAudioReady = (blob: Blob) => {
    setAudioBlob(blob);
    // Note: We don't auto-analyze audio anymore to allow user to add text or image first
  };

  // Centralized analysis function
  const performAnalysis = async (currentAudio: Blob | null, currentImage: File | null, currentQuestion: string) => {
    if (!currentAudio && !currentImage && !currentQuestion.trim()) {
        alert("Please provide at least one input: Image, Audio, or Text Question.");
        return;
    }

    setIsAnalyzing(true);
    
    // Determine if this is a follow-up interaction
    // It is a follow-up if:
    // 1. We have an existing result/analysis
    // 2. The image hasn't changed (or both are null)
    // 3. We have some input (usually text question or audio)
    const isFollowUp = result !== null && currentImage === lastAnalyzedImage;
    
    // If it's NOT a follow-up, clear previous results visually to show we are starting fresh
    if (!isFollowUp) {
        setResult(null);
    }

    setVoiceResponseUrl(null);

    try {
      // If follow-up, pass the previous analysis history
      // Note: We use the ENGLISH analysis for history to keep context consistent for the AI
      const history = isFollowUp ? result?.analysis || "" : "";
      
      // 1. Analyze Input
      const analysisResult = await analyzeMedicalInput(currentAudio, currentImage, currentQuestion, history, language);

      if (isFollowUp) {
          // Identify the question asked (either text or transcribed audio)
          const askedQuestion = currentQuestion || analysisResult.transcription || "Follow-up Question";
          
          // Append the new interaction to the history (English)
          const newConversation = `${history}\n\n---\n\n**You asked:** ${askedQuestion}\n\n**AI Doctor:** ${analysisResult.analysis}`;
          
          setResult({
              transcription: analysisResult.transcription,
              analysis: newConversation, // Stores accumulated English history
              localizedAnalysis: analysisResult.localizedAnalysis // Stores current turn localized response
          });
          
          // Generate voice for the answer
          // Use localized text if available, otherwise English
          const textToSpeak = analysisResult.localizedAnalysis || analysisResult.analysis;
          if (textToSpeak) {
             try {
                const audioUrl = await generateVoiceResponse(textToSpeak);
                setVoiceResponseUrl(audioUrl);
             } catch (ttsError) { console.error(ttsError); }
          }

      } else {
          // New conversation
          setResult(analysisResult);
          
          // Generate voice for the answer
          const textToSpeak = analysisResult.localizedAnalysis || analysisResult.analysis;
          if (textToSpeak) {
            try {
                const audioUrl = await generateVoiceResponse(textToSpeak);
                setVoiceResponseUrl(audioUrl);
            } catch (ttsError) { console.error(ttsError); }
          }
      }

      // Update tracking
      setLastAnalyzedImage(currentImage);
      setQuestionText(""); // Clear text input after successful send
      setAudioBlob(null); // Clear audio after send

    } catch (error) {
      console.error("Analysis failed", error);
      // alert("Failed to analyze input. Please check the console for details.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageSelected = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    
    // For a new image, we trigger analysis immediately (fresh start)
    performAnalysis(audioBlob, file, questionText);
  };

  // Manual trigger for retries or voice/text updates
  const handleAnalyzeClick = () => {
    performAnalysis(audioBlob, imageFile, questionText);
  };

  const handleClearAll = () => {
    // Immediate reset without confirmation dialog for better UX
    
    // Revoke URLs to avoid memory leaks
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    if (voiceResponseUrl) URL.revokeObjectURL(voiceResponseUrl);

    // Reset all state
    setAudioBlob(null);
    setImageFile(null);
    setLastAnalyzedImage(null);
    setImagePreviewUrl(null);
    setQuestionText("");
    setIsAnalyzing(false);
    setResult(null);
    setVoiceResponseUrl(null);
    
    // Increment session ID to force complete re-mount of child components
    // This ensures no internal state (like recording timers or file inputs) lingers
    setSessionId(prev => prev + 1);
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <Header toggleTheme={toggleTheme} isDark={isDark} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-black dark:text-white tracking-light text-3xl font-bold leading-tight text-left drop-shadow-sm">AI Medical Assistant</h1>
          <p className="text-black dark:text-slate-400 text-base font-normal leading-normal">
            Upload your image and voice/text input for medical guidance. The AI will analyze your inputs and provide a response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
          
          {/* Left Column: Inputs */}
          <div className="md:col-span-4 flex flex-col gap-6">
            <VoiceInput 
                key={`voice-${sessionId}`}
                onAudioReady={handleAudioReady} 
                isProcessing={isAnalyzing} 
                audioBlob={audioBlob}
            />
            <ImageInput 
                key={`image-${sessionId}`}
                onImageSelected={handleImageSelected} 
                isProcessing={isAnalyzing} 
                selectedImage={imageFile}
            />
            
            <LanguageSelector 
                selectedLanguage={language}
                onLanguageChange={setLanguage}
                disabled={isAnalyzing}
            />
            
            {/* Status indicators and Clear Button */}
            <div className="flex flex-col gap-4">
                <div className="text-xs text-black dark:text-slate-400 flex flex-col gap-1 p-3 rounded-lg border border-blue-300/30 dark:border-slate-700 bg-blue-500/5 dark:bg-slate-800/50">
                   <div className="flex justify-between items-center">
                     <span className="font-medium">Audio Input:</span>
                     <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${audioBlob ? "bg-green-500/20 text-white" : "bg-slate-500/20 text-slate-400"}`}>
                        {audioBlob ? "Recorded" : "None"}
                     </span>
                   </div>
                   <div className="flex justify-between items-center mt-1">
                     <span className="font-medium">Image Input:</span>
                     <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${imageFile ? "bg-green-500/20 text-white" : "bg-slate-500/20 text-slate-400"}`}>
                        {imageFile ? "Uploaded" : "None"}
                     </span>
                   </div>
                </div>

                <button 
                    onClick={handleClearAll}
                    disabled={!audioBlob && !imageFile && !questionText && !result}
                    className="w-full py-3 px-4 bg-red-500 text-white border border-white/20 hover:border-red-500/50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <span className="material-symbols-outlined group-hover:text-red-400 transition-colors">restart_alt</span>
                    <span className="group-hover:text-red-100 transition-colors">Start New Session</span>
                </button>
            </div>
          </div>

          {/* Center Column: Interactions */}
          <InteractionArea 
            key={`interaction-${sessionId}`}
            result={result} 
            isAnalyzing={isAnalyzing} 
            questionText={questionText}
            setQuestionText={setQuestionText}
            selectedLanguage={language}
          />

          {/* Right Column: Outputs & Actions */}
          <OutputArea 
            key={`output-${sessionId}`}
            voiceResponseUrl={voiceResponseUrl} 
            imagePreviewUrl={imagePreviewUrl}
            onAnalyze={handleAnalyzeClick}
            canAnalyze={!!(audioBlob || imageFile || questionText.trim())} 
            isAnalyzing={isAnalyzing}
          />

        </div>

        <footer className="mt-12 py-6 border-t border-blue-400 dark:border-slate-800 text-center">
          <p className="text-xs text-black dark:text-slate-500 max-w-2xl mx-auto">
            Disclaimer: This AI Medical Assistant provides information for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;