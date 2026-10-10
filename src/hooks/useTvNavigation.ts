import { useEffect, useState, useCallback } from 'react';

/**
 * Hook para suporte universal a controle remoto (D-Pad de Android TV, Fire TV, Smart TVs e Teclado)
 */
export function useTvNavigation(onBack?: () => void) {
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isNavigationKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(e.key);
    
    // Se o usuário está digitando num input/textarea, não interferir nas setas normais
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (isTyping && e.key !== 'Escape') {
      return;
    }

    if (isNavigationKey) {
      if (!isTvMode) setIsTvMode(true);
    }

    if (e.key === 'Escape' || e.key === 'Backspace') {
      if (onBack) {
        onBack();
      }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();

      // Encontra todos os elementos focáveis na tela com a classe tv-focusable
      const focusables = Array.from(document.querySelectorAll<HTMLElement>('.tv-focusable:not([disabled])'));
      if (focusables.length === 0) return;

      const current = document.activeElement as HTMLElement | null;
      let currentIndex = focusables.findIndex((el) => el === current);

      if (currentIndex === -1) {
        // Se nenhum está focado, foca no primeiro
        focusables[0].focus();
        focusables[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setCurrentFocusId(focusables[0].id || null);
        return;
      }

      const currentRect = current!.getBoundingClientRect();
      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      // Navegação espacial baseada em coordenadas na tela
      focusables.forEach((candidate, idx) => {
        if (idx === currentIndex) return;
        const rect = candidate.getBoundingClientRect();

        let isCorrectDirection = false;
        let dist = 0;

        if (e.key === 'ArrowRight' && rect.left >= currentRect.left + 10) {
          isCorrectDirection = true;
          dist = Math.hypot(rect.left - currentRect.right, rect.top - currentRect.top);
        } else if (e.key === 'ArrowLeft' && rect.right <= currentRect.right - 10) {
          isCorrectDirection = true;
          dist = Math.hypot(currentRect.left - rect.right, rect.top - currentRect.top);
        } else if (e.key === 'ArrowDown' && rect.top >= currentRect.top + 10) {
          isCorrectDirection = true;
          dist = Math.hypot(rect.top - currentRect.bottom, (rect.left - currentRect.left) * 0.7);
        } else if (e.key === 'ArrowUp' && rect.bottom <= currentRect.bottom - 10) {
          isCorrectDirection = true;
          dist = Math.hypot(currentRect.top - rect.bottom, (rect.left - currentRect.left) * 0.7);
        }

        if (isCorrectDirection && dist < minDistance) {
          minDistance = dist;
          bestCandidate = candidate;
        }
      });

      if (bestCandidate) {
        (bestCandidate as HTMLElement).focus();
        (bestCandidate as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setCurrentFocusId((bestCandidate as HTMLElement).id || null);
      }
    }
  }, [isTvMode, onBack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isTvMode, currentFocusId };
}
