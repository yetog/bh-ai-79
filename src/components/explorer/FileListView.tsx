import React from 'react';
import { FileListRow } from './FileListRow';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { FileNode, SortBy, SortOrder } from '@/types/fileExplorer';

interface FileListViewProps {
  files: FileNode[];
  selectedIds: Set<string>;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSelect: (fileId: string, multiSelect: boolean) => void;
  onSelectAll: () => void;
  onOpen: (file: FileNode) => void;
  onStar: (fileId: string) => void;
  onPreview: (file: FileNode) => void;
  onSort: (sortBy: SortBy) => void;
}

const SortHeader: React.FC<{
  label: string;
  sortKey: SortBy;
  currentSort: SortBy;
  sortOrder: SortOrder;
  onSort: (key: SortBy) => void;
  className?: string;
}> = ({ label, sortKey, currentSort, sortOrder, onSort, className }) => {
  const isActive = currentSort === sortKey;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-8 px-2 -ml-2 text-xs font-medium text-muted-foreground hover:text-foreground', className)}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive ? (
        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
      ) : (
        <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
      )}
    </Button>
  );
};

export const FileListView: React.FC<FileListViewProps> = ({
  files,
  selectedIds,
  sortBy,
  sortOrder,
  onSelect,
  onSelectAll,
  onOpen,
  onStar,
  onPreview,
  onSort,
}) => {
  const allSelected = files.length > 0 && selectedIds.size === files.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < files.length;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-card/30">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b border-border/50">
        <Checkbox 
          checked={allSelected}
          // @ts-ignore - indeterminate is valid but not typed
          indeterminate={someSelected}
          onClick={onSelectAll}
          className="shrink-0"
        />
        
        <div className="flex-1">
          <SortHeader 
            label="Name" 
            sortKey="name" 
            currentSort={sortBy} 
            sortOrder={sortOrder} 
            onSort={onSort} 
          />
        </div>
        
        <div className="w-20 shrink-0 hidden sm:block">
          <SortHeader 
            label="Type" 
            sortKey="type" 
            currentSort={sortBy} 
            sortOrder={sortOrder} 
            onSort={onSort} 
          />
        </div>
        
        <div className="w-20 shrink-0 hidden md:block">
          <SortHeader 
            label="Size" 
            sortKey="size" 
            currentSort={sortBy} 
            sortOrder={sortOrder} 
            onSort={onSort} 
          />
        </div>
        
        <div className="w-24 shrink-0 hidden lg:block">
          <SortHeader 
            label="Modified" 
            sortKey="date" 
            currentSort={sortBy} 
            sortOrder={sortOrder} 
            onSort={onSort} 
          />
        </div>
        
        <div className="w-28 shrink-0">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
        </div>
        
        <div className="w-28 shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
          >
            <FileListRow
              file={file}
              isSelected={selectedIds.has(file.id)}
              onSelect={(multi) => onSelect(file.id, multi)}
              onOpen={() => onOpen(file)}
              onStar={() => onStar(file.id)}
              onPreview={() => onPreview(file)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileListView;
