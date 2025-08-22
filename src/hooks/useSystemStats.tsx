import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl, getHeaders } from '@/lib/api';

export interface SystemStats {
  totalFiles: number;
  totalChunks: number;
  totalQueries: number;
  processingStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  trends: {
    filesChange: number;
    queriesChange: number;
    chunksChange: number;
  };
}

export interface ProcessingMetrics {
  avgProcessingTime: number;
  successRate: number;
  errorRate: number;
  recentActivity: Array<{
    timestamp: string;
    type: 'upload' | 'query' | 'error';
    count: number;
  }>;
}

async function fetchSystemStats(): Promise<SystemStats> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/stats`, {
      headers: { ...getHeaders() },
    });

    if (!res.ok) {
      // Return default zeros if backend not available
      return {
        totalFiles: 0,
        totalChunks: 0,
        totalQueries: 0,
        processingStatus: { pending: 0, processing: 0, completed: 0, failed: 0 },
        trends: { filesChange: 0, queriesChange: 0, chunksChange: 0 },
      };
    }

    return res.json();
  } catch (error) {
    // Graceful fallback when backend unavailable
    return {
      totalFiles: 0,
      totalChunks: 0,
      totalQueries: 0,
      processingStatus: { pending: 0, processing: 0, completed: 0, failed: 0 },
      trends: { filesChange: 0, queriesChange: 0, chunksChange: 0 },
    };
  }
}

async function fetchProcessingMetrics(): Promise<ProcessingMetrics> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/metrics/processing`, {
      headers: { ...getHeaders() },
    });

    if (!res.ok) {
      return {
        avgProcessingTime: 0,
        successRate: 0,
        errorRate: 0,
        recentActivity: [],
      };
    }

    return res.json();
  } catch (error) {
    return {
      avgProcessingTime: 0,
      successRate: 0,
      errorRate: 0,
      recentActivity: [],
    };
  }
}

export function useSystemStats() {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: fetchSystemStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 25000,
    retry: false, // Don't retry if backend unavailable
  });
}

export function useProcessingMetrics() {
  return useQuery({
    queryKey: ['processing-metrics'],
    queryFn: fetchProcessingMetrics,
    refetchInterval: 30000,
    staleTime: 25000,
    retry: false,
  });
}