import React from 'react';
import { 
  Database, 
  Star, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  HardDrive,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Dataset, FileNode } from '@/types/fileExplorer';

interface FileExplorerSidebarProps {
  datasets: Dataset[];
  starredFiles: FileNode[];
  recentFiles: FileNode[];
  currentDatasetId: string | null;
  onSelectDataset: (datasetId: string) => void;
  onSelectFile: (file: FileNode) => void;
  className?: string;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const SidebarSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors">
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        <span>{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 space-y-0.5 mt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const FileExplorerSidebar: React.FC<FileExplorerSidebarProps> = ({
  datasets,
  starredFiles,
  recentFiles,
  currentDatasetId,
  onSelectDataset,
  onSelectFile,
  className,
}) => {
  const totalStorage = 1024 * 1024 * 1024; // 1 GB mock limit
  const usedStorage = datasets.reduce((acc, ds) => acc + ds.totalSize, 0);
  const storagePercent = (usedStorage / totalStorage) * 100;

  return (
    <div className={cn(
      'w-64 border-r border-border/50 bg-muted/10 flex flex-col',
      className
    )}>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Datasets */}
          <SidebarSection 
            title="Datasets" 
            icon={<Database className="w-4 h-4" />}
          >
            {datasets.map((dataset) => (
              <button
                key={dataset.id}
                onClick={() => onSelectDataset(dataset.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-all duration-200',
                  'hover:bg-muted/50',
                  currentDatasetId === dataset.id 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 text-left">{dataset.name}</span>
                <span className="text-xs opacity-60">{dataset.fileCount}</span>
              </button>
            ))}
          </SidebarSection>

          {/* Starred */}
          {starredFiles.length > 0 && (
            <SidebarSection 
              title="Starred" 
              icon={<Star className="w-4 h-4 text-yellow-400" />}
            >
              {starredFiles.slice(0, 5).map((file) => (
                <button
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
                  <span className="truncate text-left">{file.name}</span>
                </button>
              ))}
            </SidebarSection>
          )}

          {/* Recent */}
          <SidebarSection 
            title="Recent" 
            icon={<Clock className="w-4 h-4" />}
            defaultOpen={false}
          >
            {recentFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => onSelectFile(file)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                <Clock className="w-3 h-3 shrink-0 opacity-50" />
                <span className="truncate text-left">{file.name}</span>
              </button>
            ))}
          </SidebarSection>
        </div>
      </ScrollArea>

      {/* Storage indicator */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Storage</span>
        </div>
        <Progress value={storagePercent} className="h-1.5 mb-1" />
        <div className="text-xs text-muted-foreground">
          {formatSize(usedStorage)} of {formatSize(totalStorage)} used
        </div>
      </div>
    </div>
  );
};

export default FileExplorerSidebar;
