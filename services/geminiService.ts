import { GoogleGenAI, Modality, Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { blobToBase64, compressImage } from "../utils/helpers";
import { AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper to strip markdown code blocks from JSON string
const cleanJSON = (text: string): string => {
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
};

// Helper to strip markdown symbols for TTS
const cleanTextForTTS = (text: string): string => {
  return text
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '')   // Remove italics/bullets
    .replace(/#/g, '')    // Remove headers
    .replace(/\[.*?\]/g, '') // Remove links
    .replace(/`/g, '')    // Remove code ticks
    .trim();
};

const cleanTranscription = (text: any): string => {
  if (!text) return "";
  const str = String(text).trim();
  // Check for common "null" variations including punctuation
  const lower = str.toLowerCase().replace(/[.,!?;:]/g, '');
  if (['null', 'nil', 'none', 'undefined', 'na', 'n/a', 'no audio'].includes(lower)) {
    return "";
  }
  return str;
};

// Timeout helper
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([
    promise.then(res => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

export const analyzeMedicalInput = async (
  audioBlob: Blob | null,
  imageFile: File | null,
  userQuestion: string = "",
  history: string = "",
  language: string = "English"
): Promise<AnalysisResult> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const parts: any[] = [];

  // System Prompt
  const systemPrompt = `
  You are an expert Medical AI Assistant.
  
  OUTPUT FORMAT:
  Return a raw JSON object (no markdown) with exactly these keys:
  {
      "transcription": "Text of the audio if present, else empty string",
      "analysis_english": "The medical analysis in English",
      "analysis_localized": "The medical analysis translated into ${language}. If ${language} is English, this can be null."
  }
  `;

  // Construct dynamic instructions based on inputs
  let taskInstructions = `
  TASK:
  1. Act as a professional doctor. I know you are not but this is for learning purposes.
  `;

  if (history) {
    taskInstructions += `
      CONTEXT:
      You have already analyzed this image. Here is the conversation history:
      """
      ${history}
      """
      The user is now asking a follow-up question based on the image and the above history.
      Answer the new question directly. Do not repeat the initial full diagnosis unless asked.
      `;
  }

  if (audioBlob) {
    taskInstructions += `2. Transcribe the audio precisely in the 'transcription' field (keep transcription in original language).\n`;
    taskInstructions += `3. If the audio contains a question, answer it.\n`;
  }

  if (userQuestion) {
    taskInstructions += `4. The user has asked this specific question: "${userQuestion}". Answer this.\n`;
  }

  if (imageFile) {
    taskInstructions += `
      5. What's in this image? Do you find anything wrong with it medically?
      6. If you make a differential, suggest some remedies for them and also you can tell them the medicine name as well.
      `;
  } else {
    taskInstructions += `
      5. Answer the medical question provided in the text or audio.
      `;
  }

  taskInstructions += `
  CRITICAL RULES:
  - Do NOT add any numbers or special characters in your response.
  - Your response should be in one long paragraph in 'analysis_english'.
  - Always answer as if you are answering to a real person.
  - Do NOT say 'In the image I see' but say 'With what I see, I think you have ....'
  - Do NOT respond as an AI model in markdown, your answer should mimic that of an actual doctor not an AI bot.
  - Keep your answer concise (max 2 sentences). No preamble, start your answer right away please.
  - Populate 'analysis_localized' with the SAME content translated into ${language}.
  - If ${language} is English, you may leave 'analysis_localized' as null or empty string.
  - DO NOT return an empty analysis string.
  `;

  // Add Audio Part
  if (audioBlob) {
    const audioBase64 = await blobToBase64(audioBlob);
    parts.push({
      inlineData: {
        mimeType: audioBlob.type || 'audio/webm',
        data: audioBase64
      }
    });
  }

  // Add Image Part
  if (imageFile) {
    try {
      const imageBase64 = await compressImage(imageFile);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    } catch (e) {
      console.error("Image compression failed", e);
      throw new Error("Failed to process image.");
    }
  }

  if (parts.length === 0 && !userQuestion) {
    throw new Error("No input provided (audio, image, or text).");
  }

  // Add text instructions
  parts.push({ text: taskInstructions });

  try {
    // 45 second timeout for analysis
    const response = await withTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
          systemInstruction: systemPrompt,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          ],
          responseMimeType: "application/json",
        }
      }),
      45000,
      "Analysis request timed out. Please try a smaller image or shorter audio."
    );

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI.");
    }

    try {
      const cleanedText = cleanJSON(text);
      const parsed = JSON.parse(cleanedText);

      const result: AnalysisResult = {
        transcription: "",
        analysis: ""
      };

      // Handle transcription
      if (parsed.transcription) {
        result.transcription = cleanTranscription(parsed.transcription);
      }
      if (!audioBlob) {
        result.transcription = ""; // No audio means no transcription needed
      }

      // Handle analysis
      if (parsed.analysis_english) {
        result.analysis = String(parsed.analysis_english).trim();
      } else if (parsed.analysis) {
        // Fallback if model uses old format
        result.analysis = String(parsed.analysis).trim();
      } else if (parsed.response) {
        result.analysis = String(parsed.response).trim();
      }

      // Handle localization
      if (parsed.analysis_localized && language !== 'English') {
        result.localizedAnalysis = String(parsed.analysis_localized).trim();
      }

      // Robust Fallback
      if (!result.analysis || result.analysis.length < 5) {
        result.analysis = "I processed your input but could not generate a specific diagnosis. Please try providing more context or a clearer image.";
      }

      return result;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw text:", text);
      return {
        transcription: "",
        analysis: text
      };
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateVoiceResponse = async (text: string): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const textToSpeak = cleanTextForTTS(text);
  const safeText = textToSpeak.length > 2000 ? textToSpeak.substring(0, 2000) + "..." : textToSpeak;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: safeText }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data generated.");

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return addWavHeader(bytes, 24000, 1);
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

function addWavHeader(samples: Uint8Array, sampleRate: number, numChannels: number): string {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length, true);
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(samples);
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}