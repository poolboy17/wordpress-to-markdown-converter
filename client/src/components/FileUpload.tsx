import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { FileInfo } from "@shared/schema";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelected: (fileInfo: FileInfo | null) => void;
}

export function FileUpload({ onFileSelected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    // Check if the file is an XML file
    if (!file.name.toLowerCase().endsWith('.xml') && !file.name.toLowerCase().endsWith('.xml.gz')) {
      alert('Please upload a WordPress XML export file (.xml or .xml.gz)');
      return;
    }

    const fileInfo: FileInfo = {
      name: file.name,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      type: file.type
    };

    onFileSelected(fileInfo);
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 mb-6 ${
        isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary'
      }`}
      onClick={triggerFileInput}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept=".xml,.xml.gz" 
        onChange={handleFileSelect}
      />
      <div className="space-y-3">
        <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h3 className="text-gray-900 dark:text-gray-100 font-medium">
          Drag & drop your XML file here
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          or <span className="text-primary font-medium">browse</span> to select a file
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs">
          Supports WordPress XML export files
        </p>
      </div>
    </div>
  );
}
