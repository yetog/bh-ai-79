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
import type { FileNode } from '@/types/fileExplorer';
import { getFileTypeConfig } from '@/types/fileExplorer';

interface FileListRowProps {
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

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const StatusBadge: React.FC<{ status: FileNode['status'] }> = ({ status }) => {
  const config = {
    processing: { icon: Loader2, label: 'Processing', className: 'text-blue-400 bg-blue-400/10 border-blue-400/20', spin: true },
    pending: { icon: Clock, label: 'Pending', className: 'text-muted-foreground bg-muted/50 border-muted', spin: false },
    error: { icon: AlertCircle, label: 'Error', className: 'text-destructive bg-destructive/10 border-destructive/20', spin: false },
    completed: { icon: CheckCircle, label: 'Indexed', className: 'text-green-400 bg-green-400/10 border-green-400/20', spin: false },
  }[status];

  const Icon = config.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border',
      config.className
    )}>
      <Icon className={cn('w-3 h-3', config.spin && 'animate-spin')} />
      {config.label}
    </div>
  );
};

export const FileListRow: React.FC<FileListRowProps> = ({
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onOpen();
    }
  };

  const typeConfig = getFileTypeConfig(file.mimeType);

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex items-center gap-4 px-4 py-3 border-b border-border/50 transition-all duration-200 cursor-pointer',
        'hover:bg-muted/30',
        'focus:outline-none focus:bg-muted/40',
        isSelected && 'bg-primary/5 hover:bg-primary/10'
      )}
    >
      {/* Checkbox */}
      <Checkbox 
        checked={isSelected}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e.shiftKey || e.ctrlKey || e.metaKey);
        }}
        className="shrink-0"
      />

      {/* File icon & name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileIcon file={file} size="sm" />
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-foreground truncate text-sm" title={file.name}>
            {file.name}
          </span>
          {file.chunkCount && (
            <span className="text-xs text-muted-foreground">
              {file.chunkCount} chunks indexed
            </span>
          )}
        </div>
        {file.starred && (
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
        )}
      </div>

      {/* Type */}
      <div className="w-20 shrink-0 hidden sm:block">
        <span className="text-xs text-muted-foreground">
          {file.type === 'folder' ? 'Folder' : typeConfig.label}
        </span>
      </div>

      {/* Size */}
      <div className="w-20 shrink-0 hidden md:block">
        <span className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </span>
      </div>

      {/* Modified */}
      <div className="w-24 shrink-0 hidden lg:block">
        <span className="text-xs text-muted-foreground">
          {formatDate(file.modifiedAt)}
        </span>
      </div>

      {/* Status */}
      <div className="w-28 shrink-0">
        <StatusBadge status={file.status} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
        >
          <Star className={cn('w-4 h-4', file.starred && 'fill-yellow-400 text-yellow-400')} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
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

export default FileListRow;
