import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadService, UploadFile } from '@/lib/upload';
import { useToast } from '@/hooks/use-toast';

export interface UseUploadOptions {
  onSuccess?: (files: UploadFile[]) => void;
  onError?: (error: Error) => void;
  maxConcurrent?: number;
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onSuccess, onError, maxConcurrent = 3 } = options;
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, ...updates } : file
    ));
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (file: UploadFile) => {
      try {
        const result = await uploadService.uploadFile(
          file.file,
          (progress) => updateFile(file.id, { progress }),
          (status) => updateFile(file.id, { status })
        );
        
        return { ...result, fileId: file.id };
      } catch (error) {
        updateFile(file.id, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      updateFile(data.fileId, { 
        status: 'completed',
        progress: 100 
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      
      toast({
        title: "Upload completed",
        description: "File has been successfully uploaded and is being processed.",
      });
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'An error occurred during upload.',
        variant: "destructive",
      });
      
      if (onError) {
        onError(error instanceof Error ? error : new Error('Upload failed'));
      }
    }
  });

  const addFiles = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
    return uploadFiles;
  }, []);

  const uploadFiles = useCallback(async (filesToUpload: File[]) => {
    const uploadFiles = addFiles(filesToUpload);
    
    // Process files with concurrency limit
    const processQueue = async () => {
      const activeUploads = new Set<Promise<void>>();
      
      for (const file of uploadFiles) {
        // Wait if we've reached the concurrent limit
        if (activeUploads.size >= maxConcurrent) {
          await Promise.race(activeUploads);
        }
        
      const uploadPromise = uploadMutation.mutateAsync(file)
        .then(() => {
          activeUploads.delete(uploadPromise);
        })
        .catch(() => {
          activeUploads.delete(uploadPromise);
        });
        
        activeUploads.add(uploadPromise);
      }
      
      // Wait for all uploads to complete
      await Promise.allSettled(activeUploads);
      
      if (onSuccess) {
        onSuccess(uploadFiles);
      }
    };

    processQueue().catch(console.error);
    
    return uploadFiles;
  }, [addFiles, uploadMutation, maxConcurrent, onSuccess]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(file => 
      file.status !== 'completed' && file.status !== 'error'
    ));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  const retryFile = useCallback((id: string) => {
    const file = files.find(f => f.id === id);
    if (file && file.status === 'error') {
      updateFile(id, { 
        status: 'pending', 
        progress: 0, 
        error: undefined 
      });
      uploadMutation.mutate(file);
    }
  }, [files, updateFile, uploadMutation]);

  return {
    files,
    uploadFiles,
    removeFile,
    clearCompleted,
    clearAll,
    retryFile,
    isUploading: uploadMutation.isPending || files.some(f => f.status === 'uploading'),
    hasErrors: files.some(f => f.status === 'error'),
    completedCount: files.filter(f => f.status === 'completed').length,
    totalCount: files.length
  };
}