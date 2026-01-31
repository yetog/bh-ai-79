import { getApiBaseUrl, getHeaders } from './api';

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  checksum?: string;
  signedUrl?: string;
}

export interface SignedUrlResponse {
  uploadUrl: string;
  key: string;
  fields: Record<string, string>;
}

export interface UploadCompleteRequest {
  key: string;
  filename: string;
  size: number;
  mimetype: string;
  checksum: string;
}

export class UploadService {
  private static instance: UploadService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = getApiBaseUrl();
  }

  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  async validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'text/plain',
      'text/markdown', 
      'application/pdf',
      'application/json',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 100MB limit' };
    }

    if (!allowedTypes.some(type => file.type === type || file.name.endsWith(type.split('/')[1]))) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  }

  async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async requestSignedUrl(filename: string, contentType: string, size: number): Promise<SignedUrlResponse> {
    const response = await fetch(`${this.apiBaseUrl}/uploads/sign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        filename,
        contentType,
        size
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    return response.json();
  }

  async uploadToSignedUrl(
    file: File, 
    signedUrlResponse: SignedUrlResponse,
    onProgress: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      const formData = new FormData();
      
      // Add fields from signed URL response
      Object.entries(signedUrlResponse.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      formData.append('file', file);

      xhr.open('POST', signedUrlResponse.uploadUrl);
      xhr.send(formData);
    });
  }

  async notifyUploadComplete(request: UploadCompleteRequest): Promise<{ jobId: string }> {
    const response = await fetch(`${this.apiBaseUrl}/uploads/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to complete upload: ${response.statusText}`);
    }

    return response.json();
  }

  async uploadFile(
    file: File,
    onProgress: (progress: number) => void,
    onStatusChange: (status: UploadFile['status']) => void
  ): Promise<{ jobId: string; key: string }> {
    // Validate file
    const validation = await this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onStatusChange('uploading');
    onProgress(0);

    // Calculate checksum
    const checksum = await this.calculateChecksum(file);
    
    // Request signed URL
    const signedUrlResponse = await this.requestSignedUrl(
      file.name,
      file.type,
      file.size
    );

    // Upload to signed URL
    await this.uploadToSignedUrl(file, signedUrlResponse, onProgress);
    
    onProgress(100);
    onStatusChange('processing');

    // Notify backend of completed upload
    const result = await this.notifyUploadComplete({
      key: signedUrlResponse.key,
      filename: file.name,
      size: file.size,
      mimetype: file.type,
      checksum
    });

    return {
      jobId: result.jobId,
      key: signedUrlResponse.key
    };
  }
}

export const uploadService = UploadService.getInstance();