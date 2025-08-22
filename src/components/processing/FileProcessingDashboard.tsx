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
  TrendingUp
} from 'lucide-react';
import { ProcessingJob, ProcessingQueue, FileMetadata } from '@/types/processing';
import { toast } from '@/hooks/use-toast';

interface FileProcessingDashboardProps {
  queue?: ProcessingQueue;
  onRetryJob?: (jobId: string) => void;
  onCancelJob?: (jobId: string) => void;
  onClearCompleted?: () => void;
  onPauseQueue?: () => void;
  onResumeQueue?: () => void;
  className?: string;
}

export function FileProcessingDashboard({
  queue = {
    jobs: [],
    activeJobs: 0,
    queuedJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
  },
  onRetryJob,
  onCancelJob,
  onClearCompleted,
  onPauseQueue,
  onResumeQueue,
  className
}: FileProcessingDashboardProps) {
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null);

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

  const handleRetryJob = (jobId: string) => {
    onRetryJob?.(jobId);
    toast({
      title: 'Job Retried',
      description: 'The processing job has been queued for retry.',
    });
  };

  const handleCancelJob = (jobId: string) => {
    onCancelJob?.(jobId);
    toast({
      title: 'Job Cancelled',
      description: 'The processing job has been cancelled.',
    });
  };

  const toggleQueuePause = () => {
    if (isQueuePaused) {
      onResumeQueue?.();
      setIsQueuePaused(false);
      toast({
        title: 'Queue Resumed',
        description: 'Processing queue has been resumed.',
      });
    } else {
      onPauseQueue?.();
      setIsQueuePaused(true);
      toast({
        title: 'Queue Paused',
        description: 'Processing queue has been paused.',
      });
    }
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
            onClick={toggleQueuePause}
            disabled={queue.jobs.length === 0}
          >
            {isQueuePaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume Queue
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Queue
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClearCompleted}
            disabled={completedJobs.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Completed
          </Button>
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
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {job.error}
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