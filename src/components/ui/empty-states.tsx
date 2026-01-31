import React from 'react';
import { FileText, Search, Brain, Upload, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <Card className={`text-center py-12 ${className}`}>
    <CardContent className="space-y-4">
      <div className="flex justify-center text-muted-foreground mb-4">
        {icon || <FileText className="w-16 h-16" />}
      </div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.icon}
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
);

export const NoFilesUploaded = ({ onUpload }: { onUpload: () => void }) => (
  <EmptyState
    icon={<Upload className="w-16 h-16" />}
    title="No files uploaded yet"
    description="Start by uploading your first document, chat, or note to begin building your knowledge base."
    action={{
      label: "Upload Files",
      onClick: onUpload,
      icon: <Plus className="w-4 h-4 mr-2" />
    }}
  />
);

export const NoSearchResults = ({ query, onRetry }: { query?: string; onRetry?: () => void }) => (
  <EmptyState
    icon={<Search className="w-16 h-16" />}
    title="No results found"
    description={
      query 
        ? `We couldn't find anything matching "${query}". Try different keywords or upload more content.`
        : "Try different search terms or upload more content to expand your knowledge base."
    }
    action={onRetry ? {
      label: "Try Again",
      onClick: onRetry,
      icon: <RefreshCw className="w-4 h-4 mr-2" />
    } : undefined}
  />
);

export const NoInsights = ({ onRefresh }: { onRefresh: () => void }) => (
  <EmptyState
    icon={<Brain className="w-16 h-16" />}
    title="No insights available"
    description="Upload more content and let our AI analyze patterns and connections in your knowledge."
    action={{
      label: "Refresh Insights",
      onClick: onRefresh,
      icon: <RefreshCw className="w-4 h-4 mr-2" />
    }}
  />
);

export const ProcessingFiles = ({ count }: { count: number }) => (
  <Card className="text-center py-8 bg-primary/5">
    <CardContent className="space-y-4">
      <div className="flex justify-center">
        <div className="w-12 h-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
      <h3 className="text-lg font-medium text-foreground">Processing Files</h3>
      <p className="text-muted-foreground">
        {count === 1 ? 'Processing 1 file...' : `Processing ${count} files...`}
      </p>
      <p className="text-sm text-muted-foreground">
        This may take a few moments depending on file size and content.
      </p>
    </CardContent>
  </Card>
);