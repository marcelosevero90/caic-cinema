import React, { useState, useEffect } from 'react';
import {
  X,
  Film,
  CheckCircle2,
  ThumbsUp,
  Loader2,
  Play,
  Send,
  Shield,
} from 'lucide-react';
import { movieRequestService, type MovieRequest } from '../services/movieRequestService';
import { userService } from '../services/userService';
import type { Movie } from '../types/movie';

interface MovieSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onPlayMovie?: (movie: Movie) => void;
}

export const MovieSuggestionModal: React.FC<MovieSuggestionModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onPlayMovie,
}) => {
  const [title, setTitle] = useState(initialQuery);
  const [year, setYear] = useState<string>('');
  const [userNotes, setUserNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'existing';
    text: string;
    movie?: Movie;
  } | null>(null);

  const [communityRequests, setCommunityRequests] = useState<MovieRequest[]>([]);
  const activeProfile = userService.getActiveProfile();

  useEffect(() => {
    if (isOpen) {
      if (initialQuery) setTitle(initialQuery);
      setCommunityRequests(movieRequestService.getAll());
      setResultMessage(null);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const unsub = movieRequestService.subscribe(() => {
      setCommunityRequests(movieRequestService.getAll());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await movieRequestService.submitSuggestion({
        title: title.trim(),
        year: year ? parseInt(year, 10) : undefined,
        userNotes: userNotes.trim() || undefined,
        suggestedBy: activeProfile?.name || 'Usuário CAIC',
      });

      if (res.movie) {
        setResultMessage({
          type: 'existing',
          text: res.message,
          movie: res.movie,
        });
      } else {
        setResultMessage({
          type: 'success',
          text: 'Seu pedido foi registrado com sucesso e encaminhado aos administradores do CAIC para aprovação e inclusão no catálogo!',
        });
      }

      // Limpa os campos após envio bem-sucedido
      setTitle('');
      setYear('');
      setUserNotes('');
    } catch (err) {
      console.error(err);
      setResultMessage({
        type: 'success',
        text: 'Seu pedido foi registrado e encaminhado aos administradores do CAIC!',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = (id: string) => {
    movieRequestService.upvote(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 flex items-center justify-center shadow-md shadow-amber-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-amber-500">
                <Film className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Sugerir / Pedir Filme</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                  CAIC
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Não encontrou um filme? A equipe e os administradores do CAIC avaliam e cadastram para você
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="tv-focusable p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-sm">
          
          {/* Mensagem de Resultado se houver */}
          {resultMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 animate-fadeIn space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs font-medium leading-relaxed">
                  {resultMessage.text}
                </div>
              </div>

              {resultMessage.movie && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={resultMessage.movie.posterUrl}
                      alt={resultMessage.movie.title}
                      className="w-10 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {resultMessage.movie.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {resultMessage.movie.releaseYear} • {resultMessage.movie.durationMinutes} min • {resultMessage.movie.language}
                      </div>
                    </div>
                  </div>

                  {onPlayMovie && (
                    <button
                      onClick={() => {
                        if (resultMessage.movie) {
                          onPlayMovie(resultMessage.movie);
                          onClose();
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Assistir Agora</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Formulário de Pedido */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nome do Filme Desejado *
              </label>
              <div className="relative">
                <Film className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Pânico na Floresta, Matrix, Tubarão 2, O Patriota..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ano de Lançamento (Opcional)
                </label>
                <input
                  type="number"
                  min="1900"
                  max="2030"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Ex: 2003"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Status da Solicitação
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Moderação por Administrador</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Por que você gostaria de assistir? (Opcional)
              </label>
              <textarea
                rows={2}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Ex: É um filme muito bom que assisti antigamente ou indicação de amigos..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                Um administrador fará a validação e inclusão no acervo.
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 flex items-center gap-2 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Consultando IA...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Pedido de Filme</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Lista de Filmes Pedidos pela Comunidade */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>📋 Pedidos Recentes dos Usuários</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {communityRequests.length}
                </span>
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Vote nos que você também quer ver!
              </span>
            </div>

            <div className="space-y-2">
              {communityRequests.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 transition"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {req.title} {req.year && `(${req.year})`}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          req.status === 'added'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {req.status === 'added' ? 'No Catálogo' : 'Aguardando Admin'}
                      </span>
                    </div>
                    {req.userNotes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        "{req.userNotes}" • Por {req.suggestedBy}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleUpvote(req.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex-shrink-0"
                    title="Votar para acelerar a inclusão"
                  >
                    <ThumbsUp className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>{req.upvotes}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
