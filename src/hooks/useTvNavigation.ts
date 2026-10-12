import { useEffect, useState, useCallback } from 'react';

/**
 * Hook universal de navegação por controle remoto para Box TV, Android TV e Smart TVs estilo Netflix.
 * Suporta D-Pad (Cima, Baixo, Esquerda, Direita), Botão OK/Enter (KeyCode 13/23/66) e Voltar (KeyCode 4/27).
 * Centraliza automaticamente linhas horizontais e rola a tela verticalmente para manter o foco sempre visível.
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

    // Foca no primeiro elemento interativo assim que o app carrega
    const initTimer = setTimeout(() => {
      const first = document.querySelector<HTMLElement>('.tv-focusable:not([disabled])');
      if (first && (!document.activeElement || document.activeElement === document.body)) {
        first.focus();
        first.classList.add('tv-focused');
        setCurrentFocusId(first.id || null);
      }
    }, 600);

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
        focusables[0].focus();
        focusables[0].classList.add('tv-focused');
        setCurrentFocusId(focusables[0].id || null);
        return;
      }

      const currentRect = current.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;

      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      focusables.forEach((candidate, idx) => {
        if (idx === currentIndex) return;
        const rect = candidate.getBoundingClientRect();
        const candCenterX = rect.left + rect.width / 2;
        const candCenterY = rect.top + rect.height / 2;

        let isCorrectDirection = false;
        let dist = Infinity;

        if (isRight) {
          // Movendo para a direita: prefere elementos na mesma linha vertical
          if (rect.left >= currentRect.left + 5) {
            isCorrectDirection = true;
            const isSameRow = Math.abs(currentCenterY - candCenterY) < 60;
            const xDist = rect.left - currentRect.right;
            const yDist = Math.abs(currentCenterY - candCenterY);
            dist = isSameRow ? xDist : xDist * 1.5 + yDist * 3.0;
          }
        } else if (isLeft) {
          // Movendo para a esquerda: prefere elementos na mesma linha vertical
          if (rect.right <= currentRect.right - 5) {
            isCorrectDirection = true;
            const isSameRow = Math.abs(currentCenterY - candCenterY) < 60;
            const xDist = currentRect.left - rect.right;
            const yDist = Math.abs(currentCenterY - candCenterY);
            dist = isSameRow ? xDist : xDist * 1.5 + yDist * 3.0;
          }
        } else if (isDown) {
          // Movendo para baixo: pula para a próxima linha/categoria
          if (rect.top >= currentRect.top + 30) {
            isCorrectDirection = true;
            const yDist = rect.top - currentRect.bottom;
            const xDist = Math.abs(currentCenterX - candCenterX);
            dist = yDist * 1.2 + xDist * 0.5;
          }
        } else if (isUp) {
          // Movendo para cima: pula para a linha/categoria anterior
          if (rect.bottom <= currentRect.bottom - 30) {
            isCorrectDirection = true;
            const yDist = currentRect.top - rect.bottom;
            const xDist = Math.abs(currentCenterX - candCenterX);
            dist = yDist * 1.2 + xDist * 0.5;
          }
        }

        if (isCorrectDirection && dist < minDistance) {
          minDistance = dist;
          bestCandidate = candidate;
        }
      });

      if (bestCandidate) {
        document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
        const targetEl = bestCandidate as HTMLElement;
        targetEl.focus();
        targetEl.classList.add('tv-focused');
        setCurrentFocusId(targetEl.id || null);

        // 1. Centraliza horizontalmente dentro do container de scroll se houver
        let parent: HTMLElement | null = targetEl.parentElement;
        while (parent && parent !== document.body) {
          const overflowX = window.getComputedStyle(parent).overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll' || parent.classList.contains('movie-carousel')) {
            const pRect = parent.getBoundingClientRect();
            const elRect = targetEl.getBoundingClientRect();
            const offset = (elRect.left - pRect.left) - (pRect.width / 2 - elRect.width / 2);
            if (parent.scrollBy) {
              try {
                parent.scrollBy({ left: offset, behavior: 'smooth' });
              } catch {
                parent.scrollLeft += offset;
              }
            } else {
              parent.scrollLeft += offset;
            }
            break;
          }
          parent = parent.parentElement;
        }

        // 2. Centraliza verticalmente a janela no elemento focado
        const finalRect = targetEl.getBoundingClientRect();
        const screenCenterOffset = (finalRect.top + finalRect.height / 2) - (window.innerHeight / 2);
        if (Math.abs(screenCenterOffset) > 40) {
          const targetY = window.pageYOffset + screenCenterOffset;
          if (window.scrollTo) {
            try {
              window.scrollTo({ top: targetY, behavior: 'smooth' });
            } catch {
              window.scrollTo(0, targetY);
            }
          }
        }
      }
    }
  }, [onBack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isTvMode, currentFocusId };
}
