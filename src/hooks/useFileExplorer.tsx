import { useState, useCallback, useMemo } from 'react';
import type { 
  FileNode, 
  Dataset, 
  FileExplorerState, 
  ViewMode, 
  SortBy, 
  SortOrder,
  BreadcrumbItem 
} from '@/types/fileExplorer';

// Mock data for demo - replace with API calls
const MOCK_DATASETS: Dataset[] = [
  { id: 'ds-1', name: 'Research Papers', description: 'Academic research collection', fileCount: 24, totalSize: 15728640, createdAt: '2025-01-20T10:00:00Z', modifiedAt: '2025-01-25T14:30:00Z', color: 'purple' },
  { id: 'ds-2', name: 'Meeting Notes', description: 'Team meeting transcripts', fileCount: 56, totalSize: 5242880, createdAt: '2025-01-15T08:00:00Z', modifiedAt: '2025-01-24T16:45:00Z', color: 'blue' },
  { id: 'ds-3', name: 'Product Specs', description: 'Technical documentation', fileCount: 12, totalSize: 8388608, createdAt: '2025-01-10T12:00:00Z', modifiedAt: '2025-01-23T09:15:00Z', color: 'green' },
];

const MOCK_FILES: FileNode[] = [
  { id: 'f-1', name: 'Q4 Research Summary.pdf', type: 'file', mimeType: 'application/pdf', size: 2457600, status: 'completed', parentId: null, datasetId: 'ds-1', createdAt: '2025-01-22T10:00:00Z', modifiedAt: '2025-01-22T10:00:00Z', starred: true, chunkCount: 45 },
  { id: 'f-2', name: 'Machine Learning Basics.pdf', type: 'file', mimeType: 'application/pdf', size: 1843200, status: 'completed', parentId: null, datasetId: 'ds-1', createdAt: '2025-01-21T14:30:00Z', modifiedAt: '2025-01-21T14:30:00Z', starred: false, chunkCount: 32 },
  { id: 'f-3', name: 'API Documentation.md', type: 'file', mimeType: 'text/markdown', size: 45056, status: 'completed', parentId: null, datasetId: 'ds-1', createdAt: '2025-01-20T09:00:00Z', modifiedAt: '2025-01-20T09:00:00Z', starred: false, chunkCount: 8 },
  { id: 'f-4', name: 'data-export.json', type: 'file', mimeType: 'application/json', size: 524288, status: 'processing', parentId: null, datasetId: 'ds-1', createdAt: '2025-01-25T11:00:00Z', modifiedAt: '2025-01-25T11:00:00Z', starred: false },
  { id: 'f-5', name: 'Sprint Planning 01-15.txt', type: 'file', mimeType: 'text/plain', size: 12288, status: 'completed', parentId: null, datasetId: 'ds-2', createdAt: '2025-01-15T10:00:00Z', modifiedAt: '2025-01-15T10:00:00Z', starred: true, chunkCount: 3 },
  { id: 'f-6', name: 'Retrospective Notes.md', type: 'file', mimeType: 'text/markdown', size: 8192, status: 'completed', parentId: null, datasetId: 'ds-2', createdAt: '2025-01-18T15:00:00Z', modifiedAt: '2025-01-18T15:00:00Z', starred: false, chunkCount: 2 },
  { id: 'f-7', name: 'sales-data.csv', type: 'file', mimeType: 'text/csv', size: 2097152, status: 'pending', parentId: null, datasetId: 'ds-3', createdAt: '2025-01-24T08:00:00Z', modifiedAt: '2025-01-24T08:00:00Z', starred: false },
  { id: 'f-8', name: 'Architecture Overview.pdf', type: 'file', mimeType: 'application/pdf', size: 3145728, status: 'completed', parentId: null, datasetId: 'ds-3', createdAt: '2025-01-12T12:00:00Z', modifiedAt: '2025-01-12T12:00:00Z', starred: true, chunkCount: 28 },
  { id: 'folder-1', name: 'Archive', type: 'folder', status: 'completed', parentId: null, datasetId: 'ds-1', createdAt: '2025-01-10T10:00:00Z', modifiedAt: '2025-01-20T10:00:00Z', starred: false },
  { id: 'f-9', name: 'Old Research.pdf', type: 'file', mimeType: 'application/pdf', size: 1024000, status: 'completed', parentId: 'folder-1', datasetId: 'ds-1', createdAt: '2025-01-10T10:00:00Z', modifiedAt: '2025-01-10T10:00:00Z', starred: false, chunkCount: 18 },
];

export const useFileExplorer = () => {
  const [state, setState] = useState<FileExplorerState>({
    currentPath: [],
    selectedIds: new Set(),
    viewMode: 'grid',
    sortBy: 'name',
    sortOrder: 'asc',
    searchQuery: '',
    clipboard: { operation: null, fileIds: [] },
  });

  const [datasets] = useState<Dataset[]>(MOCK_DATASETS);
  const [files] = useState<FileNode[]>(MOCK_FILES);
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null);

  // Current dataset/folder based on path
  const currentDataset = useMemo(() => {
    if (state.currentPath.length === 0) return null;
    return datasets.find(d => d.id === state.currentPath[0]) || null;
  }, [state.currentPath, datasets]);

  const currentFolderId = useMemo(() => {
    if (state.currentPath.length <= 1) return null;
    return state.currentPath[state.currentPath.length - 1];
  }, [state.currentPath]);

  // Get files for current view
  const currentFiles = useMemo(() => {
    let filtered = files;
    
    // Filter by dataset
    if (currentDataset) {
      filtered = filtered.filter(f => f.datasetId === currentDataset.id);
    }
    
    // Filter by parent folder
    if (currentFolderId) {
      filtered = filtered.filter(f => f.parentId === currentFolderId);
    } else if (currentDataset) {
      filtered = filtered.filter(f => f.parentId === null);
    }
    
    // Filter by search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(f => f.name.toLowerCase().includes(query));
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      // Folders first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      let comparison = 0;
      switch (state.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
          break;
        case 'size':
          comparison = (b.size || 0) - (a.size || 0);
          break;
        case 'type':
          comparison = (a.mimeType || '').localeCompare(b.mimeType || '');
          break;
      }
      return state.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [files, currentDataset, currentFolderId, state.searchQuery, state.sortBy, state.sortOrder]);

  // Breadcrumb items
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ id: 'root', name: 'All Datasets', type: 'dataset' }];
    
    for (const pathId of state.currentPath) {
      const dataset = datasets.find(d => d.id === pathId);
      if (dataset) {
        items.push({ id: dataset.id, name: dataset.name, type: 'dataset' });
        continue;
      }
      
      const folder = files.find(f => f.id === pathId && f.type === 'folder');
      if (folder) {
        items.push({ id: folder.id, name: folder.name, type: 'folder' });
      }
    }
    
    return items;
  }, [state.currentPath, datasets, files]);

  // Quick access items
  const starredFiles = useMemo(() => files.filter(f => f.starred), [files]);
  const recentFiles = useMemo(() => 
    [...files]
      .filter(f => f.type === 'file')
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      .slice(0, 5),
    [files]
  );

  // Actions
  const navigateTo = useCallback((path: string[]) => {
    setState(s => ({ ...s, currentPath: path, selectedIds: new Set() }));
  }, []);

  const navigateToDataset = useCallback((datasetId: string) => {
    setState(s => ({ ...s, currentPath: [datasetId], selectedIds: new Set() }));
  }, []);

  const navigateToFolder = useCallback((folderId: string) => {
    setState(s => ({ ...s, currentPath: [...s.currentPath, folderId], selectedIds: new Set() }));
  }, []);

  const navigateUp = useCallback(() => {
    setState(s => ({ ...s, currentPath: s.currentPath.slice(0, -1), selectedIds: new Set() }));
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index === 0) {
      setState(s => ({ ...s, currentPath: [], selectedIds: new Set() }));
    } else {
      setState(s => ({ ...s, currentPath: s.currentPath.slice(0, index), selectedIds: new Set() }));
    }
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(s => ({ ...s, viewMode: mode }));
  }, []);

  const setSortBy = useCallback((sortBy: SortBy) => {
    setState(s => ({ 
      ...s, 
      sortBy,
      sortOrder: s.sortBy === sortBy ? (s.sortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(s => ({ ...s, searchQuery: query }));
  }, []);

  const toggleSelection = useCallback((fileId: string, multiSelect = false) => {
    setState(s => {
      const newSelected = new Set(multiSelect ? s.selectedIds : []);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return { ...s, selectedIds: newSelected };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState(s => ({ ...s, selectedIds: new Set(currentFiles.map(f => f.id)) }));
  }, [currentFiles]);

  const clearSelection = useCallback(() => {
    setState(s => ({ ...s, selectedIds: new Set() }));
  }, []);

  const toggleStar = useCallback((fileId: string) => {
    // In real app, this would call API
    console.log('Toggle star for:', fileId);
  }, []);

  const openFile = useCallback((file: FileNode) => {
    if (file.type === 'folder') {
      navigateToFolder(file.id);
    } else {
      setPreviewFile(file);
    }
  }, [navigateToFolder]);

  const closePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  return {
    // State
    state,
    datasets,
    currentDataset,
    currentFiles,
    breadcrumbs,
    starredFiles,
    recentFiles,
    previewFile,
    
    // Navigation
    navigateTo,
    navigateToDataset,
    navigateToFolder,
    navigateUp,
    navigateToBreadcrumb,
    
    // View options
    setViewMode,
    setSortBy,
    setSearchQuery,
    
    // Selection
    toggleSelection,
    selectAll,
    clearSelection,
    
    // Actions
    toggleStar,
    openFile,
    closePreview,
  };
};
