import React from 'react';
import { 
  File, 
  FileText, 
  Folder, 
  FolderOpen, 
  Image, 
  Music, 
  Video, 
  Braces, 
  Table, 
  FileCode,
  Database 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileTypeConfig, type FileNode } from '@/types/fileExplorer';

interface FileIconProps {
  file: FileNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOpen?: boolean;
  className?: string;
}

const iconComponents: Record<string, React.ElementType> = {
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Music,
  Video,
  Braces,
  Table,
  FileCode,
  Database,
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const containerSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const FileIcon: React.FC<FileIconProps> = ({ 
  file, 
  size = 'md', 
  isOpen = false,
  className 
}) => {
  if (file.type === 'folder') {
    const FolderIcon = isOpen ? FolderOpen : Folder;
    return (
      <div className={cn(
        containerSizes[size],
        'flex items-center justify-center rounded-lg bg-amber-500/20',
        className
      )}>
        <FolderIcon className={cn(sizeClasses[size], 'text-amber-400')} />
      </div>
    );
  }

  if (file.type === 'dataset') {
    return (
      <div className={cn(
        containerSizes[size],
        'flex items-center justify-center rounded-lg bg-primary/20',
        className
      )}>
        <Database className={cn(sizeClasses[size], 'text-primary')} />
      </div>
    );
  }

  const config = getFileTypeConfig(file.mimeType);
  const IconComponent = iconComponents[config.icon] || File;

  return (
    <div className={cn(
      containerSizes[size],
      'flex items-center justify-center rounded-lg',
      file.status === 'processing' && 'animate-pulse',
      file.status === 'error' && 'bg-destructive/20',
      file.status === 'pending' && 'bg-muted/50',
      file.status === 'completed' && 'bg-muted/30',
      className
    )}>
      <IconComponent className={cn(
        sizeClasses[size],
        config.color,
        file.status === 'error' && 'text-destructive',
        file.status === 'pending' && 'text-muted-foreground opacity-60'
      )} />
    </div>
  );
};

export default FileIcon;
