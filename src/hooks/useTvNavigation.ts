import { useEffect, useState, useCallback } from 'react';

/**
 * Hook universal de navegação por controle remoto para Box TV, Android TV e Smart TVs.
 * Suporta D-Pad (Cima, Baixo, Esquerda, Direita), Botão OK/Enter (KeyCode 13/23/66) e Voltar (KeyCode 4/27).
 */
export function useTvNavigation(onBack?: () => void) {
  const [isTvMode] = useState<boolean>(true);
  const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);

  // Foco automático inicial e manutenção de classe tv-focused
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.classList?.contains('tv-focusable')) {
        document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
        target.classList.add('tv-focused');
        setCurrentFocusId(target.id || null);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        target.classList.remove('tv-focused');
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    // Tentar focar no primeiro elemento interativo assim que o app carregar
    const initTimer = setTimeout(() => {
      const first = document.querySelector<HTMLElement>('.tv-focusable:not([disabled])');
      if (first && (!document.activeElement || document.activeElement === document.body)) {
        first.focus();
        first.classList.add('tv-focused');
        setCurrentFocusId(first.id || null);
      }
    }, 800);

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      clearTimeout(initTimer);
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const keyCode = e.keyCode || e.which;
    const isUp = e.key === 'ArrowUp' || keyCode === 19 || keyCode === 38;
    const isDown = e.key === 'ArrowDown' || keyCode === 20 || keyCode === 40;
    const isLeft = e.key === 'ArrowLeft' || keyCode === 21 || keyCode === 37;
    const isRight = e.key === 'ArrowRight' || keyCode === 22 || keyCode === 39;
    const isEnter = e.key === 'Enter' || e.key === 'Select' || keyCode === 13 || keyCode === 23 || keyCode === 66;
    const isBack = e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack' || keyCode === 4 || keyCode === 27;

    // Se o usuário está digitando num input/textarea, não interferir
    const activeEl = document.activeElement as HTMLElement | null;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (isTyping && !isBack) {
      if (isEnter) {
        // Permitir enter no input
        return;
      }
      return;
    }

    if (isBack) {
      e.preventDefault();
      if (onBack) {
        onBack();
      }
      return;
    }

    if (isEnter) {
      if (activeEl && activeEl.classList.contains('tv-focusable')) {
        e.preventDefault();
        activeEl.click();
      }
      return;
    }

    if (isUp || isDown || isLeft || isRight) {
      e.preventDefault();

      // Encontra todos os elementos visíveis e focáveis
      const focusables = Array.from(document.querySelectorAll<HTMLElement>('.tv-focusable:not([disabled])'))
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

      if (focusables.length === 0) return;

      const current = document.activeElement as HTMLElement | null;
      let currentIndex = focusables.findIndex((el) => el === current);

      if (currentIndex === -1 || !current) {
        // Se nenhum está focado, foca no primeiro
        focusables[0].focus();
        focusables[0].classList.add('tv-focused');
        focusables[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setCurrentFocusId(focusables[0].id || null);
        return;
      }

      const currentRect = current.getBoundingClientRect();
      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      // Algoritmo espacial 2D baseado nas coordenadas da tela da TV
      focusables.forEach((candidate, idx) => {
        if (idx === currentIndex) return;
        const rect = candidate.getBoundingClientRect();

        let isCorrectDirection = false;
        let dist = 0;

        if (isRight && rect.left >= currentRect.left + 5) {
          isCorrectDirection = true;
          dist = Math.hypot(rect.left - currentRect.right, (rect.top - currentRect.top) * 1.5);
        } else if (isLeft && rect.right <= currentRect.right - 5) {
          isCorrectDirection = true;
          dist = Math.hypot(currentRect.left - rect.right, (rect.top - currentRect.top) * 1.5);
        } else if (isDown && rect.top >= currentRect.top + 5) {
          isCorrectDirection = true;
          dist = Math.hypot(rect.top - currentRect.bottom, (rect.left - currentRect.left) * 0.7);
        } else if (isUp && rect.bottom <= currentRect.bottom - 5) {
          isCorrectDirection = true;
          dist = Math.hypot(currentRect.top - rect.bottom, (rect.left - currentRect.left) * 0.7);
        }

        if (isCorrectDirection && dist < minDistance) {
          minDistance = dist;
          bestCandidate = candidate;
        }
      });

      if (bestCandidate) {
        document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
        (bestCandidate as HTMLElement).focus();
        (bestCandidate as HTMLElement).classList.add('tv-focused');
        (bestCandidate as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setCurrentFocusId((bestCandidate as HTMLElement).id || null);
      }
    }
  }, [onBack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isTvMode, currentFocusId };
}
