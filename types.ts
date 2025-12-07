export interface AnalysisResult {
  transcription: string;
  analysis: string; // The primary analysis in English (canonical for history)
  localizedAnalysis?: string; // The analysis in the selected target language
}

export interface AppState {
  isRecording: boolean;
  isAnalyzing: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  result: AnalysisResult | null;
  voiceResponseUrl: string | null;
  error: string | null;
}

export type Theme = 'light' | 'dark';