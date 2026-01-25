import React from 'react';
import { MoreHorizontal, Star, Eye, Download, Loader2, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileIcon } from './FileIcon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { FileNode } from '@/types/fileExplorer';

interface FileGridItemProps {
  file: FileNode;
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  onOpen: () => void;
  onStar: () => void;
  onPreview: () => void;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StatusIndicator: React.FC<{ status: FileNode['status'] }> = ({ status }) => {
  switch (status) {
    case 'processing':
      return (
        <div className="flex items-center gap-1 text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-xs">Processing</span>
        </div>
      );
    case 'pending':
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="text-xs">Pending</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1 text-destructive">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs">Error</span>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-1 text-green-400">
          <CheckCircle className="w-3 h-3" />
          <span className="text-xs">Indexed</span>
        </div>
      );
    default:
      return null;
  }
};

export const FileGridItem: React.FC<FileGridItemProps> = ({
  file,
  isSelected,
  onSelect,
  onOpen,
  onStar,
  onPreview,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (e.detail === 2) {
      onOpen();
    } else {
      onSelect(e.shiftKey || e.ctrlKey || e.metaKey);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer',
        'hover:shadow-lg hover:border-primary/30 hover:-translate-y-1',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        isSelected 
          ? 'bg-primary/10 border-primary/50 shadow-md' 
          : 'bg-card/50 border-border hover:bg-card/80',
        file.status === 'processing' && 'animate-pulse-subtle',
        file.status === 'error' && 'border-destructive/30'
      )}
    >
      {/* Selection checkbox */}
      <div className={cn(
        'absolute top-3 left-3 transition-opacity duration-200',
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <Checkbox 
          checked={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(true);
          }}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>

      {/* Star button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStar();
        }}
        className={cn(
          'absolute top-3 right-3 p-1.5 rounded-full transition-all duration-200',
          file.starred 
            ? 'text-yellow-400 bg-yellow-400/20' 
            : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted'
        )}
      >
        <Star className={cn('w-4 h-4', file.starred && 'fill-current')} />
      </button>

      {/* File icon */}
      <div className="flex justify-center mb-4 mt-2">
        <FileIcon file={file} size="xl" />
      </div>

      {/* File name */}
      <div className="text-center space-y-2">
        <h4 className="font-medium text-foreground truncate text-sm leading-tight" title={file.name}>
          {file.name}
        </h4>
        
        {/* File meta */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {file.type === 'file' && (
            <>
              <span>{formatFileSize(file.size)}</span>
              {file.chunkCount && (
                <>
                  <span>•</span>
                  <span>{file.chunkCount} chunks</span>
                </>
              )}
            </>
          )}
          {file.type === 'folder' && (
            <span>Folder</span>
          )}
        </div>

        {/* Status */}
        <div className="flex justify-center">
          <StatusIndicator status={file.status} />
        </div>
      </div>

      {/* Quick actions on hover */}
      <div className={cn(
        'absolute bottom-3 left-0 right-0 flex justify-center gap-2 transition-all duration-300',
        'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
      )}>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-xs bg-background/90 backdrop-blur-sm shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <Eye className="w-3 h-3 mr-1" />
          Preview
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 p-0 bg-background/90 backdrop-blur-sm shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onStar}>
              <Star className="w-4 h-4 mr-2" />
              {file.starred ? 'Remove star' : 'Add star'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default FileGridItem;
