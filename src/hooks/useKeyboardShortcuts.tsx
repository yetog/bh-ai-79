import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchedShortcut = shortcuts.find(shortcut => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.altKey === event.altKey
        );
      });

      if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Predefined shortcuts for common actions
export const useCommonShortcuts = (callbacks: {
  onUpload?: () => void;
  onSearch?: () => void;
  onInsights?: () => void;
  onSettings?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'u',
      ctrlKey: true,
      action: callbacks.onUpload || (() => {}),
      description: 'Switch to Upload tab'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: callbacks.onSearch || (() => {}),
      description: 'Switch to Search tab'
    },
    {
      key: 'i',
      ctrlKey: true,
      action: callbacks.onInsights || (() => {}),
      description: 'Switch to Insights tab'
    },
    {
      key: ',',
      ctrlKey: true,
      action: callbacks.onSettings || (() => {}),
      description: 'Open Settings'
    }
  ].filter(shortcut => shortcut.action !== (() => {}));

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
};