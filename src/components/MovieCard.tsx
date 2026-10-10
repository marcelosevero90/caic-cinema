import React, { useMemo } from 'react';
import { Play, Clock, Star, Film, Heart, CheckCircle2, RotateCcw, Eye, Sparkles } from 'lucide-react';
import type { Movie } from '../types/movie';
import { userService } from '../services/userService';
import { getMovieTips } from '../services/movieTipsService';

interface MovieCardProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: (movieId: string) => void;
  isWatched?: boolean;
  onToggleWatched?: (movieId: string) => void;
  onRequireAuth?: (action: 'favorite' | 'watched') => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onPlay,
  index,
  isFavorite,
  onToggleFavorite,
  isWatched,
  onToggleWatched,
  onRequireAuth,
}) => {
  const isAuth = userService.isAuthenticated();
  const isFav = isAuth && (isFavorite !== undefined ? isFavorite : userService.isFavorite(movie.id));
  const watched = isAuth && (isWatched !== undefined ? isWatched : userService.isWatched(movie.id));
  const tips = useMemo(() => getMovieTips(movie), [movie]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuth) {
      if (onRequireAuth) onRequireAuth('favorite');
      return;
    }
    if (onToggleFavorite) {
      onToggleFavorite(movie.id);
    } else {
      userService.toggleFavorite(movie.id);
    }
  };

  const handleWatchedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuth) {
      if (onRequireAuth) onRequireAuth('watched');
      return;
    }
    if (onToggleWatched) {
      onToggleWatched(movie.id);
    } else {
      userService.toggleWatched(movie.id);
    }
  };

  return (
    <div
      id={`movie-card-${movie.id}`}
      tabIndex={0}
      role="button"
      onClick={() => onPlay(movie)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onPlay(movie);
        }
      }}
      className="tv-focusable group relative flex flex-col bg-white dark:bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer transition-all duration-300 hover:border-cyan-500 hover:shadow-xl hover:-translate-y-1 focus:border-cyan-500 focus:shadow-2xl"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[16/10] sm:aspect-[2/3] w-full overflow-hidden bg-slate-900">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-focus:scale-105"
        />

        {/* Soft overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

        {/* Top Badges & Action Buttons */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <div className="flex flex-col gap-1 pointer-events-none">
            {watched && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Já Assistido
              </span>
            )}

            {movie.source === 'jellyfin' ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-600 text-white shadow-md">
                Jellyfin
              </span>
            ) : movie.badge && !watched ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950 shadow-md">
                {movie.badge}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botão de Marcar como Já Assistido */}
            <button
              onClick={handleWatchedClick}
              disabled={!isAuth}
              title={!isAuth ? "Disponível para assinantes (Faça login)" : (watched ? "Já assistido (clique para desmarcar)" : "Marcar como já assistido")}
              className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                !isAuth
                  ? 'bg-black/30 text-slate-500 opacity-40 cursor-not-allowed'
                  : watched
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Botão de Favoritar */}
            <button
              onClick={handleFavoriteClick}
              disabled={!isAuth}
              title={!isAuth ? "Disponível para assinantes (Faça login)" : (isFav ? "Remover dos Favoritos" : "Adicionar aos Favoritos")}
              className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                !isAuth
                  ? 'bg-black/30 text-slate-500 opacity-40 cursor-not-allowed'
                  : isFav
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105'
                  : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Play & Smart CineAI Tips Overlay on Hover/Focus */}
        <div className="absolute inset-0 flex flex-col justify-between p-2.5 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-300 bg-slate-950/85 backdrop-blur-[3px] z-20">
          {/* Top: Badges de Destaque */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
              <Sparkles className="w-2.5 h-2.5" /> Dica CAIC
            </span>
            {tips.highlights.map((h, i) => (
              <span
                key={i}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-900/90 text-cyan-200 border border-cyan-500/40 shadow-sm"
              >
                {h.icon} {h.label}
              </span>
            ))}
          </div>

          {/* Center: Play Icon */}
          <div className="flex flex-col items-center justify-center my-auto py-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/50 transform scale-90 group-hover:scale-105 group-focus:scale-105 transition-transform duration-300">
              {watched ? <RotateCcw className="w-5 h-5 text-slate-950 stroke-[2.5]" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
            </div>
            <span className="text-[10px] font-bold text-white mt-1 drop-shadow">
              {watched ? 'Assistir Novamente' : 'Dar Play Agora'}
            </span>
          </div>

          {/* Bottom: Por que vale a pena assistir */}
          <div className="p-2 rounded-xl bg-slate-900/95 border border-white/10 shadow-lg backdrop-blur-md">
            <p className="text-[10px] text-amber-300 font-extrabold flex items-center gap-1 mb-0.5">
              <span>💡</span>
              <span>Vale a pena assistir:</span>
            </p>
            <p className="text-[10px] text-slate-200 leading-snug line-clamp-3 font-medium">
              {tips.reason}
            </p>
          </div>
        </div>

        {/* Quick Meta on bottom of poster */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-slate-200 pointer-events-none">
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-white">
            <Clock className="w-3 h-3 text-cyan-400" /> {movie.durationMinutes}m
          </span>
          <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-semibold text-white">
            {movie.language}
          </span>
        </div>
      </div>

      {/* Card Details */}
      <div className="p-3.5 flex flex-col flex-grow justify-between gap-2 bg-white dark:bg-slate-900">
        <div>
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
              {movie.title}
            </h3>
            <div className="flex items-center gap-0.5 text-xs font-bold text-amber-500 dark:text-amber-400 flex-shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{movie.ratingScore}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 mt-1 leading-snug font-normal">
            {movie.synopsis}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 gap-1">
          <div className="flex items-center gap-1 truncate font-medium">
            <Film className="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span className="truncate text-slate-800 dark:text-slate-300">
              {movie.subgenres && movie.subgenres.length > 0 ? movie.subgenres[0] : movie.genres[0]}
            </span>
          </div>
          <span
            className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-bold text-[9px] border border-cyan-200 dark:border-cyan-800 flex-shrink-0 flex items-center gap-0.5"
            title={tips.reason}
          >
            <span>{tips.badge.icon}</span>
            <span className="truncate max-w-[85px]">{tips.badge.label}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
