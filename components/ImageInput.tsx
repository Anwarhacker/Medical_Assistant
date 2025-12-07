import React, { useRef, useState, useEffect } from 'react';

interface ImageInputProps {
  onImageSelected: (file: File) => void;
  selectedImage: File | null;
  isProcessing: boolean;
}

export const ImageInput: React.FC<ImageInputProps> = ({ onImageSelected, selectedImage, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Sync internal state with prop (handles reset)
  useEffect(() => {
    if (selectedImage) {
      setFileName(selectedImage.name);
    } else {
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [selectedImage]);

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) {
      if (!files[0].type.startsWith('image/')) {
        alert("Please upload an image file.");
        return;
      }
      // setFileName set via useEffect when parent updates prop
      onImageSelected(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_0_12px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900 p-6 transition-colors duration-200">
      <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-1">Image Input</p>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mb-4">Upload an image for analysis.</p>
      
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`w-full bg-slate-100 dark:bg-slate-800/50 border-2 border-dashed ${dragActive ? 'border-primary bg-primary/10' : 'border-slate-300 dark:border-slate-700'} rounded-lg flex flex-col justify-center items-center py-10 px-4 text-center transition-all duration-200`}>
        
        <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500 mb-2">upload_file</span>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-2">{fileName ? `Selected: ${fileName}` : 'Drag & drop or'}</p>
        
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleChange} 
          className="hidden" 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex mt-2 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-md h-9 px-3 bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium leading-normal transition-colors disabled:opacity-50">
          <span className="truncate">{fileName ? 'Change File' : 'Browse Files'}</span>
        </button>
      </div>
    </div>
  );
};