import React from 'react';
import { 
  X, 
  Download, 
  Star, 
  RefreshCw, 
  ExternalLink,
  FileText,
  Calendar,
  HardDrive,
  Layers,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileIcon } from './FileIcon';
import { getFileTypeConfig, type FileNode } from '@/types/fileExplorer';

interface FilePreviewPanelProps {
  file: FileNode;
  onClose: () => void;
  onStar: () => void;
  onReprocess?: () => void;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StatusIcon: React.FC<{ status: FileNode['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-muted-foreground" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-destructive" />;
  }
};

const MetadataRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    <div className="text-muted-foreground shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm text-foreground break-words">{value}</div>
    </div>
  </div>
);

export const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({
  file,
  onClose,
  onStar,
  onReprocess,
}) => {
  const typeConfig = getFileTypeConfig(file.mimeType);

  // Mock extracted text preview
  const mockExtractedText = `This is a preview of the extracted text content from "${file.name}".

The document contains information about various topics including technical specifications, research findings, and analysis results.

Key points extracted:
• Primary findings and conclusions
• Supporting data and methodology
• Recommendations and next steps

This preview shows the first portion of the indexed content. The full document has been processed and split into ${file.chunkCount || 0} searchable chunks for semantic retrieval.`;

  return (
    <div className="w-96 border-l border-border/50 bg-card/50 flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground truncate flex-1 mr-2">
          File Preview
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onStar}
          >
            <Star className={cn(
              'w-4 h-4',
              file.starred && 'fill-yellow-400 text-yellow-400'
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* File info header */}
          <div className="flex items-start gap-4">
            <FileIcon file={file} size="xl" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground break-words mb-1">
                {file.name}
              </h4>
              <Badge variant="outline" className="text-xs">
                {typeConfig.label}
              </Badge>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <StatusIcon status={file.status} />
            <span className="text-sm font-medium capitalize">{file.status}</span>
            {file.status === 'completed' && file.chunkCount && (
              <span className="text-xs text-muted-foreground ml-auto">
                {file.chunkCount} chunks indexed
              </span>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Content</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-1">
              <MetadataRow
                icon={<HardDrive className="w-4 h-4" />}
                label="Size"
                value={formatFileSize(file.size)}
              />
              <Separator className="my-1" />
              <MetadataRow
                icon={<FileText className="w-4 h-4" />}
                label="Type"
                value={file.mimeType || 'Unknown'}
              />
              <Separator className="my-1" />
              <MetadataRow
                icon={<Calendar className="w-4 h-4" />}
                label="Created"
                value={formatDate(file.createdAt)}
              />
              <Separator className="my-1" />
              <MetadataRow
                icon={<Clock className="w-4 h-4" />}
                label="Modified"
                value={formatDate(file.modifiedAt)}
              />
              {file.chunkCount && (
                <>
                  <Separator className="my-1" />
                  <MetadataRow
                    icon={<Layers className="w-4 h-4" />}
                    label="Chunks"
                    value={`${file.chunkCount} text chunks indexed`}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {file.status === 'completed' ? (
                <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                  {mockExtractedText}
                </div>
              ) : file.status === 'processing' ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Processing document...
                  </p>
                </div>
              ) : file.status === 'error' ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Failed to process document
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Waiting to be processed
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Actions footer */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" className="flex-1" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
        {file.status === 'error' && onReprocess && (
          <Button 
            variant="secondary" 
            className="w-full" 
            size="sm"
            onClick={onReprocess}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reprocess
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilePreviewPanel;
