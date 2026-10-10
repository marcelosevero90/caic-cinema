import React from 'react';
import { X, Tv, Smartphone, Monitor, ShieldAlert, ArrowRight, Play } from 'lucide-react';
import type { ActivePlaybackSession, Movie } from '../types/movie';

interface ConcurrentPlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMovie: Movie | null;
  activeSession: ActivePlaybackSession | null;
  onForceTakeover: () => void;
}

export const ConcurrentPlaybackModal: React.FC<ConcurrentPlaybackModalProps> = ({
  isOpen,
  onClose,
  targetMovie,
  activeSession,
  onForceTakeover,
}) => {
  if (!isOpen) return null;

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'tv':
        return <Tv className="w-5 h-5 text-amber-500" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-cyan-500" />;
      default:
        return <Monitor className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header com Ícone de Alerta */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex-shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white leading-snug">
              Limite de 1 Acesso Simultâneo
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Sua conta no CAIC possui proteção de <strong>1 tela por vez</strong>. No momento, outro aparelho já está reproduzindo um filme.
            </p>
          </div>
        </div>

        {/* Card do Aparelho Ativo */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Aparelho em reprodução agora:
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse">
              Em Uso
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800">
              {getDeviceIcon(activeSession?.deviceType)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {activeSession?.deviceName || 'Outro Dispositivo (Celular / TV Box)'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Assistindo: <strong className="text-slate-800 dark:text-slate-200">{activeSession?.movieTitle || 'Filme do Catálogo'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Filme que você quer assistir agora */}
        {targetMovie && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Play className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">Você tentou abrir:</span>
              <strong className="text-slate-900 dark:text-white truncate">{targetMovie.title}</strong>
            </div>
          </div>
        )}

        {/* Informação explicativa */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Para assistir neste aparelho, você pode pausar no outro dispositivo ou clicar em <strong>"Desconectar e Assistir Aqui"</strong> para transferir a reprodução imediatamente.
        </p>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition text-center"
          >
            Voltar ao Catálogo
          </button>

          <button
            type="button"
            onClick={onForceTakeover}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-600/25 transition flex items-center justify-center gap-1.5"
          >
            <span>Desconectar e Assistir Aqui</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
