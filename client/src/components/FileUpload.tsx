import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { FileInfo } from "@shared/schema";
import { Upload, FileType, FileWarning, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelected: (fileInfo: FileInfo | null) => void;
}

export function FileUpload({ onFileSelected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      toast({
        title: "Invalid file format",
        description: "Please upload a WordPress XML export file (.xml or .xml.gz)",
        variant: "destructive"
      });
      return;
    }

    // Show a success toast
    toast({
      title: "File added successfully",
      description: `"${file.name}" has been added for conversion.`,
      variant: "default"
    });

    const fileInfo: FileInfo = {
      name: file.name,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      type: file.type,
      file: file // Store the actual File object for upload
    };

    onFileSelected(fileInfo);
  };

  return (
    <div 
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 mb-6",
        isDragging && "border-primary bg-primary/10 scale-[1.02] shadow-lg",
        isHovering && "border-primary/70 bg-primary/5",
        !isDragging && !isHovering && "border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
      )}
      onClick={triggerFileInput}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept=".xml,.xml.gz" 
        onChange={handleFileSelect}
      />
      <div className="space-y-5">
        <div 
          className={cn(
            "mx-auto size-16 flex items-center justify-center rounded-full transition-all", 
            isDragging ? "bg-primary/20 text-primary" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
          )}
        >
          <Upload className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h3 className={cn(
            "text-lg font-medium transition-colors",
            isDragging ? "text-primary" : "text-gray-900 dark:text-gray-100"
          )}>
            {isDragging ? "Drop your file here" : "Drag & drop your XML file here"}
          </h3>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            or <span className={cn(
              "font-medium transition-colors",
              isDragging || isHovering ? "text-primary underline" : "text-primary"
            )}>browse</span> to select a file
          </p>
        </div>
        
        <div className="flex justify-center space-x-3 pt-2">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <FileType className="h-3.5 w-3.5 mr-1" />
            <span>.xml files</span>
          </div>
          
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <FileWarning className="h-3.5 w-3.5 mr-1" />
            <span>Max size 100MB</span>
          </div>
          
          <div className="flex items-center text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            <span>Supports WordPress exports</span>
          </div>
        </div>
      </div>
    </div>
  );
}
