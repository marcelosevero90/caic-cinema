import React, { useState } from 'react';
import {
  Play,
  Sparkles,
  Flame,
  Swords,
  Gift,
  Car,
  Clapperboard,
  Film,
  Calendar,
  Layers,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import type { CinemaSession } from '../types/cinemaSession';
import type { Movie } from '../types/movie';
import { cinemaSessionService } from '../services/cinemaSessionService';
import { MovieCard } from './MovieCard';

interface CinemaSessionsDirectoryProps {
  sessions: CinemaSession[];
  activeSession: CinemaSession;
  catalog: Movie[];
  onPlayMovie: (movie: Movie, marathonQueue?: Movie[]) => void;
  isFavorite: (movieId: string) => boolean;
  onToggleFavorite: (movieId: string) => void;
  isWatched: (movieId: string) => boolean;
  onToggleWatched: (movieId: string) => void;
}

export const CinemaSessionsDirectory: React.FC<CinemaSessionsDirectoryProps> = ({
  sessions,
  activeSession,
  catalog,
  onPlayMovie,
  isFavorite,
  onToggleFavorite,
  isWatched,
  onToggleWatched,
}) => {
  const [selectedSession, setSelectedSession] = useState<CinemaSession | null>(null);

  const renderIcon = (icon?: string) => {
    switch (icon) {
      case 'car':
        return <Car className="w-5 h-5 text-amber-400" />;
      case 'swords':
        return <Swords className="w-5 h-5 text-cyan-400" />;
      case 'gift':
        return <Gift className="w-5 h-5 text-emerald-400" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-rose-400" />;
      case 'clapperboard':
        return <Clapperboard className="w-5 h-5 text-purple-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const getGradient = (accentColor?: string) => {
    switch (accentColor) {
      case 'amber':
        return 'from-amber-500 via-orange-600 to-red-600';
      case 'cyan':
        return 'from-cyan-600 via-blue-600 to-indigo-600';
      case 'emerald':
        return 'from-emerald-600 via-teal-600 to-green-600';
      case 'purple':
        return 'from-purple-600 via-indigo-600 to-cyan-600';
      case 'rose':
        return 'from-rose-600 via-pink-600 to-red-600';
      default:
        return 'from-cyan-600 to-blue-600';
    }
  };

  // Se uma sessão estiver aberta, renderiza a lista completa de filmes dela
  if (selectedSession) {
    const sessionMovies = cinemaSessionService.getResolvedMovies(selectedSession, catalog);
    const isCurrentActive = selectedSession.id === activeSession.id;

    const handleStartMarathon = () => {
      if (sessionMovies.length > 0) {
        // Inicia pelo primeiro filme da sessão e passa a fila sequencial completa
        onPlayMovie(sessionMovies[0], sessionMovies);
      }
    };

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Botão de Retorno */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedSession(null)}
            className="tv-focusable flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Todas as Sessões Cinema</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            {sessionMovies.length} títulos nesta série
          </span>
        </div>

        {/* Banner de Destaque da Sessão Aberta */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
          <div className="absolute inset-0 z-0">
            <img
              src={selectedSession.bannerBackdropUrl}
              alt={selectedSession.title}
              className="w-full h-full object-cover object-center opacity-30 blur-[1px]"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${getGradient(selectedSession.accentColor)} opacity-30 mix-blend-overlay`} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 shadow-inner">
                {renderIcon(selectedSession.icon)}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-900/90 text-amber-400 border border-amber-500/30">
                {selectedSession.highlightTag || 'MARATONA EM SEQUÊNCIA'}
              </span>
              {isCurrentActive ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🔥 Em Cartaz na Tela Inicial
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Edição do Acervo
                </span>
              )}
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {selectedSession.dateBadge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-md">
              {selectedSession.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {selectedSession.subtitle}
            </p>

            {/* Ações da Sessão */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleStartMarathon}
                className={`tv-focusable px-6 py-3.5 rounded-2xl bg-gradient-to-r ${getGradient(
                  selectedSession.accentColor
                )} hover:brightness-110 text-white font-black text-sm flex items-center gap-2.5 shadow-xl transition transform hover:scale-105 active:scale-95 cursor-pointer`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Série / Maratona Completa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grade de Filmes da Sessão */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-cyan-400" />
              <span>Filmes em Ordem de Exibição</span>
            </h3>
            <span className="text-xs text-slate-400">
              Assista na sequência ou escolha qualquer filme abaixo
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sessionMovies.map((movie, idx) => (
              <div key={movie.id} className="relative flex flex-col group">
                {/* Badge de Ordem na Série */}
                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-slate-950/90 border border-cyan-500/40 text-[10px] font-black text-cyan-300 shadow-md">
                  #{idx + 1} da Série
                </div>
                <MovieCard
                  movie={movie}
                  onPlay={(m) => onPlayMovie(m, sessionMovies.slice(idx))}
                  index={idx}
                  isFavorite={isFavorite(movie.id)}
                  onToggleFavorite={onToggleFavorite}
                  isWatched={isWatched(movie.id)}
                  onToggleWatched={onToggleWatched}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Visão Principal: Diretório de Cards de Sessão Cinema
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabeçalho do Diretório */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Catálogo Especial de Séries & Maratonas
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Sessão Cinema & Maratonas Temáticas
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Reunimos os maiores clássicos e franquias do cinema organizados em maratonas temáticas completas.
          Escolha uma edição abaixo para ver todos os filmes da sequência e dar o play na série inteira!
        </p>
      </div>

      {/* Grade de Cards das Sessões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((session) => {
          const sessionMovies = cinemaSessionService.getResolvedMovies(session, catalog);
          const isCurrentActive = session.id === activeSession.id;

          return (
            <div
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className="group relative rounded-3xl overflow-hidden border border-slate-800/80 hover:border-cyan-500/60 bg-slate-950 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/10 cursor-pointer flex flex-col justify-between"
            >
              {/* Imagem de Fundo com Gradiente */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={session.bannerBackdropUrl}
                  alt={session.title}
                  className="w-full h-full object-cover object-center opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(session.accentColor)} opacity-25 mix-blend-overlay`} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
              </div>

              {/* Conteúdo do Card */}
              <div className="relative z-10 p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-slate-900/90 border border-slate-700">
                      {renderIcon(session.icon)}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      {session.highlightTag || 'MARATONA'}
                    </span>
                  </div>

                  {isCurrentActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🔥 Em Cartaz Hoje
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/80 text-slate-400 border border-slate-700">
                      Acervo Especial
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition leading-snug">
                    {session.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {session.subtitle}
                  </p>
                </div>

                {/* Strip com Miniaturas dos 4 Primeiros Filmes */}
                {sessionMovies.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span className="font-semibold text-slate-300">
                        {sessionMovies.length} Filmes na Série:
                      </span>
                      <span className="font-mono text-cyan-400">{session.dateBadge}</span>
                    </div>

                    <div className="flex items-center gap-2 overflow-hidden">
                      {sessionMovies.slice(0, 5).map((m) => (
                        <div
                          key={m.id}
                          className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0 shadow-md"
                          title={m.title}
                        >
                          <img
                            src={m.posterUrl}
                            alt={m.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                      ))}
                      {sessionMovies.length > 5 && (
                        <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                          +{sessionMovies.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Barra Inferior com Botão */}
              <div className="relative z-10 px-6 py-3.5 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                  Reprodução Sequencial
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:text-cyan-300 transition">
                  <span>Abrir Série</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
