export interface ProcessingJob {
  id: string;
  datasetId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  chunksGenerated?: number;
  embeddingsCreated?: number;
  retryCount: number;
  maxRetries: number;
}

export interface ProcessingQueue {
  jobs: ProcessingJob[];
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface FileMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  lastModified: string;
  extractedText?: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  encoding?: string;
  metadata?: Record<string, any>;
}

export interface DatasetHealthMetrics {
  datasetId: string;
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  indexingStatus: 'healthy' | 'partial' | 'unhealthy';
  lastProcessed: string;
  processingErrors: number;
  averageChunkSize: number;
  storageUsed: number;
  searchAccuracy?: number;
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  version: number;
  manifest: any;
  createdAt: string;
  createdBy: string;
  description?: string;
  isActive: boolean;
  documentCount: number;
}