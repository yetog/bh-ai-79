import React from 'react';
import { FolderOpen, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { FileExplorerToolbar } from './FileExplorerToolbar';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FileExplorerSidebar } from './FileExplorerSidebar';
import { FileGridView } from './FileGridView';
import { FileListView } from './FileListView';
import { FilePreviewPanel } from './FilePreviewPanel';
import { Card } from '@/components/ui/card';

interface FileExplorerProps {
  onUploadClick?: () => void;
  className?: string;
}

const EmptyState: React.FC<{ 
  isDatasetView: boolean;
  onUpload?: () => void;
}> = ({ isDatasetView, onUpload }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
      {isDatasetView ? (
        <FileX className="w-8 h-8 text-muted-foreground" />
      ) : (
        <FolderOpen className="w-8 h-8 text-muted-foreground" />
      )}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      {isDatasetView ? 'No files yet' : 'Select a dataset'}
    </h3>
    <p className="text-sm text-muted-foreground max-w-sm mb-4">
      {isDatasetView 
        ? 'Upload files to this dataset to start building your knowledge base.'
        : 'Choose a dataset from the sidebar to browse its contents.'
      }
    </p>
  </div>
);

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  onUploadClick,
  className 
}) => {
  const {
    state,
    datasets,
    currentDataset,
    currentFiles,
    breadcrumbs,
    starredFiles,
    recentFiles,
    previewFile,
    navigateToDataset,
    navigateToBreadcrumb,
    setViewMode,
    setSearchQuery,
    setSortBy,
    toggleSelection,
    selectAll,
    toggleStar,
    openFile,
    closePreview,
  } = useFileExplorer();

  const handlePreview = (file: typeof currentFiles[0]) => {
    openFile({ ...file, type: 'file' }); // Force preview mode
  };

  return (
    <Card className={cn(
      'flex flex-col overflow-hidden bg-card/30 border-border/50',
      'min-h-[600px]',
      className
    )}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <FileExplorerSidebar
          datasets={datasets}
          starredFiles={starredFiles}
          recentFiles={recentFiles}
          currentDatasetId={currentDataset?.id || null}
          onSelectDataset={navigateToDataset}
          onSelectFile={(file) => {
            if (file.datasetId !== currentDataset?.id) {
              navigateToDataset(file.datasetId);
            }
            openFile(file);
          }}
          className="hidden lg:flex"
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <FileExplorerToolbar
            viewMode={state.viewMode}
            searchQuery={state.searchQuery}
            selectedCount={state.selectedIds.size}
            onViewModeChange={setViewMode}
            onSearchChange={setSearchQuery}
            onUpload={onUploadClick}
          />

          {/* Breadcrumb */}
          <div className="border-b border-border/50 bg-muted/10">
            <FileBreadcrumb
              items={breadcrumbs}
              onNavigate={navigateToBreadcrumb}
            />
          </div>

          {/* File list */}
          <div className="flex-1 overflow-auto p-4">
            {currentFiles.length === 0 ? (
              <EmptyState 
                isDatasetView={!!currentDataset} 
                onUpload={onUploadClick}
              />
            ) : state.viewMode === 'grid' ? (
              <FileGridView
                files={currentFiles}
                selectedIds={state.selectedIds}
                onSelect={toggleSelection}
                onOpen={openFile}
                onStar={toggleStar}
                onPreview={handlePreview}
              />
            ) : (
              <FileListView
                files={currentFiles}
                selectedIds={state.selectedIds}
                sortBy={state.sortBy}
                sortOrder={state.sortOrder}
                onSelect={toggleSelection}
                onSelectAll={selectAll}
                onOpen={openFile}
                onStar={toggleStar}
                onPreview={handlePreview}
                onSort={setSortBy}
              />
            )}
          </div>
        </div>

        {/* Preview panel */}
        {previewFile && (
          <FilePreviewPanel
            file={previewFile}
            onClose={closePreview}
            onStar={() => toggleStar(previewFile.id)}
          />
        )}
      </div>
    </Card>
  );
};

export default FileExplorer;
