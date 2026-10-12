import React, { useState } from 'react';
import {
  Sparkles,
  Tv,
  Heart,
  Smartphone,
  Lightbulb,
  Lock,
  Server,
  MoreVertical,
  Crown,
  X,
  ChevronDown,
  Film,
  Check,
} from 'lucide-react';
import type { UserProfile, UserAccount } from '../types/movie';
import { jellyfinService } from '../services/jellyfinService';

interface HeaderProps {
  onOpenCurator: () => void;
  onOpenProfileModal: () => void;
  onOpenMobileAccess: () => void;
  onOpenMovieSuggestion?: () => void;
  onOpenSubscription?: () => void;
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
  activeProfile,
  isTvMode,
  activeFilter,
  onSelectFilter,
  currentAccount,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const isJfEnabled = jellyfinService.getConfig().enabled;
  const genres = ['Todos', '🍿 Sessão Cinema', ...(isJfEnabled ? ['Jellyfin'] : []), 'Minha Lista', 'Ação', 'Guerra', 'Drama', 'Comédia', 'Terror', 'Suspense', 'Ficção Científica'];
  const isSubscriberActive = currentAccount?.subscriptionStatus === 'active';

  const handleOpenSub = () => {
    if (onOpenSubscription) {
      onOpenSubscription();
    } else {
      onOpenProfileModal();
    }
  };

  const renderCategoryDropdown = (buttonId: string) => (
    <div className="relative shrink-0">
      <button
        id={buttonId}
        onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
        className="tv-focusable flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
        title="Abrir menu de categorias de filmes"
      >
        <Film className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="truncate max-w-[100px] sm:max-w-[150px]">
          {activeFilter === 'Todos' ? 'Categorias' : activeFilter}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isCategoryMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsCategoryMenuOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-60 max-h-[75vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-amber-500" />
                Gêneros & Categorias
              </span>
              <button
                onClick={() => setIsCategoryMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {genres.map((g) => {
              const isFavFilter = g === 'Minha Lista';
              const isJellyfinFilter = g === 'Jellyfin';
              const isActive = activeFilter === g;
              const isAuth = currentAccount?.isAuthenticated;

              return (
                <button
                  key={`cat-menu-${buttonId}-${g}`}
                  onClick={() => {
                    if (isFavFilter && !isAuth) {
                      onOpenProfileModal();
                    } else {
                      onSelectFilter(g);
                    }
                    setIsCategoryMenuOpen(false);
                  }}
                  disabled={isFavFilter && !isAuth}
                  className={`tv-focusable w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    isFavFilter && !isAuth
                      ? 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                      : isActive
                      ? 'bg-cyan-600 text-white font-bold shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isFavFilter && <Heart className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : 'text-rose-500'}`} />}
                    {isJellyfinFilter && <Server className="w-3.5 h-3.5 text-indigo-400" />}
                    {!isFavFilter && !isJellyfinFilter && <Film className="w-3 h-3 text-slate-400" />}
                    <span className="truncate">{g}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-white shrink-0" />}
                  {isFavFilter && !isAuth && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 md:px-8 py-2 sm:py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
        
        {/* Top bar on Mobile / Left brand on Desktop */}
        <div className="flex items-center justify-between w-full md:w-auto shrink-0 gap-2">
          {/* Logo brand */}
          <div
            className="flex items-center cursor-pointer group shrink-0"
            onClick={() => onSelectFilter('Todos')}
            title="Ir para o início"
          >
            <img
              src="/caic-banner-cropped.png"
              alt="CAIC"
              className="h-8 sm:h-9 md:h-10 w-auto object-contain rounded-lg shadow-sm border border-red-950/40 group-hover:scale-105 transition-transform"
            />
          </div>

          {/* Menu Suspenso de Categorias no Desktop (ao lado da logo) */}
          <div className="hidden md:block">
            {renderCategoryDropdown('btn-category-dropdown-desktop')}
          </div>

          {/* Mobile Actions: Clean, well-spaced, essential buttons */}
          <div className="flex items-center gap-2 md:hidden shrink-0">
            {/* Botão de Assinar em destaque para não-assinantes */}
            {!isSubscriberActive && (
              <button
                onClick={handleOpenSub}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-sm shadow-amber-500/25 active:scale-95 transition"
                title="Assinar Planos Pix"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>Assinar</span>
              </button>
            )}

            {/* Botão do CAIC Assistente IA */}
            <button
              onClick={onOpenCurator}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-black shadow-md shadow-cyan-600/20 active:scale-95 transition"
              title="Abrir Assistente CAIC"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CAIC</span>
            </button>

            {/* Botão da Conta do Usuário (Avatar com toque fácil e tamanho pleno) */}
            <button
              onClick={onOpenProfileModal}
              className="shrink-0 p-0.5 rounded-xl border-2 border-cyan-500 shadow-md active:scale-95 transition bg-slate-900 cursor-pointer flex items-center justify-center"
              title={currentAccount?.isAuthenticated ? `Conta: ${activeProfile.name}` : 'Entrar na Conta'}
            >
              <img
                src={activeProfile.avatar}
                alt={activeProfile.name}
                className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-[10px] object-cover shrink-0 block"
              />
            </button>

            {/* Botão '...' para Mais Opções */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={`p-2 rounded-xl border transition cursor-pointer ${
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
                        setIsCategoryMenuOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Film className="w-4 h-4 text-amber-500" />
                        <span>Categorias de Filmes</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                        {activeFilter}
                      </span>
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

        {/* Sub-barra Mobile: Categorias, Sessão Cinema e Minha Lista */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full md:hidden pt-0.5 pb-0.5">
          {renderCategoryDropdown('btn-category-dropdown-mobile')}

          {['🍿 Sessão Cinema', 'Minha Lista'].map((g) => {
            const isFavFilter = g === 'Minha Lista';
            const isActive = activeFilter === g;
            const isAuth = currentAccount?.isAuthenticated;

            return (
              <button
                key={`mob-sub-${g}`}
                onClick={() => {
                  if (isFavFilter && !isAuth) {
                    onOpenProfileModal();
                    return;
                  }
                  onSelectFilter(g);
                }}
                disabled={isFavFilter && !isAuth}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  isFavFilter && !isAuth
                    ? 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                    : isActive
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/20 border border-cyan-500'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
                }`}
                title={isFavFilter && !isAuth ? 'Faça login para ver seus filmes favoritos' : undefined}
              >
                {isFavFilter && <Heart className={`w-3.5 h-3.5 ${isActive ? 'fill-white text-white' : 'text-rose-500'}`} />}
                <span>{g}</span>
                {isFavFilter && !isAuth && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </button>
            );
          })}
        </div>

        {/* Quick Filters no Desktop: Apenas 'Sessão Cinema' e 'Minha Lista' */}
        <div className="hidden lg:flex items-center gap-2 flex-nowrap min-w-0 px-2 shrink">
          {['🍿 Sessão Cinema', 'Minha Lista'].map((g) => {
            const isFavFilter = g === 'Minha Lista';
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
                className={`tv-focusable shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  isFavFilter && !isAuth
                    ? 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                    : isActive
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/20 border border-cyan-500'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
                }`}
                title={isFavFilter && !isAuth ? 'Faça login para ver seus filmes favoritos' : undefined}
              >
                {isFavFilter && <Heart className={`w-3.5 h-3.5 ${isActive ? 'fill-white text-white' : 'text-rose-500'}`} />}
                <span>{g}</span>
                {isFavFilter && !isAuth && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </button>
            );
          })}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2 justify-end shrink-0">
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

          {/* Menu Suspenso Mais Opções (Sugerir Filme, No Celular, D-Pad) */}
          <div className="relative">
            <button
              onClick={() => setIsDesktopMenuOpen((prev) => !prev)}
              className={`tv-focusable flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isDesktopMenuOpen
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Mais ferramentas e opções"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
              <span>Mais</span>
            </button>

            {isDesktopMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDesktopMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Ferramentas & Acesso</span>
                    <button
                      onClick={() => setIsDesktopMenuOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {onOpenMovieSuggestion && (
                    <button
                      onClick={() => {
                        onOpenMovieSuggestion();
                        setIsDesktopMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>Sugerir Filme</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onOpenMobileAccess();
                      setIsDesktopMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-cyan-500" />
                    <span>Acessar no Celular</span>
                  </button>

                  <div className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-500" />
                      <span>Controle TV (D-Pad)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-bold">
                      {isTvMode ? 'Ativo' : 'TV Box'}
                    </span>
                  </div>
                </div>
              </>
            )}
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
