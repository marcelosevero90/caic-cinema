import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Clock,
  Calendar,
  Star,
  Film,
  Shield,
  Heart,
  CheckCircle2,
  RotateCcw,
  User,
  Send,
  Loader2,
  Globe,
  Bot,
  SkipForward
} from 'lucide-react';
import type { Movie } from '../types/movie';
import { userService } from '../services/userService';
import { geminiCurationService } from '../services/geminiCurationService';
import { playbackSessionService } from '../services/playbackSessionService';
import { getMovieTips } from '../services/movieTipsService';

interface YouTubePlayerModalProps {
  movie: Movie | null;
  onClose: () => void;
  onAskSimilar: (movie: Movie) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (movieId: string) => void;
  nextMovie?: Movie | null;
  onNextMovie?: () => void;
}

interface MovieInsightMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timestamp: string;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  movie,
  onClose,
  onAskSimilar,
  isFavorite,
  onToggleFavorite,
  nextMovie,
  onNextMovie,
}) => {
  const [watched, setWatched] = useState(false);
  const [chatMessages, setChatMessages] = useState<MovieInsightMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    if (movie) {
      userService.recordWatch(movie.id);
      setWatched(userService.isWatched(movie.id));

      // Inicializa o chat da IA com mensagem de boas-vindas focada no filme
      setChatMessages([
        {
          id: `welcome-${movie.id}`,
          role: 'assistant',
          text: `Olá! Sou o CAIC. O que você gostaria de saber sobre "${movie.title}" (${movie.releaseYear})? Posso pesquisar críticas na web, explicar se é baseado em fatos reais, listar curiosidades de filmagem ou detalhar o elenco!`,
          sources: ['Base de Conhecimento CAIC'],
          timestamp: 'Agora'
        }
      ]);
      setChatInput('');
    }
  }, [movie]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA';
      if (!isInput && (e.key === 'Escape' || e.key === 'Backspace')) {
        onClose();
      }
      if (!isInput && (e.key === 'n' || e.key === 'N') && onNextMovie && nextMovie) {
        onNextMovie();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNextMovie, nextMovie]);

  useEffect(() => {
    const unsub = playbackSessionService.onTerminated((newSession) => {
      alert(`A reprodução foi pausada pois o aparelho "${newSession?.deviceName || 'outro dispositivo'}" iniciou um filme nesta mesma conta (limite de 1 acesso por vez).`);
      onClose();
    });
    return () => {
      unsub();
      playbackSessionService.stopPlayback();
    };
  }, [onClose]);

  if (!movie) return null;

  const isFav = isFavorite !== undefined ? isFavorite : userService.isFavorite(movie.id);

  const handleFavoriteClick = () => {
    if (onToggleFavorite) {
      onToggleFavorite(movie.id);
    } else {
      userService.toggleFavorite(movie.id);
    }
  };

  const handleToggleWatchedClick = () => {
    const res = userService.toggleWatched(movie.id);
    setWatched(res);
  };

  const handleSendMovieQuestion = async (customText?: string) => {
    const q = (customText || chatInput).trim();
    if (!q || isLoadingAi || !movie) return;

    const userMsg: MovieInsightMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsLoadingAi(true);

    try {
      const res = await geminiCurationService.askMovieInsights(movie, q);
      const aiMsg: MovieInsightMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: res.text,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          text: `Não consegui carregar detalhes adicionais deste filme no momento. Tente novamente em instantes!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 md:p-10 bg-slate-950/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">
              {movie.title}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono hidden sm:inline">
              {movie.releaseYear}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Já Assistido */}
            <button
              onClick={handleToggleWatchedClick}
              className={`tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                watched
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {watched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{watched ? 'Já Assistido' : 'Marcar como Assistido'}</span>
            </button>

            {/* Favoritar */}
            <button
              onClick={handleFavoriteClick}
              className={`tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isFav
                  ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="hidden sm:inline">{isFav ? 'Salvo' : 'Salvar'}</span>
            </button>

            {/* Perguntar à IA */}
            <button
              onClick={() => onAskSimilar(movie)}
              className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/60 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Ver Semelhantes</span>
            </button>

            {/* Botão Próximo Filme */}
            {nextMovie && onNextMovie && (
              <button
                id="btn-next-movie"
                onClick={onNextMovie}
                className="tv-focusable flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition transform hover:scale-105 active:scale-95 cursor-pointer"
                title={`Passar para o próximo filme: ${nextMovie.title} (${nextMovie.releaseYear})`}
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
                <span>Próximo Filme</span>
              </button>
            )}

            {/* Fechar */}
            <button
              id="btn-close-player"
              onClick={onClose}
              className="tv-focusable p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
              aria-label="Fechar player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Frame Container (16:9) */}
        <div className="relative w-full aspect-video bg-black shadow-inner flex items-center justify-center">
          {movie.source === 'jellyfin' && movie.streamUrl ? (
            <video
              src={movie.streamUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain focus:outline-none"
            >
              Seu navegador não suporta reprodução de vídeo HTML5.
            </video>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${movie.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
              title={movie.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </div>

        {/* Banner do Próximo Filme na Maratona / Fila */}
        {nextMovie && onNextMovie && (
          <div className="mx-6 mt-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                <img src={nextMovie.posterUrl} alt={nextMovie.title} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30">
                    Próximo na Sequência
                  </span>
                  <span className="text-[11px] text-slate-400">{nextMovie.releaseYear} • {nextMovie.durationMinutes}m</span>
                </div>
                <p className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md">{nextMovie.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{(nextMovie.genres || []).join(' • ')}</p>
              </div>
            </div>

            <button
              onClick={onNextMovie}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95 shadow-md cursor-pointer shrink-0"
            >
              <SkipForward className="w-4 h-4 fill-current" />
              <span>Passar para Este Filme</span>
            </button>
          </div>
        )}

        {/* Information & Metadata Bar */}
        <div className="p-6 sm:p-8 space-y-5 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{movie.title}</span>
                {movie.originalTitle && (
                  <span className="text-sm text-slate-500 dark:text-slate-400 italic">({movie.originalTitle})</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> {movie.releaseYear}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> {movie.durationMinutes} minutos
                </span>
                <span className="flex items-center gap-1 text-amber-500 dark:text-amber-300 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {movie.ratingScore} / 10
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {movie.language}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  Classificação: {movie.contentRating}
                </span>
              </div>
            </div>

            {((movie.subgenres && movie.subgenres.length > 0) || (movie.cast && movie.cast.length > 0)) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                {movie.subgenres && movie.subgenres.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Film className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Subgênero: <strong className="text-slate-900 dark:text-white">{movie.subgenres.join(' • ')}</strong></span>
                  </div>
                )}
                {movie.cast && movie.cast.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Elenco: <strong className="text-indigo-950 dark:text-white">{movie.cast.join(', ')}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Synopsis */}
          <div className="space-y-1.5">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Sinopse</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {movie.synopsis}
            </p>
          </div>

          {/* Dica Cinéfila CAIC • Por que vale a pena assistir? */}
          {(() => {
            const tips = getMovieTips(movie);
            return (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-indigo-500/10 border border-amber-400/40 dark:border-amber-500/30 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Dica Cinéfila CAIC • Por que vale a pena assistir?
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tips.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
                      >
                        {h.icon} {h.label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {tips.reason}
                </p>
              </div>
            );
          })()}

          {/* Tags & Genres */}
          <div className="flex flex-wrap gap-2 pt-1">
            {movie.genres.map((g) => (
              <span key={g} className="text-xs px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                {g}
              </span>
            ))}
            {movie.tags.map((t) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                #{t}
              </span>
            ))}
          </div>

          {/* Chat com CAIC sobre o Filme */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Pergunte ao CAIC sobre este Filme</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-300 dark:border-cyan-800">
                      IA & Web
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tire dúvidas sobre fatos reais, bastidores, elenco e críticas especializadas
                  </p>
                </div>
              </div>
            </div>

            {/* Sugestões Rápidas de Perguntas */}
            <div className="flex flex-wrap gap-1.5">
              {[
                '📜 É baseado em fatos reais?',
                '🌟 Quem são os atores principais?',
                '⭐ O que a crítica e o público acharam?',
                '💡 Curiosidades e bastidores da filmagem',
              ].map((pill) => (
                <button
                  key={pill}
                  onClick={() => handleSendMovieQuestion(pill)}
                  disabled={isLoadingAi}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition shadow-2xs disabled:opacity-50"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Histórico de Mensagens */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 text-xs ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-tl-none shadow-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Globe className="w-3 h-3 text-cyan-500" />
                        <span>Fontes: {msg.sources.join(' • ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoadingAi && (
                <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400 p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CAIC pesquisando detalhes e dados na web...</span>
                </div>
              )}
            </div>

            {/* Caixa de Entrada de Pergunta */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMovieQuestion();
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Pergunte algo sobre "${movie.title}"...`}
                className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition shadow-2xs"
              />
              <button
                type="submit"
                disabled={isLoadingAi || !chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {isLoadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Perguntar</span>
              </button>
            </form>
          </div>

          {/* Legal / Free Disclaimer */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Conteúdo licenciado ou em domínio público transmitido pelo player oficial do YouTube em conformidade com as diretrizes de direitos autorais.</span>
          </div>
        </div>

      </div>
    </div>
  );
};
