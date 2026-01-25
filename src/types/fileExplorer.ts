// File Explorer Types for Black Hole AI

export type FileType = 'file' | 'folder' | 'dataset';
export type FileStatus = 'pending' | 'processing' | 'completed' | 'error';
export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  mimeType?: string;
  size?: number;
  status: FileStatus;
  parentId: string | null;
  datasetId: string;
  createdAt: string;
  modifiedAt: string;
  starred: boolean;
  chunkCount?: number;
  previewUrl?: string;
  extractedText?: string;
  metadata?: Record<string, unknown>;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  modifiedAt: string;
  color?: string;
}

export interface FileExplorerState {
  currentPath: string[];
  selectedIds: Set<string>;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery: string;
  clipboard: {
    operation: 'cut' | 'copy' | null;
    fileIds: string[];
  };
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: FileType;
}

// File type to icon/color mapping
export const FILE_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  'application/pdf': { icon: 'FileText', color: 'text-red-400', label: 'PDF' },
  'application/json': { icon: 'Braces', color: 'text-cyan-400', label: 'JSON' },
  'text/plain': { icon: 'FileText', color: 'text-blue-400', label: 'Text' },
  'text/markdown': { icon: 'FileCode', color: 'text-purple-400', label: 'Markdown' },
  'text/csv': { icon: 'Table', color: 'text-green-400', label: 'CSV' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    icon: 'FileText', color: 'text-blue-500', label: 'Word' 
  },
  'image/png': { icon: 'Image', color: 'text-pink-400', label: 'PNG' },
  'image/jpeg': { icon: 'Image', color: 'text-pink-400', label: 'JPEG' },
  'audio/mpeg': { icon: 'Music', color: 'text-orange-400', label: 'Audio' },
  'video/mp4': { icon: 'Video', color: 'text-orange-500', label: 'Video' },
  'default': { icon: 'File', color: 'text-muted-foreground', label: 'File' },
};

export const getFileTypeConfig = (mimeType?: string) => {
  return FILE_TYPE_CONFIG[mimeType || ''] || FILE_TYPE_CONFIG['default'];
};
