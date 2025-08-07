import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, FileVideo, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, className }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null || prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setUploadProgress(null), 1000);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="w-6 h-6" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'webm':
        return <FileVideo className="w-6 h-6" />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <Music className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        accept=".txt,.md,.pdf,.docx,.json,.csv,.jpg,.jpeg,.png,.gif,.webp"
      />
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-300",
          "flex flex-col items-center justify-center min-h-[300px] p-8",
          "bg-gradient-void border-border hover:border-primary/50",
          "cosmic-transition group",
          isDragOver && "border-primary bg-primary/10 cosmic-glow"
        )}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            "p-6 rounded-full bg-muted transition-all duration-300",
            "group-hover:bg-primary/20 group-hover:cosmic-glow",
            isDragOver && "cosmic-glow"
          )}>
            <Upload className={cn(
              "w-12 h-12 text-muted-foreground transition-colors duration-300",
              "group-hover:text-primary",
              isDragOver && "text-primary"
            )} />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {isDragOver ? "Drop your files here" : "Upload your knowledge"}
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Drag and drop your chats, notes, documents, or click to browse.
              Supports text files, PDFs, images, and more.
            </p>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <Image className="w-4 h-4" />
              <span>Images</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileVideo className="w-4 h-4" />
              <span>Media</span>
            </div>
          </div>
        </div>
        
        {uploadProgress !== null && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-event-horizon h-2 rounded-full transition-all duration-300 cosmic-glow"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;