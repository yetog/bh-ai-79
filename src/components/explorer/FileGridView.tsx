import React from 'react';
import { FileGridItem } from './FileGridItem';
import { cn } from '@/lib/utils';
import type { FileNode } from '@/types/fileExplorer';

interface FileGridViewProps {
  files: FileNode[];
  selectedIds: Set<string>;
  onSelect: (fileId: string, multiSelect: boolean) => void;
  onOpen: (file: FileNode) => void;
  onStar: (fileId: string) => void;
  onPreview: (file: FileNode) => void;
}

export const FileGridView: React.FC<FileGridViewProps> = ({
  files,
  selectedIds,
  onSelect,
  onOpen,
  onStar,
  onPreview,
}) => {
  return (
    <div className={cn(
      'grid gap-4',
      'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    )}>
      {files.map((file, index) => (
        <div
          key={file.id}
          className="animate-fade-in"
          style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
        >
          <FileGridItem
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
  );
};

export default FileGridView;
