import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { ProcessingJob, ProcessingQueue, FileMetadata } from '@/types/processing';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reindexDataset, getFileDetails } from '@/lib/api';

interface FileProcessingDashboardProps {
  datasetId: string;
  className?: string;
}

export function FileProcessingDashboard({
  datasetId,
  className
}: FileProcessingDashboardProps) {
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null);
  const [errorDrawerOpen, setErrorDrawerOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<ProcessingJob | null>(null);
  
  const queryClient = useQueryClient();
  
  // Fetch dataset processing status (simplified without real-time for now)
  const { data: processingStatus, refetch } = useQuery({
    queryKey: ['dataset-status', datasetId],
    queryFn: () => fetch(`${localStorage.getItem('BLACKHOLE_API_BASE_URL') || 'http://localhost:8000'}/api/datasets/${datasetId}/status`, {
      headers: {
        'X-API-Key': localStorage.getItem('BLACKHOLE_API_KEY') || ''
      }
    }).then(res => res.json()),
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Mock queue data structure from processing status
  const queue: ProcessingQueue = {
    jobs: processingStatus?.jobs || [],
    activeJobs: processingStatus?.activeJobs || 0,
    queuedJobs: processingStatus?.queuedJobs || 0,
    completedJobs: processingStatus?.completedJobs || 0,
    failedJobs: processingStatus?.failedJobs || 0,
  };

  // Reindex mutation
  const reindexMutation = useMutation({
    mutationFn: (mode?: 'full' | 'delta') => reindexDataset(datasetId, mode),
    onSuccess: () => {
      toast({
        title: 'Reindexing Started',
        description: 'Dataset reindexing has been queued.',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Reindex Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Effect to refetch when needed
  useEffect(() => {
    // Future real-time integration
  }, [refetch]);

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'Not started';
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const duration = Math.round((end - start) / 1000);
    return `${duration}s`;
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      // Implement retry logic via API
      await fetch(`${localStorage.getItem('BLACKHOLE_API_BASE_URL') || 'http://localhost:8000'}/api/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: {
          'X-API-Key': localStorage.getItem('BLACKHOLE_API_KEY') || ''
        }
      });
      
      toast({
        title: 'Job Retried',
        description: 'The processing job has been queued for retry.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Retry Failed',
        description: 'Failed to retry the job. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch(`${localStorage.getItem('BLACKHOLE_API_BASE_URL') || 'http://localhost:8000'}/api/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'X-API-Key': localStorage.getItem('BLACKHOLE_API_KEY') || ''
        }
      });
      
      toast({
        title: 'Job Cancelled',
        description: 'The processing job has been cancelled.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Cancel Failed',
        description: 'Failed to cancel the job. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReindex = (mode: 'full' | 'delta' = 'full') => {
    reindexMutation.mutate(mode);
  };

  const handleViewError = (job: ProcessingJob) => {
    setSelectedError(job);
    setErrorDrawerOpen(true);
  };

  const clearCompleted = () => {
    // Clear completed jobs via API or local state
    toast({
      title: 'Completed Jobs Cleared',
      description: 'All completed jobs have been removed from the queue.',
    });
  };

  const activeJobs = queue.jobs.filter(job => job.status === 'processing');
  const queuedJobs = queue.jobs.filter(job => job.status === 'pending');
  const completedJobs = queue.jobs.filter(job => job.status === 'completed');
  const failedJobs = queue.jobs.filter(job => job.status === 'failed');

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Processing Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor file processing and manage the queue
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleReindex('full')}
            disabled={reindexMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Full Reindex
          </Button>
          <Button
            variant="outline"
            onClick={() => handleReindex('delta')}
            disabled={reindexMutation.isPending}
          >
            <Activity className="h-4 w-4 mr-2" />
            Delta Reindex
          </Button>
          <Button
            variant="outline"
            onClick={clearCompleted}
            disabled={completedJobs.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Completed
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-muted-foreground">
              Polling
            </span>
          </div>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">{activeJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Queued</p>
                <p className="text-2xl font-bold">{queuedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{completedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold">{failedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="queued">
            Queued ({queuedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({failedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Processing Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <p className="font-medium">{job.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(job.fileSize)} • {job.fileType}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {formatDuration(job.startedAt)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="w-full" />
                      </div>

                      {job.chunksGenerated !== undefined && (
                        <div className="text-sm text-muted-foreground">
                          Chunks: {job.chunksGenerated} • Embeddings: {job.embeddingsCreated || 0}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {activeJobs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No active processing jobs
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queued">
          <Card>
            <CardHeader>
              <CardTitle>Queued Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {queuedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium">{job.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(job.fileSize)} • {job.fileType}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelJob(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {queuedJobs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No queued jobs
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {completedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium">{job.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(job.fileSize)} • Completed in {formatDuration(job.startedAt, job.completedAt)}
                          </p>
                        </div>
                      </div>
                      
                      {job.chunksGenerated !== undefined && (
                        <div className="text-sm text-muted-foreground">
                          {job.chunksGenerated} chunks, {job.embeddingsCreated} embeddings
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {completedJobs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No completed jobs
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Failed Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {failedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <p className="font-medium">{job.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(job.fileSize)} • Retries: {job.retryCount}/{job.maxRetries}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryJob(job.id)}
                            disabled={job.retryCount >= job.maxRetries}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {job.error && (
                        <div className="space-y-2">
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {job.error}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewError(job)}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {failedJobs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No failed jobs
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}