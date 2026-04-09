import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;

      // In inputs/textareas, only handle Escape (blur the field)
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // "/" — focus the first search input on the page
      if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // "Escape" — close any open dialog
      if (event.key === 'Escape') {
        const closeButton = document.querySelector<HTMLButtonElement>('[data-dialog-close]');
        if (closeButton) {
          closeButton.click();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
