import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Database, 
  Zap,
  HardDrive,
  TrendingUp,
  Clock
} from 'lucide-react';
import { type DatasetHealthMetrics } from '@/types/processing';

interface DatasetHealthMetricsProps {
  metrics: DatasetHealthMetrics;
  className?: string;
}

export function DatasetHealthMetrics({ metrics, className }: DatasetHealthMetricsProps) {
  const getHealthIcon = (status: DatasetHealthMetrics['indexingStatus']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthColor = (status: DatasetHealthMetrics['indexingStatus']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500 bg-green-50 border-green-200';
      case 'partial':
        return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-500 bg-red-50 border-red-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getIndexingHealth = () => {
    const totalDocuments = metrics.totalDocuments;
    const processedDocuments = totalDocuments - metrics.processingErrors;
    return totalDocuments > 0 ? (processedDocuments / totalDocuments) * 100 : 0;
  };

  const getSearchAccuracyColor = (accuracy?: number) => {
    if (!accuracy) return 'text-gray-500';
    if (accuracy >= 85) return 'text-green-500';
    if (accuracy >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dataset Health Overview</CardTitle>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getHealthColor(metrics.indexingStatus)}`}>
              {getHealthIcon(metrics.indexingStatus)}
              <span className="text-sm font-medium capitalize">
                {metrics.indexingStatus}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Documents</span>
              </div>
              <p className="text-2xl font-bold">{metrics.totalDocuments.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.processingErrors > 0 && (
                  <span className="text-red-500">
                    {metrics.processingErrors} errors
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Chunks</span>
              </div>
              <p className="text-2xl font-bold">{metrics.totalChunks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Avg {metrics.averageChunkSize} chars
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Embeddings</span>
              </div>
              <p className="text-2xl font-bold">{metrics.totalEmbeddings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Vector indexed</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Storage</span>
              </div>
              <p className="text-2xl font-bold">{formatBytes(metrics.storageUsed)}</p>
              <p className="text-xs text-muted-foreground">Total used</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Indexing Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Processing Success Rate</span>
                <span>{getIndexingHealth().toFixed(1)}%</span>
              </div>
              <Progress value={getIndexingHealth()} className="w-full" />
            </div>

            {metrics.searchAccuracy !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Search Accuracy</span>
                  <span className={getSearchAccuracyColor(metrics.searchAccuracy)}>
                    {metrics.searchAccuracy.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.searchAccuracy} className="w-full" />
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chunk/Document Ratio</span>
                <span>
                  {metrics.totalDocuments > 0 
                    ? (metrics.totalChunks / metrics.totalDocuments).toFixed(1)
                    : '0'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Processing Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Last Processed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(metrics.lastProcessed)}
              </p>
            </div>

            {metrics.processingErrors > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">
                    Processing Issues
                  </span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  {metrics.processingErrors} document(s) failed to process
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vector Completeness</span>
                <span>
                  {metrics.totalChunks > 0 
                    ? ((metrics.totalEmbeddings / metrics.totalChunks) * 100).toFixed(1)
                    : '0'
                  }%
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Chunk Size</span>
                <span>{metrics.averageChunkSize} chars</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {(metrics.indexingStatus !== 'healthy' || (metrics.searchAccuracy && metrics.searchAccuracy < 80)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.processingErrors > 0 && (
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p className="text-sm">
                    Resolve processing errors by checking failed documents and retrying ingestion.
                  </p>
                </div>
              )}
              
              {metrics.searchAccuracy && metrics.searchAccuracy < 80 && (
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <p className="text-sm">
                    Consider adjusting chunk size or overlap settings to improve search accuracy.
                  </p>
                </div>
              )}
              
              {metrics.totalEmbeddings < metrics.totalChunks && (
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-sm">
                    Some chunks are missing embeddings. Rerun the indexing process to ensure complete coverage.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}