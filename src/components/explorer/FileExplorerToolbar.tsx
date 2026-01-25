import React from 'react';
import { 
  LayoutGrid, 
  List, 
  Search, 
  Upload, 
  FolderPlus, 
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ViewMode, SortBy } from '@/types/fileExplorer';

interface FileExplorerToolbarProps {
  viewMode: ViewMode;
  searchQuery: string;
  selectedCount: number;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchChange: (query: string) => void;
  onRefresh?: () => void;
  onUpload?: () => void;
  onNewFolder?: () => void;
}

export const FileExplorerToolbar: React.FC<FileExplorerToolbarProps> = ({
  viewMode,
  searchQuery,
  selectedCount,
  onViewModeChange,
  onSearchChange,
  onRefresh,
  onUpload,
  onNewFolder,
}) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/20 border-b border-border/50 rounded-t-lg">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-9 bg-background/50 border-border/50"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* View mode toggle */}
      <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 rounded-md transition-all duration-200',
            viewMode === 'grid' && 'bg-background shadow-sm'
          )}
          onClick={() => onViewModeChange('grid')}
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 rounded-md transition-all duration-200',
            viewMode === 'list' && 'bg-background shadow-sm'
          )}
          onClick={() => onViewModeChange('list')}
        >
          <List className="w-4 h-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}

        {onNewFolder && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 hidden sm:flex"
            onClick={onNewFolder}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        )}

        {onUpload && (
          <Button
            size="sm"
            className="h-9 px-4 bg-primary hover:bg-primary/90"
            onClick={onUpload}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        )}
      </div>

      {/* Selection info */}
      {selectedCount > 0 && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="text-sm text-muted-foreground">
            {selectedCount} selected
          </div>
        </>
      )}
    </div>
  );
};

export default FileExplorerToolbar;
