import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Sparkles,
  Flame,
  Swords,
  Gift,
  Car,
  Clapperboard,
  Star,
  Film,
  Calendar,
  Heart,
  CheckCircle2,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { CinemaSession } from '../types/cinemaSession';
import type { Movie } from '../types/movie';

interface CinemaSessionSectionProps {
  session: CinemaSession;
  movies: Movie[];
  onPlayMovie: (movie: Movie) => void;
  isFavorite: (movieId: string) => boolean;
  onToggleFavorite: (movieId: string) => void;
  isWatched: (movieId: string) => boolean;
  onToggleWatched: (movieId: string) => void;
}

export const CinemaSessionSection: React.FC<CinemaSessionSectionProps> = ({
  session,
  movies,
  onPlayMovie,
  isFavorite,
  onToggleFavorite,
  isWatched,
  onToggleWatched,
}) => {
  if (!session || !session.active || !movies || movies.length === 0) {
    return null;
  }

  const renderIcon = () => {
    switch (session.icon) {
      case 'car':
        return <Car className="w-6 h-6 text-amber-400" />;
      case 'swords':
        return <Swords className="w-6 h-6 text-cyan-400" />;
      case 'gift':
        return <Gift className="w-6 h-6 text-emerald-400" />;
      case 'flame':
        return <Flame className="w-6 h-6 text-rose-400" />;
      case 'clapperboard':
        return <Clapperboard className="w-6 h-6 text-purple-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-amber-400" />;
    }
  };

  const getButtonGradient = () => {
    switch (session.accentColor) {
      case 'amber':
        return 'from-amber-500 via-orange-600 to-red-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-600/30';
      case 'cyan':
        return 'from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30';
      case 'emerald':
        return 'from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30';
      case 'purple':
        return 'from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30';
      case 'rose':
        return 'from-rose-600 via-pink-600 to-red-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/30';
      default:
        return 'from-cyan-600 to-blue-600 text-white shadow-cyan-600/30';
    }
  };

  const firstMovie = movies[0];
  const nextUnwatchedMovie = movies.find((m) => !isWatched(m.id)) || firstMovie;
  const hasWatchedAny = movies.some((m) => isWatched(m.id));

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });

  const checkScrollability = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollability, movies]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const offset = carouselRef.current.clientWidth * 0.75;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth',
    });
    setTimeout(checkScrollability, 350);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !carouselRef.current) return;
    dragInfoRef.current = {
      isDown: true,
      startX: e.pageX - carouselRef.current.offsetLeft,
      scrollLeft: carouselRef.current.scrollLeft,
      hasDragged: false,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragInfoRef.current.isDown || !carouselRef.current) return;
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - dragInfoRef.current.startX) * 1.3;
    if (Math.abs(walk) > 6) {
      dragInfoRef.current.hasDragged = true;
    }
    carouselRef.current.scrollLeft = dragInfoRef.current.scrollLeft - walk;
    checkScrollability();
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

  const handleFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!carouselRef.current || !target) return;
    const container = carouselRef.current;
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

  return (
    <section className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 sm:p-7 shadow-2xl transition-all animate-fadeIn select-none">
      {/* Imagem de Fundo Ambiental Sutis */}
      {session.bannerBackdropUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 overflow-hidden">
          <img
            src={session.bannerBackdropUrl}
            alt=""
            className="w-full h-full object-cover filter blur-md scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>
      )}

      {/* Luz Ambiental Superior */}
      <div className={`absolute -top-24 left-1/4 w-96 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-r ${session.themeGradient}`} />

      {/* Conteúdo Principal */}
      <div className="relative z-10 space-y-6">
        {/* Cabeçalho da Sessão */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            {/* Badges de Topo */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-600/20 text-red-300 border border-red-500/40 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>🍿 Sessão Cinema Especial</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Calendar className="w-3 h-3" />
                <span>{session.dateBadge}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <Film className="w-3 h-3" />
                <span>{session.highlightTag}</span>
              </span>
            </div>

            {/* Título e Subtítulo */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
                {renderIcon()}
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                {session.title}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {session.subtitle}
            </p>
          </div>

          {/* Botão de Iniciar Maratona & Contador */}
          <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-300">
                {movies.length} Títulos Selecionados
              </p>
              <p className="text-[11px] text-slate-400">Assista em sequência</p>
            </div>

            {firstMovie && (
              <div className="flex items-center gap-2 flex-wrap">
                {hasWatchedAny && nextUnwatchedMovie && nextUnwatchedMovie.id !== firstMovie.id && (
                  <button
                    onClick={() => onPlayMovie(nextUnwatchedMovie)}
                    className="tv-focusable px-4 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 transition transform hover:scale-105 active:scale-95 cursor-pointer"
                    title={`Continuar maratona no próximo filme: ${nextUnwatchedMovie.title}`}
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                    <span>Próximo Filme ({nextUnwatchedMovie.title.length > 18 ? `${nextUnwatchedMovie.title.slice(0, 18)}...` : nextUnwatchedMovie.title})</span>
                  </button>
                )}

                <button
                  onClick={() => onPlayMovie(firstMovie)}
                  className={`tv-focusable px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg bg-gradient-to-r ${getButtonGradient()} transition transform hover:scale-105 active:scale-95 cursor-pointer`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{hasWatchedAny ? 'Reiniciar Maratona' : 'Iniciar Maratona'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fileira de Filmes em Sequência (Carrossel Horizontal com Navegação) */}
        <div className="relative group/session-row">
          {/* Botão Esquerda */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount('left')}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 h-28 w-11 items-center justify-center rounded-r-2xl bg-slate-950/80 hover:bg-amber-500/90 hover:text-slate-950 text-white backdrop-blur-md shadow-2xl border border-slate-700/60 border-l-0 transition-all opacity-0 group-hover/session-row:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
              title="Rolar sequência para a esquerda"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          <div
            ref={carouselRef}
            onScroll={checkScrollability}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onClickCapture={handleClickCapture}
            onFocusCapture={handleFocusCapture}
            className={`flex flex-row gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth py-2 px-1 scrollbar-none ${
              isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {movies.map((movie, index) => {
              const isFav = isFavorite(movie.id);
              const isWtc = isWatched(movie.id);

              return (
                <div
                  key={`session-${movie.id}-${index}`}
                  id={`session-card-${movie.id}`}
                  tabIndex={0}
                  role="button"
                  onClick={() => onPlayMovie(movie)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onPlayMovie(movie);
                    }
                  }}
                  className="tv-focusable group relative flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 transition-all duration-200 overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 cursor-pointer w-36 sm:w-44 md:w-52 lg:w-56 shrink-0 focus:border-amber-400 focus:shadow-2xl"
                >
                  {/* Poster com Badge de Sequência */}
                  <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 group-hover:via-black/20 transition-all" />

                    {/* Badge de Ordem Sequencial (1º Filme, 2º Filme...) */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wide bg-amber-500 text-slate-950 shadow-md border border-amber-300 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{index + 1}º Filme</span>
                      </span>
                    </div>

                    {/* Ações Rápidas: Favoritar & Assistido */}
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(movie.id);
                        }}
                        className={`p-1.5 rounded-lg backdrop-blur-md transition ${
                          isFav
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-slate-900/70 text-slate-300 hover:text-rose-400 hover:bg-slate-900/90'
                        }`}
                        title={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                      >
                        <Heart className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatched(movie.id);
                        }}
                        className={`p-1.5 rounded-lg backdrop-blur-md transition ${
                          isWtc
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-900/70 text-slate-300 hover:text-emerald-400 hover:bg-slate-900/90'
                        }`}
                        title={isWtc ? 'Marcar como não assistido' : 'Marcar como assistido'}
                      >
                        <CheckCircle2 className={`w-3 h-3 ${isWtc ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Duração & Ano */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-slate-200">
                      <span className="bg-slate-950/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                        {movie.releaseYear}
                      </span>
                      <span className="bg-slate-950/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                        {movie.durationMinutes}m
                      </span>
                    </div>

                    {/* Botão Play Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/50 transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Informações do Filme */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      <h3
                        className="font-bold text-xs text-white group-hover:text-amber-400 line-clamp-1 transition-colors"
                        title={movie.title}
                      >
                        {movie.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {(movie.genres || []).slice(0, 2).join(' • ')}
                      </p>
                    </div>

                    {/* Avaliação e Canal */}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60">
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        ★ {movie.ratingScore || 8.0}
                      </span>
                      <span className="text-[9px] truncate max-w-[80px]" title={movie.channelName}>
                        {movie.channelName}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão Direita */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount('right')}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 h-28 w-11 items-center justify-center rounded-l-2xl bg-slate-950/80 hover:bg-amber-500/90 hover:text-slate-950 text-white backdrop-blur-md shadow-2xl border border-slate-700/60 border-r-0 transition-all opacity-0 group-hover/session-row:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
              title="Rolar sequência para a direita"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
