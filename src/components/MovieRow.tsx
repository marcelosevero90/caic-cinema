import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Movie } from '../types/movie';
import { MovieCard } from './MovieCard';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  movies: Movie[];
  onPlayMovie: (movie: Movie) => void;
  isFavorite: (movieId: string) => boolean;
  onToggleFavorite: (movieId: string) => void;
  isWatched: (movieId: string) => boolean;
  onToggleWatched: (movieId: string) => void;
  onSeeAll?: () => void;
  seeAllText?: string;
  badge?: string;
  rowId: string;
}

export const MovieRowComponent: React.FC<MovieRowProps> = ({
  title,
  subtitle,
  icon,
  movies,
  onPlayMovie,
  isFavorite,
  onToggleFavorite,
  isWatched,
  onToggleWatched,
  onSeeAll,
  seeAllText,
  badge,
  rowId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });

  const scrollRafRef = useRef<number | null>(null);

  const checkScrollability = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    const nextLeft = scrollLeft > 10;
    const nextRight = scrollLeft < scrollWidth - clientWidth - 10;
    setCanScrollLeft((prev) => (prev !== nextLeft ? nextLeft : prev));
    setCanScrollRight((prev) => (prev !== nextRight ? nextRight : prev));
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      checkScrollability();
      scrollRafRef.current = null;
    });
  }, [checkScrollability]);

  useEffect(() => {
    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [checkScrollability, movies]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const offset = containerRef.current.clientWidth * 0.75;
    containerRef.current.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth',
    });
    setTimeout(checkScrollability, 350);
  };

  // Suporte a arrastar com o mouse (Mouse Drag-to-Scroll estilo Netflix)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !containerRef.current) return;
    dragInfoRef.current = {
      isDown: true,
      startX: e.pageX - containerRef.current.offsetLeft,
      scrollLeft: containerRef.current.scrollLeft,
      hasDragged: false,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragInfoRef.current.isDown || !containerRef.current) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - dragInfoRef.current.startX) * 1.3;
    if (Math.abs(walk) > 6) {
      dragInfoRef.current.hasDragged = true;
    }
    containerRef.current.scrollLeft = dragInfoRef.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (dragInfoRef.current.isDown) {
      dragInfoRef.current.isDown = false;
      setIsDragging(false);
      checkScrollability();
      setTimeout(() => {
        dragInfoRef.current.hasDragged = false;
      }, 100);
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (dragInfoRef.current.hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Quando um elemento recebe foco pelo controle remoto da TV, centraliza na barra
  const handleFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!containerRef.current || !target) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const targetScrollLeft =
      container.scrollLeft +
      (targetRect.left - containerRect.left) -
      (containerRect.width / 2 - targetRect.width / 2);

    container.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });
    setTimeout(checkScrollability, 300);
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section id={rowId} className="relative space-y-3 group/row select-none">
      {/* Cabeçalho da Barra */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {title}
              </h2>
              {badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              {seeAllText || 'Ver todos'} ({movies.length}) →
            </button>
          )}
        </div>
      </div>

      {/* Container de Carrossel Horizontal com Navegação e Scroll */}
      <div className="relative">
        {/* Botão de Navegação Esquerda */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 h-28 w-11 items-center justify-center rounded-r-2xl bg-slate-950/80 hover:bg-cyan-600/90 text-white backdrop-blur-md shadow-2xl border border-slate-700/60 border-l-0 transition-all opacity-0 group-hover/row:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Rolar para a esquerda"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        {/* Fileira de Filmes com Suporte a Drag & D-Pad */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClickCapture={handleClickCapture}
          onFocusCapture={handleFocusCapture}
          className={`movie-carousel flex flex-row gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth py-2 px-1 scrollbar-none ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {movies.map((movie, idx) => (
            <div
              key={`${rowId}-${movie.id}-${idx}`}
              className="w-36 sm:w-44 md:w-52 lg:w-56 shrink-0 transition-transform duration-200"
            >
              <MovieCard
                movie={movie}
                onPlay={(m) => onPlayMovie(m)}
                index={idx}
                isFavorite={isFavorite(movie.id)}
                onToggleFavorite={onToggleFavorite}
                isWatched={isWatched(movie.id)}
                onToggleWatched={onToggleWatched}
              />
            </div>
          ))}
        </div>

        {/* Botão de Navegação Direita */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 h-28 w-11 items-center justify-center rounded-l-2xl bg-slate-950/80 hover:bg-cyan-600/90 text-white backdrop-blur-md shadow-2xl border border-slate-700/60 border-r-0 transition-all opacity-0 group-hover/row:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Rolar para a direita"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>
    </section>
  );
};

export const MovieRow = React.memo(MovieRowComponent);

