import React, { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
  onAudioReady: (blob: Blob) => void;
  isProcessing: boolean;
  audioBlob: Blob | null;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onAudioReady, isProcessing, audioBlob }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount to prevent leaks and ensure recording stops on reset
  useEffect(() => {
    return () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
    };
  }, []);

  // Reset file input if audioBlob is cleared externally
  useEffect(() => {
    if (!audioBlob && fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, [audioBlob]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onAudioReady(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAudioReady(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900/70 p-6 transition-colors duration-200">
      <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-1">Voice Input</p>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mb-4">Record your question or upload an audio file.</p>
      
      <div className="flex flex-col items-center gap-4">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            disabled={isProcessing}
            className="flex w-full min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary hover:bg-blue-600 text-white text-base font-medium leading-normal gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined">mic</span>
            <span className="truncate">Record</span>
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="flex w-full min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-red-500 hover:bg-red-600 text-white text-base font-medium leading-normal gap-2 transition-colors animate-pulse">
            <span className="material-symbols-outlined">stop_circle</span>
            <span className="truncate">Stop Recording ({formatTime(recordingTime)})</span>
          </button>
        )}

        <div className="relative w-full max-w-[480px]">
            <input 
                type="file" 
                accept="audio/*" 
                onChange={handleFileUpload} 
                ref={fileInputRef}
                className="hidden"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || isProcessing}
                className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-transparent border border-slate-200 dark:border-slate-700 text-primary dark:text-primary text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                <span className="truncate">Upload Audio File</span>
            </button>
        </div>
      </div>
      
      <div className="mt-4 text-center text-slate-500 dark:text-slate-400 text-sm">
        Status: {isRecording ? 'Recording...' : 'Ready to Record'}
      </div>
    </div>
  );
};