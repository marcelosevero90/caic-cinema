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

    // Se o usuário está digitando num input/textarea, permitir sair com Cima/Baixo
    const activeEl = document.activeElement as HTMLElement | null;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (isTyping && !isBack) {
      if (isEnter) {
        // Se pressionou Enter no input, permite submit natural do form
        return;
      }
      // Se pressionou Cima ou Baixo, permite navegar para fora do input!
      if (!isUp && !isDown) {
        return;
      }
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

      const current = document.activeElement as HTMLElement | null;
      let bestCandidate: HTMLElement | null = null;

      // 1. FAST PATH para Carrossel Horizontal: Esquerda e Direita diretos no DOM (0ms)
      if (current && (isLeft || isRight)) {
        const carousel = current.closest('.movie-carousel') as HTMLElement | null;
        if (carousel) {
          const itemWrapper = (current.closest('.shrink-0') || current) as HTMLElement;
          const sibling = isRight ? itemWrapper.nextElementSibling : itemWrapper.previousElementSibling;
          if (sibling) {
            const inSibling = sibling.querySelector<HTMLElement>('.tv-focusable') || (sibling.classList.contains('tv-focusable') ? (sibling as HTMLElement) : null);
            if (inSibling) {
              bestCandidate = inSibling;
            }
          }
        }
      }

      // 2. Se não encontrou no fast-path, busca elementos visíveis usando offsetParent (sem forçar reflow)
      if (!bestCandidate) {
        const allFocusables = Array.from(document.querySelectorAll<HTMLElement>('.tv-focusable:not([disabled])'));
        const focusables = allFocusables.filter(el => el.offsetParent !== null || el.getClientRects().length > 0);

        if (focusables.length === 0) return;

        let currentIndex = current ? focusables.findIndex((el) => el === current) : -1;

        if (currentIndex === -1 || !current) {
          focusables[0].focus();
          focusables[0].classList.add('tv-focused');
          setCurrentFocusId(focusables[0].id || null);
          return;
        }

        const currentRect = current.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;
        const currentCenterY = currentRect.top + currentRect.height / 2;
        let minDistance = Infinity;

        // Se estiver subindo ou descendo, podemos priorizar elementos que estejam na direção certa
        for (let i = 0; i < focusables.length; i++) {
          if (i === currentIndex) continue;
          const candidate = focusables[i];
          const rect = candidate.getBoundingClientRect();
          const candCenterX = rect.left + rect.width / 2;
          const candCenterY = rect.top + rect.height / 2;

          let isCorrectDirection = false;
          let dist = Infinity;

          if (isRight) {
            if (rect.left >= currentRect.left + 5) {
              isCorrectDirection = true;
              const isSameRow = Math.abs(currentCenterY - candCenterY) < 60;
              const xDist = rect.left - currentRect.right;
              const yDist = Math.abs(currentCenterY - candCenterY);
              dist = isSameRow ? xDist : xDist * 1.5 + yDist * 3.0;
            }
          } else if (isLeft) {
            if (rect.right <= currentRect.right - 5) {
              isCorrectDirection = true;
              const isSameRow = Math.abs(currentCenterY - candCenterY) < 60;
              const xDist = currentRect.left - rect.right;
              const yDist = Math.abs(currentCenterY - candCenterY);
              dist = isSameRow ? xDist : xDist * 1.5 + yDist * 3.0;
            }
          } else if (isDown) {
            if (rect.top >= currentRect.top + 25) {
              isCorrectDirection = true;
              const yDist = rect.top - currentRect.bottom;
              const xDist = Math.abs(currentCenterX - candCenterX);
              dist = yDist * 1.2 + xDist * 0.5;
            }
          } else if (isUp) {
            if (rect.bottom <= currentRect.bottom - 25) {
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
        }
      }

      if (bestCandidate) {
        document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
        const targetEl = bestCandidate as HTMLElement;
        targetEl.focus();
        targetEl.classList.add('tv-focused');
        setCurrentFocusId(targetEl.id || null);

        // 1. Centraliza horizontalmente dentro do carrossel instantaneamente (0ms sem gargalo de GPU)
        const parent = targetEl.closest('.movie-carousel') as HTMLElement | null;
        if (parent) {
          const pRect = parent.getBoundingClientRect();
          const elRect = targetEl.getBoundingClientRect();
          const offset = (elRect.left - pRect.left) - (pRect.width / 2 - elRect.width / 2);
          parent.scrollLeft += offset;
        }

        // 2. Centraliza verticalmente a tela no elemento focado de forma instantânea
        const finalRect = targetEl.getBoundingClientRect();
        const screenCenterOffset = (finalRect.top + finalRect.height / 2) - (window.innerHeight / 2);
        if (Math.abs(screenCenterOffset) > 40) {
          const targetY = window.pageYOffset + screenCenterOffset;
          window.scrollTo(0, targetY);
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
