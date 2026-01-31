import React from 'react';
import { ChevronRight, Home, Database, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/fileExplorer';

interface FileBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

const getIcon = (type: BreadcrumbItem['type']) => {
  switch (type) {
    case 'dataset':
      return Database;
    case 'folder':
      return Folder;
    default:
      return Home;
  }
};

export const FileBreadcrumb: React.FC<FileBreadcrumbProps> = ({ items, onNavigate }) => {
  return (
    <nav className="flex items-center gap-1 px-4 py-3 text-sm overflow-x-auto">
      {items.map((item, index) => {
        const Icon = getIcon(item.type);
        const isLast = index === items.length - 1;
        const isFirst = index === 0;

        return (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <button
              onClick={() => onNavigate(index)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200 shrink-0',
                'hover:bg-muted/50',
                isLast 
                  ? 'text-foreground font-medium cursor-default hover:bg-transparent' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
              disabled={isLast}
            >
              {isFirst ? (
                <Home className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className={cn(
                'max-w-[150px] truncate',
                isFirst && 'sr-only sm:not-sr-only'
              )}>
                {item.name}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default FileBreadcrumb;
