import React from 'react';
import {
  X,
  Sparkles,
  Lock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Star,
} from 'lucide-react';
import type { Movie } from '../types/movie';

interface VisitorTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie | null;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export const VisitorTrialModal: React.FC<VisitorTrialModalProps> = ({
  isOpen,
  onClose,
  movie,
  onOpenRegister,
  onOpenLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Banner com Imagem do Filme que tentou assistir */}
        {movie && (
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-950">
            <img
              src={movie.backdropUrl || movie.posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover opacity-60 filter blur-[1px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-slate-950/40 to-transparent" />
            
            {/* Tag de Bloqueio Visitante */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-lg">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Acesso Exclusivo para Membros</span>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-950 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mini Card do Filme */}
            <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3 z-10">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-16 h-22 object-cover rounded-xl shadow-xl border-2 border-white/20 flex-shrink-0"
              />
              <div className="min-w-0 pb-1">
                <h4 className="font-extrabold text-white text-base sm:text-lg leading-tight drop-shadow truncate">
                  {movie.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-200 mt-1">
                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                    <Star className="w-3 h-3 fill-amber-300" /> {movie.ratingScore}
                  </span>
                  <span>•</span>
                  <span>{movie.releaseYear}</span>
                  <span>•</span>
                  <span>{movie.durationMinutes} min</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>7 Dias Grátis de Degustação</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              Crie sua Conta para Assistir a este Filme
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Você pode navegar livremente por todo o acervo do <strong>CAIC</strong>! Para dar play, salvar filmes na sua lista e conversar com a IA, ative seu teste gratuito de 7 dias sem cobrança imediata.
            </p>
          </div>

          {/* Vantagens dos 7 Dias */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Acesso ilimitado a todo o catálogo de filmes em alta resolução</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Chat inteligente durante a reprodução com Gemini 3.8 Flash</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Validação segura de e-mail e cancelamento a qualquer momento</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-600/25 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Criar Conta &amp; Iniciar 7 Dias Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="w-full py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2"
            >
              <span>Já possui uma conta? Fazer Login</span>
            </button>

            <div className="text-center pt-1">
              <button
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold underline transition"
              >
                Continuar apenas navegando pelo catálogo
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
