import React from 'react';
import { Play, Sparkles, Clock, Calendar, Star, Heart, Lock } from 'lucide-react';
import type { Movie } from '../types/movie';
import { userService } from '../services/userService';

interface HeroBannerProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onOpenCuratorWithContext: (prompt: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (movieId: string) => void;
  badgeText?: string;
  onRequireAuth?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  onPlay,
  onOpenCuratorWithContext,
  isFavorite,
  onToggleFavorite,
  badgeText,
  onRequireAuth,
}) => {
  const isAuth = userService.isAuthenticated();
  const isFav = isAuth && (isFavorite !== undefined ? isFavorite : userService.isFavorite(movie.id));

  const handleFavoriteClick = () => {
    if (!isAuth) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (onToggleFavorite) {
      onToggleFavorite(movie.id);
    } else {
      userService.toggleFavorite(movie.id);
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden mb-10 border border-slate-300/50 dark:border-slate-800 shadow-2xl bg-slate-950">
      {/* Background Image with Cinematic Gradients */}
      <div className="absolute inset-0">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover object-center opacity-40 transform scale-102 filter blur-[0.5px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/30" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 p-6 sm:p-10 md:p-14 max-w-3xl space-y-4">
        {/* Curated AI Selection Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-semibold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>{badgeText || 'Destaque Recomendado pelo CAIC'}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
          {movie.title}
        </h1>

        {/* Meta Bar */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-200">
          <div className="flex items-center gap-1 font-bold text-amber-300 bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{movie.ratingScore}</span>
          </div>
          <span className="flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {movie.releaseYear}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> {movie.durationMinutes} min
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 font-mono text-xs border border-slate-700">
            {movie.language}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 font-mono text-xs border border-slate-700">
            {movie.contentRating}
          </span>
        </div>

        {/* Synopsis */}
        <p className="text-xs sm:text-base text-slate-100 line-clamp-3 sm:line-clamp-4 leading-relaxed font-normal max-w-2xl drop-shadow-sm">
          {movie.synopsis}
        </p>

        {/* Genres & Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {movie.genres.map((g) => (
            <span key={g} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900/90 text-cyan-300 border border-cyan-500/30 font-medium">
              {g}
            </span>
          ))}
          {movie.moods.map((m) => (
            <span key={m} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-700 font-medium">
              #{m}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <button
            id="hero-play-button"
            tabIndex={0}
            onClick={() => onPlay(movie)}
            className="tv-focusable flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-400/25 transition-all hover:scale-105"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Assistir Agora (Grátis)</span>
          </button>

          <button
            tabIndex={0}
            onClick={handleFavoriteClick}
            disabled={!isAuth}
            className={`tv-focusable flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm border transition-all ${
              !isAuth
                ? 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                : isFav
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-slate-900/95 border-slate-700 text-white hover:bg-slate-800'
            }`}
            title={!isAuth ? "Disponível para assinantes (Faça login)" : (isFav ? 'Salvo na Minha Lista' : 'Adicionar à Lista')}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>{isFav ? 'Salvo na Minha Lista' : 'Adicionar à Lista'}</span>
            {!isAuth && <Lock className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            tabIndex={0}
            onClick={() => onOpenCuratorWithContext(`Gostei do filme '${movie.title}', me recomende títulos parecidos no mesmo estilo!`)}
            className="tv-focusable flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Por que a IA escolheu este?</span>
          </button>
        </div>
      </div>
    </div>
  );
};
