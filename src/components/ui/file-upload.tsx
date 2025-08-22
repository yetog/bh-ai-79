import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, FileVideo, Music, X, RotateCcw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpload } from '@/hooks/useUpload';
import { Button } from './button';
import { Progress } from './progress';
import { Badge } from './badge';

interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  className?: string;
  showUploadList?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesSelected, 
  className,
  showUploadList = true 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { 
    files, 
    uploadFiles, 
    removeFile, 
    clearCompleted, 
    retryFile,
    isUploading,
    hasErrors,
    completedCount,
    totalCount 
  } = useUpload({
    onSuccess: (uploadedFiles) => {
      if (onFilesSelected) {
        onFilesSelected(uploadedFiles.map(f => f.file));
      }
    }
  });

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      uploadFiles(droppedFiles);
    }
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      uploadFiles(selectedFiles);
    }
    // Reset input value to allow re-selecting same files
    e.target.value = '';
  }, [uploadFiles]);

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
      </div>
      
      {/* Upload List */}
      {showUploadList && files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              Upload Progress ({completedCount}/{totalCount})
            </h4>
            {completedCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearCompleted}
                className="text-xs"
              >
                Clear Completed
              </Button>
            )}
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.file.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          file.status === 'completed' ? 'default' :
                          file.status === 'error' ? 'destructive' :
                          file.status === 'processing' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {file.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {file.status}
                      </Badge>
                      
                      {file.status === 'error' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryFile(file.id)}
                          className="h-6 w-6 p-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={file.progress} 
                      className="flex-1 h-2"
                    />
                    <span className="text-xs text-muted-foreground min-w-[3rem]">
                      {file.progress}%
                    </span>
                  </div>
                  
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">
                      {file.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;