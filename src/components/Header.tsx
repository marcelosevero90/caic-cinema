import {
  Sparkles,
  Tv,
  Film,
  Heart,
  Smartphone,
  Sun,
  Moon,
  Lightbulb,
  Lock,
  Server,
} from 'lucide-react';
import type { UserProfile, UserAccount } from '../types/movie';

interface HeaderProps {
  onOpenCurator: () => void;
  onOpenProfileModal: () => void;
  onOpenMobileAccess: () => void;
  onOpenMovieSuggestion?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  activeProfile: UserProfile;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onSearchSubmit?: () => void;
  isTvMode: boolean;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  currentAccount?: UserAccount;
}

import { jellyfinService } from '../services/jellyfinService';

export const Header: React.FC<HeaderProps> = ({
  onOpenCurator,
  onOpenProfileModal,
  onOpenMobileAccess,
  onOpenMovieSuggestion,
  isDarkMode,
  onToggleTheme,
  activeProfile,
  isTvMode,
  activeFilter,
  onSelectFilter,
  currentAccount,
}) => {
  const isJfEnabled = jellyfinService.getConfig().enabled;
  const genres = ['Todos', ...(isJfEnabled ? ['Jellyfin'] : []), 'Minha Lista', 'Ação', 'Guerra', 'Drama', 'Comédia', 'Terror', 'Suspense', 'Ficção Científica'];

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3.5">
        
        {/* Logo and Brand */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectFilter('Todos')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Film className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                  CA<span className="bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">IC</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  Cinema & IA
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Plataforma Inteligente</p>
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={onOpenMobileAccess}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold"
              title="Acessar no Celular"
            >
              <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </button>
            <button
              onClick={onOpenProfileModal}
              className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <img
                src={activeProfile.avatar}
                alt={activeProfile.name}
                className="w-7 h-7 rounded-lg object-cover"
              />
            </button>
            {onOpenMovieSuggestion && (
              <button
                onClick={onOpenMovieSuggestion}
                title="Sugerir Filme"
                className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300"
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
              </button>
            )}
            <button
              onClick={onOpenCurator}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-bold shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CAIC</span>
            </button>
          </div>
        </div>

        {/* Quick Genre Filters */}
        <div className="hidden lg:flex items-center gap-1.5">
          {genres.map((g) => {
            const isFavFilter = g === 'Minha Lista';
            const isJellyfinFilter = g === 'Jellyfin';
            const isActive = activeFilter === g;
            const isAuth = currentAccount?.isAuthenticated;

            return (
              <button
                key={g}
                onClick={() => {
                  if (isFavFilter && !isAuth) {
                    onOpenProfileModal();
                    return;
                  }
                  onSelectFilter(g);
                }}
                disabled={isFavFilter && !isAuth}
                className={`tv-focusable text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                  isFavFilter && !isAuth
                    ? 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                    : isActive
                    ? isJellyfinFilter
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500/30 dark:text-indigo-300 border border-indigo-500 shadow-sm'
                      : 'bg-cyan-600 text-white dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-600 dark:border-cyan-400/50 shadow-sm'
                    : isJellyfinFilter
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
                title={isFavFilter && !isAuth ? 'Faça login para ver seus filmes favoritos' : isJellyfinFilter ? 'Filmes transmitidos do servidor Jellyfin' : undefined}
              >
                {isFavFilter && <Heart className={`w-3 h-3 ${isActive ? 'fill-white dark:fill-cyan-300 text-white dark:text-cyan-300' : 'text-rose-500'}`} />}
                {isJellyfinFilter && <Server className="w-3 h-3 text-indigo-500" />}
                <span>{g}</span>
                {isFavFilter && !isAuth && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">

          {/* Botão Sugerir Filme */}
          {onOpenMovieSuggestion && (
            <button
              onClick={onOpenMovieSuggestion}
              title="Pedir ou sugerir um filme para o catálogo"
              className="tv-focusable hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-xs font-semibold transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Sugerir Filme</span>
            </button>
          )}

          {/* Botão Acessar no Celular (QR Code) */}
          <button
            onClick={onOpenMobileAccess}
            title="Acessar no Celular (Mesmo Wi-Fi)"
            className="tv-focusable hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>No Celular</span>
          </button>

          {/* Botão Alternador de Tema Claro / Escuro */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? 'Mudar para Cores Leves (Modo Claro)' : 'Mudar para Modo Escuro'}
            className="tv-focusable p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* TV Box Indicator */}
          <div
            title="Navegação otimizada para controle remoto TV Box (D-Pad)"
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium ${
              isTvMode
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50'
                : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isTvMode ? 'D-Pad' : 'TV Box'}</span>
          </div>

          {/* Desktop CAIC Button */}
          <button
            id="btn-header-curator"
            onClick={onOpenCurator}
            className="tv-focusable hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-bold text-xs tracking-wide shadow-md shadow-cyan-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>CAIC</span>
          </button>

          {/* Netflix/Prime Style Profile & Account Button */}
          <button
            onClick={onOpenProfileModal}
            className={`tv-focusable hidden md:flex items-center gap-2 p-1.5 pl-3 rounded-2xl border transition group cursor-pointer ${
              currentAccount?.isAuthenticated
                ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-cyan-500 shadow-xs'
                : 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400/80 text-cyan-900 dark:text-cyan-200 hover:bg-cyan-100 shadow-sm'
            }`}
            title={currentAccount?.isAuthenticated ? `Conta de ${currentAccount.name} (${currentAccount.plan})` : 'Entrar na Conta / Cadastrar'}
          >
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 leading-tight">
                {currentAccount?.isAuthenticated ? activeProfile.name : 'Entrar'}
              </span>
              <span className="text-[9px] text-slate-500 font-semibold leading-tight">
                {currentAccount?.isAuthenticated ? 'Minha Conta' : 'Criar Conta'}
              </span>
            </div>
            <img
              src={activeProfile.avatar}
              alt={activeProfile.name}
              className="w-7 h-7 rounded-xl object-cover border border-cyan-500/60 shadow-xs"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
