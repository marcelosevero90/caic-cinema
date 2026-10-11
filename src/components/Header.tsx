import React, { useState } from 'react';
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
  MoreVertical,
  Crown,
  X,
} from 'lucide-react';
import type { UserProfile, UserAccount } from '../types/movie';
import { jellyfinService } from '../services/jellyfinService';

interface HeaderProps {
  onOpenCurator: () => void;
  onOpenProfileModal: () => void;
  onOpenMobileAccess: () => void;
  onOpenMovieSuggestion?: () => void;
  onOpenSubscription?: () => void;
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

export const Header: React.FC<HeaderProps> = ({
  onOpenCurator,
  onOpenProfileModal,
  onOpenMobileAccess,
  onOpenMovieSuggestion,
  onOpenSubscription,
  isDarkMode,
  onToggleTheme,
  activeProfile,
  isTvMode,
  activeFilter,
  onSelectFilter,
  currentAccount,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isJfEnabled = jellyfinService.getConfig().enabled;
  const genres = ['Todos', ...(isJfEnabled ? ['Jellyfin'] : []), 'Minha Lista', 'Ação', 'Guerra', 'Drama', 'Comédia', 'Terror', 'Suspense', 'Ficção Científica'];
  const isSubscriberActive = currentAccount?.subscriptionStatus === 'active';

  const handleOpenSub = () => {
    if (onOpenSubscription) {
      onOpenSubscription();
    } else {
      onOpenProfileModal();
    }
  };

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Top bar on Mobile / Left brand on Desktop */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Logo compact on mobile */}
          <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer" onClick={() => onSelectFilter('Todos')}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Film className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-950 dark:text-white leading-none">
                  CA<span className="bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">IC</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  Cinema & IA
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-600 dark:text-slate-400 font-medium">Plataforma Inteligente</p>
            </div>
          </div>

          {/* Mobile Actions: Clean, well-spaced, essential buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:hidden">
            {/* Botão de Assinar / Pagamento Pix em destaque */}
            {!isSubscriberActive && (
              <button
                onClick={handleOpenSub}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-sm shadow-amber-500/25 active:scale-95 transition"
                title="Assinar Planos Pix"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>Assinar</span>
              </button>
            )}

            {/* Botão do CAIC Assistente IA */}
            <button
              onClick={onOpenCurator}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-black shadow-md shadow-cyan-600/20 active:scale-95 transition"
              title="Abrir Assistente CAIC"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CAIC</span>
            </button>

            {/* Botão da Conta do Usuário (Avatar com toque fácil) */}
            <button
              onClick={onOpenProfileModal}
              className="p-0.5 rounded-xl border-2 border-cyan-500 shadow-sm active:scale-95 transition"
              title={currentAccount?.isAuthenticated ? `Conta: ${activeProfile.name}` : 'Entrar na Conta'}
            >
              <img
                src={activeProfile.avatar}
                alt={activeProfile.name}
                className="w-8 h-8 rounded-[10px] object-cover"
              />
            </button>

            {/* Botão '...' para Mais Opções */}
            <div className="relative">
              <button
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={`p-2 rounded-xl border transition ${
                  isMobileMenuOpen
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
                title="Mais opções do menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu Mobile */}
              {isMobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Menu Rápido</span>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onToggleTheme();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                      {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                      <span>{isDarkMode ? 'Modo Claro (Cores Leves)' : 'Modo Escuro'}</span>
                    </button>

                    {onOpenMovieSuggestion && (
                      <button
                        onClick={() => {
                          onOpenMovieSuggestion();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition"
                      >
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span>Sugerir / Pedir Filme</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onOpenMobileAccess();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                      <Smartphone className="w-4 h-4 text-cyan-500" />
                      <span>Acessar no Celular (QR Code)</span>
                    </button>

                    <button
                      onClick={() => {
                        handleOpenSub();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition border-t border-slate-100 dark:border-slate-800"
                    >
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>Planos &amp; Assinatura Pix</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Genre Filters (Desktop & Tablet) */}
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

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2 justify-end">
          {/* Botão de Assinar em destaque para quem ainda não é assinante */}
          {!isSubscriberActive && (
            <button
              onClick={handleOpenSub}
              className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition"
              title="Assinar com Pix"
            >
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              <span>Assinar Plano Pix</span>
            </button>
          )}

          {/* Botão Sugerir Filme */}
          {onOpenMovieSuggestion && (
            <button
              onClick={onOpenMovieSuggestion}
              title="Pedir ou sugerir um filme para o catálogo"
              className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-xs font-semibold transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Sugerir Filme</span>
            </button>
          )}

          {/* Botão Acessar no Celular */}
          <button
            onClick={onOpenMobileAccess}
            title="Acessar no Celular (Mesmo Wi-Fi)"
            className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>No Celular</span>
          </button>

          {/* Botão Alternador de Tema */}
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
            className="tv-focusable flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-bold text-xs tracking-wide shadow-md shadow-cyan-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>CAIC</span>
          </button>

          {/* Profile & Account Button */}
          <button
            onClick={onOpenProfileModal}
            className={`tv-focusable flex items-center gap-2 p-1.5 pl-3 rounded-2xl border transition group cursor-pointer ${
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
