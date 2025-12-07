import React, { useRef, useState, useEffect } from 'react';

interface OutputAreaProps {
  voiceResponseUrl: string | null;
  imagePreviewUrl: string | null;
  onAnalyze: () => void;
  canAnalyze: boolean;
  isAnalyzing: boolean;
}

export const OutputArea: React.FC<OutputAreaProps> = ({ 
    voiceResponseUrl, 
    imagePreviewUrl,
    onAnalyze,
    canAnalyze,
    isAnalyzing
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    // Reset state when new url comes in
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        // Auto-play when new audio URL arrives
        if (voiceResponseUrl) {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(err => console.log("Autoplay prevented by browser:", err));
        }
    }
  }, [voiceResponseUrl]);

  const togglePlay = () => {
    if (audioRef.current && voiceResponseUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
            console.error("Playback failed:", error);
            setIsPlaying(false);
        });
      }
    }
  };

  // Sync state with actual audio events to ensure UI is accurate
  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
        const current = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        if (duration && !isNaN(duration)) {
            setProgress((current / duration) * 100);
        }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
    }
  };

  const toggleFullScreen = () => {
    if (imagePreviewUrl) {
      setIsFullScreen(!isFullScreen);
    }
  };

  return (
    <div className="md:col-span-3 flex flex-col gap-6">
      
      {/* Audio Playback Card */}
      <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900/70 p-6 transition-colors duration-200">
        <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">Doctor's Voice </p>
        <div className="flex items-center gap-3">
          <button 
            onClick={togglePlay}
            disabled={!voiceResponseUrl}
            className="flex items-center justify-center rounded-full size-10 bg-primary hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white transition-colors">
            <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
          
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-100 ease-linear" 
                style={{ width: `${progress}%` }}>
            </div>
          </div>
          
          <audio 
            ref={audioRef} 
            src={voiceResponseUrl || ''} 
            onPlay={onPlay}
            onPause={onPause}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="hidden"
          />
        </div>
        {!voiceResponseUrl && (
            <p className="text-xs text-slate-400 mt-2 italic">Audio will be generated after analysis.</p>
        )}
      </div>

      {/* Analyzed Image Card */}
      <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900/70 p-6 transition-colors duration-200">
        <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">Image Analysis</p>
        <div 
          className={`w-full bg-center bg-no-repeat bg-contain bg-black/5 dark:bg-black/20 aspect-video rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 ${imagePreviewUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          onClick={toggleFullScreen}
          title={imagePreviewUrl ? "Click to expand" : ""}
        >
          {imagePreviewUrl ? (
             <img src={imagePreviewUrl} alt="User uploaded for analysis" className="w-full h-full object-contain" />
          ) : (
             <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500">image</span>
          )}
        </div>
        {imagePreviewUrl && (
          <p className="text-center text-xs text-slate-400 mt-2 cursor-pointer hover:text-primary transition-colors" onClick={toggleFullScreen}>
            Click image to view full screen
          </p>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        disabled={!canAnalyze || isAnalyzing}
        className="w-full h-14 rounded-xl bg-primary text-white hover:bg-blue-600 disabled:bg-blue-200 dark:disabled:bg-slate-700 disabled:text-blue-300 dark:disabled:text-slate-500 disabled:cursor-not-allowed font-bold text-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
      >
        {isAnalyzing ? (
            <>
                <span className="animate-spin material-symbols-outlined">progress_activity</span>
                Processing...
            </>
        ) : (
            <>
                <span className="material-symbols-outlined">medical_services</span>
                Analyze Inputs
            </>
        )}
      </button>

      {/* Full Screen Image Modal */}
      {isFullScreen && imagePreviewUrl && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setIsFullScreen(false)}
        >
            <button 
                onClick={() => setIsFullScreen(false)}
                className="absolute top-4 right-4 z-[101] p-2 bg-slate-800/50 hover:bg-slate-700 text-white rounded-full transition-colors"
            >
                <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <img 
                src={imagePreviewUrl} 
                alt="Full screen analysis" 
                className="max-w-full max-h-full object-contain rounded shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Don't close when clicking the image itself
            />
        </div>
      )}

    </div>
  );
};