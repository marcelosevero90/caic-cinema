import React, { useState, useMemo, useEffect } from 'react';
import { catalogService } from './services/catalogService';
import { userService } from './services/userService';
import { playbackSessionService } from './services/playbackSessionService';
import type { Movie, UserProfile, UserAccount, ActivePlaybackSession } from './types/movie';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { MovieCard } from './components/MovieCard';
import { YouTubePlayerModal } from './components/YouTubePlayerModal';
import { ConcurrentPlaybackModal } from './components/ConcurrentPlaybackModal';
import { AICuratorDrawer } from './components/AICuratorDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MobileAccessModal } from './components/MobileAccessModal';
import { MovieSuggestionModal } from './components/MovieSuggestionModal';
import { VisitorTrialModal } from './components/VisitorTrialModal';
import { useTvNavigation } from './hooks/useTvNavigation';
import { GENRE_TAXONOMY, FAMOUS_ACTORS, MOOD_OPTIONS } from './data/genreTaxonomy';
import { movieRequestService } from './services/movieRequestService';
import {
  Sparkles,
  CheckCircle,
  Heart,
  RotateCcw,
  ThumbsUp,
  Smartphone,
  Lightbulb,
  Film,
  User,
  Tag,
  X,
  Check,
  Globe,
  Search,
  Mic,
  AlertCircle,
  Server,
  Smile,
} from 'lucide-react';

export const App: React.FC = () => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isCuratorOpen, setIsCuratorOpen] = useState<boolean>(false);
  const [curatorPrompt, setCuratorPrompt] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'account' | 'subscription'>('account');
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isMobileAccessOpen, setIsMobileAccessOpen] = useState<boolean>(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState<boolean>(false);
  const [suggestionInitialQuery, setSuggestionInitialQuery] = useState<string>('');
  const [searchDraft, setSearchDraft] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Controle de Bloqueio de Reprodução para Visitantes (Degustação de 7 Dias)
  const [visitorBlockMovie, setVisitorBlockMovie] = useState<Movie | null>(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState<boolean>(false);

  // Controle de Concorrência de Telas (1 Acesso por Vez)
  const [concurrentBlockedMovie, setConcurrentBlockedMovie] = useState<Movie | null>(null);
  const [activeConcurrentSession, setActiveConcurrentSession] = useState<ActivePlaybackSession | null>(null);
  const [isConcurrentModalOpen, setIsConcurrentModalOpen] = useState<boolean>(false);

  const [activeFilter, setActiveFilter] = useState<string>('Todos');
  const [selectedSubgenre, setSelectedSubgenre] = useState<string | null>(null);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showActorPicker, setShowActorPicker] = useState<boolean>(false);
  const [webSearchNotice, setWebSearchNotice] = useState<string | null>(null);
  const [isFullCatalogView, setIsFullCatalogView] = useState<boolean>(false);

  // Controle do Tema (Padrão: Cores Leves / Light Mode conforme solicitado)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('CINEAI_THEME') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('CINEAI_THEME', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('CINEAI_THEME', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  // Estado reativo do catálogo e do perfil/conta do usuário
  const [catalogVersion, setCatalogVersion] = useState<number>(0);
  const [profileVersion, setProfileVersion] = useState<number>(0);
  const [currentAccount, setCurrentAccount] = useState<UserAccount>(userService.getAccount());
  const [activeProfile, setActiveProfile] = useState<UserProfile>(userService.getActiveProfile());

  useEffect(() => {
    catalogService.syncJellyfinMovies();
    const unsubCatalog = catalogService.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
    const unsubUser = userService.subscribe(() => {
      setCurrentAccount(userService.getAccount());
      setActiveProfile(userService.getActiveProfile());
      setProfileVersion((v) => v + 1);
    });
    return () => {
      unsubCatalog();
      unsubUser();
    };
  }, []);

  // Rota administrativa dedicada via hash (#admin) ou path (/admin)
  useEffect(() => {
    const handleAdminRoute = () => {
      const isHash = window.location.hash === '#admin';
      const isPath = window.location.pathname.replace(/\/+$/, '') === '/admin';
      if (isHash || isPath) {
        setIsAdminOpen(true);
      }
    };
    handleAdminRoute();
    window.addEventListener('hashchange', handleAdminRoute);
    window.addEventListener('popstate', handleAdminRoute);
    return () => {
      window.removeEventListener('hashchange', handleAdminRoute);
      window.removeEventListener('popstate', handleAdminRoute);
    };
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.hash === '#admin' || window.location.pathname.replace(/\/+$/, '') === '/admin') {
      window.history.replaceState(null, '', '/');
    }
  };

  // Hook de navegação por controle remoto de TV Box (D-Pad)
  const { isTvMode } = useTvNavigation(() => {
    if (selectedMovie) {
      setSelectedMovie(null);
    } else if (isCuratorOpen) {
      setIsCuratorOpen(false);
    } else if (isApiKeyModalOpen) {
      setIsApiKeyModalOpen(false);
    } else if (isProfileModalOpen) {
      setIsProfileModalOpen(false);
    } else if (isAdminOpen) {
      handleCloseAdmin();
    } else if (isMobileAccessOpen) {
      setIsMobileAccessOpen(false);
    } else if (isSuggestionModalOpen) {
      setIsSuggestionModalOpen(false);
    }
  });

  const handleOpenSuggestionModal = (query?: string) => {
    setSuggestionInitialQuery(query || searchQuery || '');
    setIsSuggestionModalOpen(true);
  };

  const handleSelectFilter = (filter: string) => {
    setActiveFilter(filter);
    setSelectedSubgenre(null);
    setSelectedActor(null);
    setSelectedMood(null);
    setIsFullCatalogView(false);
    if (filter === 'Todos') {
      setSearchQuery('');
      setSearchDraft('');
    }
  };

  const handleExecuteSearch = (query?: string) => {
    const q = query !== undefined ? query : searchDraft;
    const trimmed = q.trim();
    setSearchQuery(trimmed);
    setSelectedSubgenre(null);
    setSelectedActor(null);
    setSelectedMood(null);
    setIsFullCatalogView(false);
    if (trimmed) {
      setActiveFilter('Todos');
    }
  };

  const handleClearSearch = () => {
    setSearchDraft('');
    setSearchQuery('');
  };

  const handleClearAllFilters = () => {
    setSearchDraft('');
    setSearchQuery('');
    setActiveFilter('Todos');
    setSelectedSubgenre(null);
    setSelectedActor(null);
    setSelectedMood(null);
    setIsFullCatalogView(false);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Reconhecimento de voz não é suportado neste navegador. Use o Google Chrome ou Microsoft Edge.');
      setTimeout(() => setVoiceError(null), 4500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setSearchDraft(transcript);
          setSearchQuery(transcript.trim());
        }
        setIsListeningVoice(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition error:', event.error);
        setIsListeningVoice(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Permissão do microfone negada. Permita o microfone nas configurações do navegador.');
        } else {
          setVoiceError('Não foi possível identificar sua voz. Tente falar novamente mais próximo.');
        }
        setTimeout(() => setVoiceError(null), 4500);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech Recognition error:', err);
      setIsListeningVoice(false);
    }
  };

  const handlePlayMovie = async (movie: Movie) => {
    if (!currentAccount.isAuthenticated) {
      setVisitorBlockMovie(movie);
      setIsVisitorModalOpen(true);
      return;
    }

    // Validação de 1 acesso concorrente por vez (celular vs Box TV vs PC)
    const check = await playbackSessionService.requestPlayback(movie, currentAccount, activeProfile);
    if (!check.allowed) {
      setConcurrentBlockedMovie(movie);
      setActiveConcurrentSession(check.activeSession || null);
      setIsConcurrentModalOpen(true);
      return;
    }

    setSelectedMovie(movie);
  };

  const handleForceTakeoverPlayback = async () => {
    if (!concurrentBlockedMovie) return;
    await playbackSessionService.forceTakeover(concurrentBlockedMovie, currentAccount, activeProfile);
    setIsConcurrentModalOpen(false);
    const target = concurrentBlockedMovie;
    setConcurrentBlockedMovie(null);
    setSelectedMovie(target);
  };

  const allMovies = useMemo(() => catalogService.getAll(), [catalogVersion]);
  const featuredMovies = useMemo(() => catalogService.getFeatured(), [catalogVersion]);
  
  // Rotação dinâmica do filme de sugestão principal (Hero) a cada acesso/recarregamento
  const [heroSeed] = useState<number>(() => Math.floor(Math.random() * 50));
  const heroMovie = useMemo(() => {
    const pool = featuredMovies.length > 0 ? featuredMovies : allMovies;
    if (pool.length === 0) return allMovies[0];
    return pool[heroSeed % pool.length] || allMovies[0];
  }, [featuredMovies, allMovies, heroSeed]);

  // Recomendações personalizadas estilo Netflix / Prime com base no gosto do perfil (rotacionadas dinamicamente com jitter)
  const personalizedRecommendations = useMemo(() => {
    return userService.getPersonalizedRecommendations(allMovies).slice(0, 5);
  }, [allMovies, profileVersion, activeProfile]);

  // Filmes já assistidos pelo usuário (para fileira "Assistir Novamente")
  const watchedMovies = useMemo(() => {
    const watchedIds = new Set(activeProfile.watchedMovieIds || []);
    return allMovies.filter((m) => watchedIds.has(m.id));
  }, [allMovies, activeProfile, profileVersion]);

  // Filtros combinados de busca, gênero, subgênero, ator e humor
  const filteredMovies = useMemo(() => {
    if (activeFilter === 'Minha Lista') {
      const favSet = new Set(activeProfile.favoriteMovieIds);
      let list = allMovies.filter((m) => favSet.has(m.id));
      if (selectedSubgenre) {
        list = list.filter((m) => (m.subgenres || []).includes(selectedSubgenre));
      }
      if (selectedActor) {
        list = list.filter((m) => (m.cast || []).includes(selectedActor));
      }
      return list;
    }

    return catalogService.search({
      query: searchQuery,
      genre: activeFilter === 'Todos' ? undefined : activeFilter,
      subgenre: selectedSubgenre || undefined,
      actor: selectedActor || undefined,
      mood: selectedMood || undefined,
    });
  }, [searchQuery, activeFilter, selectedSubgenre, selectedActor, selectedMood, allMovies, activeProfile, profileVersion]);

  // Banner de destaque dinâmico: reflete buscas e filtros ativos
  const currentHeroMovie = useMemo(() => {
    if ((searchQuery.trim().length > 0 || activeFilter !== 'Todos' || selectedSubgenre || selectedActor || selectedMood) && filteredMovies.length > 0) {
      return filteredMovies[0];
    }
    return heroMovie;
  }, [searchQuery, activeFilter, selectedSubgenre, selectedActor, selectedMood, filteredMovies, heroMovie]);

  const currentHeroBadge = useMemo(() => {
    if (selectedMood) {
      const moodObj = MOOD_OPTIONS.find((m) => m.id === selectedMood);
      return `🎭 Humor: ${moodObj ? `${moodObj.emoji} ${moodObj.label}` : selectedMood}`;
    }
    if (selectedActor) return `🌟 Filmes com ${selectedActor}`;
    if (selectedSubgenre) return `🎭 Subgênero: ${selectedSubgenre}`;
    if (searchQuery.trim().length > 0) return `🔍 Destaque da busca: "${searchQuery}"`;
    if (activeFilter !== 'Todos') return `🌟 Destaque em ${activeFilter}`;
    return 'Destaque Recomendado pelo CAIC';
  }, [searchQuery, activeFilter, selectedSubgenre, selectedActor, selectedMood]);

  // Seções temáticas do novo catálogo oficial
  const actionMovies = useMemo(() => catalogService.getByGenre('Ação'), [catalogVersion]);
  const warMovies = useMemo(() => catalogService.getByGenre('Guerra'), [catalogVersion]);
  const dramaMovies = useMemo(() => catalogService.getByGenre('Drama'), [catalogVersion]);
  const comedyMovies = useMemo(() => catalogService.getByGenre('Comédia'), [catalogVersion]);
  const thrillerMovies = useMemo(() => catalogService.getByGenre('Suspense'), [catalogVersion]);
  const sciFiMovies = useMemo(() => catalogService.getByGenre('Ficção Científica'), [catalogVersion]);
  const horrorMovies = useMemo(() => catalogService.getByGenre('Terror'), [catalogVersion]);
  const jellyfinMovies = useMemo(() => catalogService.getJellyfinMovies(), [catalogVersion]);

  const handleOpenCuratorWithContext = (prompt: string) => {
    setCuratorPrompt(prompt);
    setIsCuratorOpen(true);
  };

  const handleToggleFavorite = (movieId: string) => {
    userService.toggleFavorite(movieId);
    setActiveProfile(userService.getActiveProfile());
    setProfileVersion((v) => v + 1);
  };

  const handleToggleWatched = (movieId: string) => {
    userService.toggleWatched(movieId);
    setActiveProfile(userService.getActiveProfile());
    setProfileVersion((v) => v + 1);
  };

  const availableSubgenres = useMemo(() => {
    if (activeFilter !== 'Todos' && activeFilter !== 'Minha Lista' && GENRE_TAXONOMY[activeFilter]) {
      return GENRE_TAXONOMY[activeFilter];
    }
    return [
      'Comédia Romântica',
      'Comédia Adolescente / Pastelão',
      'Artes Marciais',
      'Guerra & Militar',
      'Terror Sobrenatural & Exorcismo',
      'Drama Histórico & Épico',
      'Drama Bíblico & Fé',
      'Viagem no Tempo & Multiverso',
      'Suspense Psicológico & Tensão',
      'Vikings & Mitologia',
      'Animais & Pets'
    ];
  }, [activeFilter]);

  // Se o usuário pedir busca na web em 2º plano porque não encontrou no catálogo
  const handleTriggerBackgroundWebSearch = async (queryToSearch: string) => {
    if (!queryToSearch.trim()) return;
    try {
      await movieRequestService.submitSuggestion({
        title: queryToSearch,
        userNotes: 'Busca em 2º plano acionada automaticamente pelo usuário pois o filme não estava no acervo local.',
        suggestedBy: activeProfile.name || 'Usuário CAIC'
      });
      setWebSearchNotice(`🔍 O CAIC iniciou a busca de "${queryToSearch}" na Web em 2º plano! Notificamos a moderação e o título será analisado pela equipe.`);
      setTimeout(() => {
        setWebSearchNotice(null);
      }, 8000);
    } catch (err) {
      console.warn('Erro ao acionar busca na web:', err);
    }
  };

  // Recomendações de contingência (fallback) por afinidade de gênero/tema caso a busca retorne 0 itens
  const fallbackMovies = useMemo(() => {
    if (filteredMovies.length > 0) return [];
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      if (q.includes('panico') || q.includes('floresta') || q.includes('terror') || q.includes('medo') || q.includes('morte') || q.includes('zumbi') || q.includes('assassino')) {
        return allMovies.filter((m) => (m.genres || []).includes('Terror') || (m.genres || []).includes('Suspense')).slice(0, 10);
      }
      if (q.includes('amor') || q.includes('romance') || q.includes('comedia') || q.includes('rir') || q.includes('engracado') || q.includes('familia')) {
        return allMovies.filter((m) => (m.genres || []).includes('Comédia') || (m.genres || []).includes('Família & Animação')).slice(0, 10);
      }
      if (q.includes('guerra') || q.includes('luta') || q.includes('tiro') || q.includes('acao') || q.includes('briga') || q.includes('militar') || q.includes('policia')) {
        return allMovies.filter((m) => (m.genres || []).includes('Ação')).slice(0, 10);
      }
      if (q.includes('espaco') || q.includes('alien') || q.includes('futuro') || q.includes('sci-fi') || q.includes('robo') || q.includes('tempo')) {
        return allMovies.filter((m) => (m.genres || []).includes('Ficção Científica')).slice(0, 10);
      }
      if (q.includes('rei') || q.includes('viking') || q.includes('magia') || q.includes('dragao') || q.includes('fantasia') || q.includes('espada')) {
        return allMovies.filter((m) => (m.genres || []).includes('Aventura & Fantasia')).slice(0, 10);
      }
      if (q.includes('deus') || q.includes('biblia') || q.includes('fe') || q.includes('vida') || q.includes('drama') || q.includes('emocionante')) {
        return allMovies.filter((m) => (m.genres || []).includes('Drama')).slice(0, 10);
      }
    }
    if (activeFilter !== 'Todos' && activeFilter !== 'Minha Lista') {
      return allMovies.filter((m) => (m.genres || []).includes(activeFilter)).slice(0, 10);
    }
    return featuredMovies.slice(0, 10);
  }, [filteredMovies.length, searchQuery, activeFilter, allMovies, featuredMovies]);

  const networkMobileUrl = 'http://192.168.0.3:5173/';
  const [externalMobileUrl, setExternalMobileUrl] = useState<string>(() => {
    return localStorage.getItem('CINEAI_EXTERNAL_TUNNEL_URL') || 'https://rosa-reactions-baby-italic.trycloudflare.com';
  });

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white transition-colors">
      {/* Header com Navegação, Perfil, Admin, Celular e Tema */}
      <Header
        onOpenCurator={() => {
          setCuratorPrompt('');
          setIsCuratorOpen(true);
        }}
        onOpenProfileModal={() => {
          setProfileModalInitialTab('account');
          setIsProfileModalOpen(true);
        }}
        onOpenSubscription={() => {
          setProfileModalInitialTab('subscription');
          setIsProfileModalOpen(true);
        }}
        onOpenMobileAccess={() => setIsMobileAccessOpen(true)}
        onOpenMovieSuggestion={() => handleOpenSuggestionModal()}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        activeProfile={activeProfile}
        searchQuery={searchDraft}
        onSearchChange={(q) => setSearchDraft(q)}
        onSearchSubmit={() => handleExecuteSearch()}
        isTvMode={isTvMode}
        activeFilter={activeFilter}
        onSelectFilter={handleSelectFilter}
        currentAccount={currentAccount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        
        {/* BARRA DE BUSCA EM ALTO DESTAQUE EM CIMA DO BANNER COM BUSCA POR VOZ E BOTÃO EFETIVAR */}
        <section className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteSearch();
            }}
            className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 sm:p-2.5 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/20 transition-all hover:border-cyan-400 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/20"
          >
            {/* Ícone de Busca e Input */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Buscar filmes, gêneros, atores ou temas (ex: Guerra, Jackie Chan, Robôs, Medieval)..."
                className="w-full pl-12 pr-12 py-3.5 bg-transparent text-sm sm:text-base text-slate-950 dark:text-white placeholder-slate-400 font-medium focus:outline-none"
              />
              {searchDraft && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Ações: Microfone (Voz) e Botão Buscar */}
            <div className="flex items-center gap-2 px-1">
              {/* Botão de Voz */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`p-3 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                  isListeningVoice
                    ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/40 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title={isListeningVoice ? "Ouvindo... Fale agora!" : "Buscar por voz com microfone"}
              >
                <Mic className={`w-4 h-4 ${isListeningVoice ? 'animate-bounce text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
                <span className="hidden md:inline">{isListeningVoice ? 'Ouvindo...' : 'Falar'}</span>
              </button>

              {/* Botão Efetivar Busca */}
              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>
          </form>

          {/* Toast / Alerta de Erro de Voz */}
          {voiceError && (
            <div className="mt-2 p-2.5 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>{voiceError}</span>
            </div>
          )}

          {/* Feedback de voz ativa */}
          {isListeningVoice && (
            <div className="mt-2 p-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2 animate-pulse">
              <Mic className="w-4 h-4 text-rose-500 animate-spin flex-shrink-0" />
              <span>Ouvindo sua voz com IA... Fale o nome de um filme, ator ou gênero agora!</span>
            </div>
          )}

          {/* SELETOR DE HUMOR NA TELA INICIAL DA PESQUISA */}
          <div className="mt-3.5 p-3 sm:p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Smile className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Escolher por Humor:</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Como você quer se sentir hoje?
                </span>
              </div>
              {selectedMood && (
                <button
                  type="button"
                  onClick={() => setSelectedMood(null)}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar Humor</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedMood(null)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition flex-shrink-0 ${
                  !selectedMood
                    ? 'bg-amber-500 text-white font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Todos os Humores
              </button>

              {MOOD_OPTIONS.map((mood) => {
                const isSelected = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setSelectedMood(isSelected ? null : mood.id)}
                    className={`tv-focusable text-xs px-3 py-1.5 rounded-xl font-semibold transition flex-shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-md shadow-amber-500/25 scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700/60'
                    }`}
                    title={mood.description}
                  >
                    <span className="text-sm">{mood.emoji}</span>
                    <span>{mood.label}</span>
                    {isSelected && <X className="w-3 h-3 ml-0.5 text-white/90" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Banner Hero Cinematográfico Adaptativo à Busca e Filtros */}
        {currentHeroMovie && (
          <HeroBanner
            movie={currentHeroMovie}
            onPlay={(movie) => handlePlayMovie(movie)}
            onOpenCuratorWithContext={handleOpenCuratorWithContext}
            isFavorite={activeProfile.favoriteMovieIds.includes(currentHeroMovie.id)}
            onToggleFavorite={handleToggleFavorite}
            badgeText={currentHeroBadge}
            onRequireAuth={() => {
              setVisitorBlockMovie(currentHeroMovie);
              setIsVisitorModalOpen(true);
            }}
          />
        )}

        {/* Barra do CAIC & Sugestões Conforme Buscas */}
        <div className="mb-6 p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 shadow-md space-y-3.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {searchQuery ? (
                      `Sugestões do CAIC para "${searchQuery}":`
                    ) : currentAccount.isAuthenticated ? (
                      `O que assistir agora, ${activeProfile.name}?`
                    ) : (
                      'Explore o CAIC'
                    )}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-300 dark:border-cyan-800">
                    {searchQuery ? `${filteredMovies.length} encontrados` : (currentAccount.isAuthenticated ? currentAccount.plan : 'Gemini 3.8 Flash')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {searchQuery ? (
                    filteredMovies.length > 0 ? (
                      <>Títulos com temas e elementos alinhados à sua busca. Não achou algum filme específico? Peça no botão <strong>Sugerir Filme</strong>!</>
                    ) : (
                      <>Não localizamos este filme no acervo oficial. Use a <strong>Busca na Web em 2º Plano</strong> para o CAIC localizar opções públicas!</>
                    )
                  ) : currentAccount.isAuthenticated ? (
                    <>Gostos ativos: <span className="font-semibold text-slate-800 dark:text-slate-200">{(activeProfile?.preferredGenres || []).slice(0, 3).join(', ')}</span> • Recomendações personalizadas por humor e estilo.</>
                  ) : (
                    <>Conecte sua conta para salvar filmes ou abra o <strong>CAIC</strong> para recomendações instantâneas!</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Botão Sugerir Filme */}
              <button
                onClick={() => handleOpenSuggestionModal(searchQuery)}
                className="tv-focusable flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-300 dark:border-amber-700/60 flex items-center justify-center gap-1.5 transition"
                title="Sugerir filme para adicionar ao catálogo"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Sugerir Filme</span>
              </button>

              <button
                onClick={() => setIsMobileAccessOpen(true)}
                className="tv-focusable hidden sm:flex px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 items-center justify-center gap-1.5 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Celular</span>
              </button>

              <button
                onClick={() => {
                  setCuratorPrompt(searchQuery ? `Quero recomendações e informações sobre filmes parecidos com "${searchQuery}"` : '');
                  setIsCuratorOpen(true);
                }}
                className="tv-focusable flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-md shadow-cyan-600/20 flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>CAIC IA</span>
              </button>
            </div>
          </div>

          {/* Mini-Fileira de Sugestões Conforme Buscas */}
          {searchQuery && filteredMovies.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex-shrink-0">
                Sugestões da Busca:
              </span>
              {filteredMovies.slice(0, 5).map((sugMovie) => (
                <button
                  key={sugMovie.id}
                  onClick={() => handlePlayMovie(sugMovie)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-slate-200 dark:border-slate-700 text-left transition flex-shrink-0 group"
                >
                  <img
                    src={sugMovie.posterUrl}
                    alt={sugMovie.title}
                    className="w-5 h-7 object-cover rounded shadow-sm"
                  />
                  <div className="max-w-[150px] truncate">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">
                      {sugMovie.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      ★ {sugMovie.ratingScore} • {sugMovie.releaseYear}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notificação de Busca na Web em Segundo Plano */}
        {webSearchNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-700 flex items-center justify-between gap-3 text-cyan-900 dark:text-cyan-100 text-xs shadow-md animate-fade-in">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin flex-shrink-0" />
              <span>{webSearchNotice}</span>
            </div>
            <button
              onClick={() => setWebSearchNotice(null)}
              className="p-1 hover:bg-cyan-200/50 dark:hover:bg-cyan-800 rounded-lg text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BARRA DE FILTROS AVANÇADOS: SUBGÊNEROS & ATORES FAMOSOS */}
        <div className="mb-8 p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          {/* Subgêneros Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-shrink-0">
              <Tag className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Subgêneros{activeFilter !== 'Todos' && activeFilter !== 'Minha Lista' ? ` (${activeFilter})` : ''}:</span>
            </span>

            <button
              onClick={() => setSelectedSubgenre(null)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition flex-shrink-0 ${
                !selectedSubgenre
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos
            </button>

            {availableSubgenres.map((sub) => {
              const isSelected = selectedSubgenre === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubgenre(isSelected ? null : sub)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition flex-shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <span>{sub}</span>
                  {isSelected && <X className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Filtro por Atores Famosos */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-shrink-0">
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span>Atores Famosos:</span>
            </span>

            {/* Dropdown / Botão Seletor de Atores */}
            <div className="relative inline-block">
              <button
                onClick={() => setShowActorPicker((prev) => !prev)}
                className={`text-xs px-3 py-1 rounded-xl border flex items-center gap-1.5 transition ${
                  selectedActor
                    ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{selectedActor ? `Ator: ${selectedActor}` : 'Escolher Ator Famoso...'}</span>
                <span className="text-[10px]">▼</span>
              </button>

              {showActorPicker && (
                <div className="absolute left-0 top-full mt-1.5 w-64 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-1.5 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                    Grandes Nomes do Cinema
                  </div>
                  {FAMOUS_ACTORS.map((act) => {
                    const isSelected = selectedActor === act;
                    return (
                      <button
                        key={act}
                        onClick={() => {
                          setSelectedActor(isSelected ? null : act);
                          setShowActorPicker(false);
                        }}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{act}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chips rápidos dos atores mais populares do acervo */}
            {['Jean-Claude Van Damme', 'Jackie Chan', 'Jet Li', 'Dolph Lundgren', 'Antonio Banderas', 'Russell Crowe'].map((star) => {
              const isSelected = selectedActor === star;
              return (
                <button
                  key={star}
                  onClick={() => setSelectedActor(isSelected ? null : star)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-500 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-amber-600 border border-slate-200 dark:border-slate-700/50'
                  }`}
                >
                  <span>{star}</span>
                  {isSelected && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>
              );
            })}

            {/* Botão Limpar Filtros quando ativo */}
            {(selectedSubgenre || selectedActor || selectedMood) && (
              <button
                onClick={() => {
                  setSelectedSubgenre(null);
                  setSelectedActor(null);
                  setSelectedMood(null);
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-auto flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Resultado de Busca ou Visualização Filtrada */}
        {isFullCatalogView || searchQuery || activeFilter !== 'Todos' || selectedSubgenre || selectedActor || selectedMood ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2 flex-wrap">
                  {isFullCatalogView ? (
                    <>
                      <Film className="w-5 h-5 text-cyan-500" />
                      <span>Catálogo Completo CAIC ({allMovies.length} títulos)</span>
                    </>
                  ) : activeFilter === 'Minha Lista' ? (
                    <>
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Minha Lista de Favoritos ({activeProfile.name})</span>
                    </>
                  ) : activeFilter === 'Jellyfin' ? (
                    <>
                      <Server className="w-4 h-4 text-indigo-500" />
                      <span>Filmes do Servidor Jellyfin</span>
                    </>
                  ) : (
                    <>
                      Resultados {searchQuery && `para "${searchQuery}"`}
                      {activeFilter !== 'Todos' && ` em ${activeFilter}`}
                      {selectedSubgenre && (
                        <span className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold">
                          • {selectedSubgenre}
                        </span>
                      )}
                      {selectedActor && (
                        <span className="text-amber-600 dark:text-amber-400 text-sm font-semibold">
                          • com {selectedActor}
                        </span>
                      )}
                      {selectedMood && (
                        <span className="text-amber-600 dark:text-amber-400 text-sm font-semibold">
                          • Humor: {MOOD_OPTIONS.find((m) => m.id === selectedMood)?.emoji} {MOOD_OPTIONS.find((m) => m.id === selectedMood)?.label}
                        </span>
                      )}
                    </>
                  )}
                </h2>

                {/* Chips com filtros ativos */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {isFullCatalogView && (
                    <button
                      onClick={() => setIsFullCatalogView(false)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-200 transition"
                      title="Voltar aos destaques"
                    >
                      <Film className="w-3 h-3 text-cyan-600" />
                      <span>Exibindo Catálogo Completo</span>
                      <X className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-200 transition"
                      title="Remover busca"
                    >
                      <Search className="w-3 h-3 text-cyan-600" />
                      <span>Busca: "{searchQuery}"</span>
                      <X className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                  {activeFilter !== 'Todos' && (
                    <button
                      onClick={() => setActiveFilter('Todos')}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-200 transition"
                      title="Voltar para Todos os gêneros"
                    >
                      <span>Gênero: {activeFilter}</span>
                      <X className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                  {selectedMood && (
                    <button
                      onClick={() => setSelectedMood(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition"
                      title="Remover filtro de humor"
                    >
                      <Smile className="w-3 h-3 text-amber-500" />
                      <span>Humor: {MOOD_OPTIONS.find((m) => m.id === selectedMood)?.emoji} {MOOD_OPTIONS.find((m) => m.id === selectedMood)?.label}</span>
                      <X className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                  {selectedSubgenre && (
                    <button
                      onClick={() => setSelectedSubgenre(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-200 transition"
                      title="Remover filtro de subgênero"
                    >
                      <span>Subgênero: {selectedSubgenre}</span>
                      <X className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                  {selectedActor && (
                    <button
                      onClick={() => setSelectedActor(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition"
                      title="Remover filtro de ator"
                    >
                      <span>Ator: {selectedActor}</span>
                      <X className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {filteredMovies.length} títulos
                </span>
                <button
                  onClick={handleClearAllFilters}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
                  title="Limpar todos os filtros e voltar para a página inicial"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isFullCatalogView ? 'Voltar aos Destaques' : 'Ver Todos os Filmes'}</span>
                </button>
              </div>
            </div>

            {filteredMovies.length === 0 ? (
              <div className="space-y-8">
                <div className="text-center py-12 px-6 glass-card rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md max-w-2xl mx-auto space-y-4">
                  {activeFilter === 'Minha Lista' ? (
                    <>
                      <Heart className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                      <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">Sua lista de favoritos está vazia.</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Clique no ícone de coração nos filmes para salvar aqui!</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
                        <Film className="w-6 h-6" />
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Não encontramos {searchQuery ? `"${searchQuery}"` : 'filmes'} diretamente no catálogo local.
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                          {searchQuery
                            ? `O título "${searchQuery}" ainda não está catalogado no acervo CAIC. Você pode acionar nosso agente de IA para pesquisar na web em segundo plano, ou conferir as opções por afinidade de gênero logo abaixo!`
                            : 'Nenhum filme corresponde aos filtros combinados selecionados.'}
                        </p>
                      </div>

                      {/* Ações: Busca na Web em 2º Plano ou Sugestão */}
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                        {searchQuery && (
                          <button
                            onClick={() => handleTriggerBackgroundWebSearch(searchQuery)}
                            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 flex items-center gap-2 transition"
                            title="O CAIC buscará fontes públicas na web em segundo plano"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Buscar "{searchQuery}" na Web em 2º Plano (CAIC IA)</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenSuggestionModal(searchQuery)}
                          className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>Sugerir Filme à Equipe</span>
                        </button>

                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setActiveFilter('Todos');
                            setSelectedSubgenre(null);
                            setSelectedActor(null);
                          }}
                          className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
                        >
                          Limpar Filtros
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* SUGESTÕES POR AFINIDADE DE GÊNERO & TEMÁTICA ENQUANTO PROCURA */}
                {fallbackMovies.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          <span>Sugestões do CAIC por Afinidade de Gênero e Temática</span>
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Como não encontramos o título exato, separamos estas opções parecidas com temas afins para você assistir agora:
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">{fallbackMovies.length} sugestões</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {fallbackMovies.map((movie, idx) => (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          onPlay={(m) => handlePlayMovie(m)}
                          index={idx}
                          isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                          onToggleFavorite={handleToggleFavorite}
                          isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                          onToggleWatched={handleToggleWatched}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredMovies.map((movie, idx) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onPlay={(m) => handlePlayMovie(m)}
                    index={idx}
                    isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                    onToggleWatched={handleToggleWatched}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-12">
            
            {/* FILEIRA 1: ASSISTIR NOVAMENTE (FILMES JÁ VISTOS PELO USUÁRIO) */}
            {watchedMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Assistir Novamente</span>
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Filmes que você já assistiu e pode rever a qualquer momento
                    </p>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{watchedMovies.length} títulos já vistos</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {watchedMovies.map((movie, idx) => (
                    <MovieCard
                      key={`watched-${movie.id}`}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={true}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* FILEIRA 2: RECOMENDADOS PARA VOCÊ (IA + HISTÓRICO DE GOSTO) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Recomendados Especialmente para Você, {activeProfile.name}</span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Calculado com base nas suas preferências ({(activeProfile?.preferredGenres || []).join(', ')})
                  </p>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  Ajustar Meu Gosto
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {personalizedRecommendations.map((movie, idx) => (
                  <MovieCard
                    key={`rec-${movie.id}`}
                    movie={movie}
                    onPlay={(m) => handlePlayMovie(m)}
                    index={idx}
                    isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                    onToggleWatched={handleToggleWatched}
                  />
                ))}
              </div>
            </section>

            {/* Seção: Catálogo Geral em Destaque */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                    Catálogo Geral em Destaque
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Filmes gratuitos, de domínio público e licenciados no YouTube</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{allMovies.length} títulos</span>
                  <button
                    onClick={() => {
                      setIsFullCatalogView(true);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver catálogo completo ({allMovies.length}) →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allMovies.slice(0, 20).map((movie, idx) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onPlay={(m) => handlePlayMovie(m)}
                    index={idx}
                    isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                    onToggleWatched={handleToggleWatched}
                  />
                ))}
              </div>
            </section>

            {/* Seção: Servidor Remoto Jellyfin */}
            {jellyfinMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                        <Server className="w-5 h-5 text-indigo-500" />
                        <span>Filmes do Servidor Jellyfin</span>
                      </h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-800">
                        filme.manerostream.com.br
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Filmes transmitidos diretamente do seu acervo remoto Jellyfin
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{jellyfinMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Jellyfin')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({jellyfinMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {jellyfinMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={`jellyfin-${movie.id}`}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seção: Ação & Artes Marciais */}
            {actionMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Ação, Artes Marciais & Tiroteios
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Grandes produções com Jackie Chan, Jet Li e combate tático</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{actionMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Ação')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({actionMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {actionMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seção: Guerra, Batalhas Históricas & Tanques */}
            {warMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Guerra, Batalhas Históricas & Tanques
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Segunda Guerra Mundial, Ardenas, Sobibor e confrontos táticos de blindados</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{warMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Guerra')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({warMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {warMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seção: Dramas & Épicos Históricos */}
            {dramaMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Dramas, Biografias & Épicos Históricos
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Histórias inspiradoras como Chico Xavier, Sobibor e Padre Pio</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{dramaMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Drama')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({dramaMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {dramaMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seção: Comédias & Família */}
            {comedyMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Comédias & Diversão para Toda a Família
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Filmes leves, confusões divertidas e histórias infantis</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{comedyMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Comédia')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({comedyMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {comedyMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seção: Suspense & Investigação */}
            {thrillerMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Suspense, Crime & Cibercultura
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Adrenalina pura, reviravoltas e o submundo dos hackers</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{thrillerMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Suspense')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({thrillerMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {thrillerMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seção: Ficção Científica & Aventuras Fantásticas */}
            {sciFiMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Ficção Científica & Monstros
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Futuros distópicos, batalhas titânicas e animação com Astro Boy</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{sciFiMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Ficção Científica')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({sciFiMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sciFiMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seção: Terror & Sobrenatural */}
            {horrorMovies.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Terror, Slasher & Sobrenatural
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Sustos, monstros e noites sombrias para quem tem coragem</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{horrorMovies.length} títulos</span>
                    <button
                      onClick={() => handleSelectFilter('Terror')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      Ver todos ({horrorMovies.length}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {horrorMovies.slice(0, 20).map((movie, idx) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlay={(m) => handlePlayMovie(m)}
                      index={idx}
                      isFavorite={activeProfile.favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isWatched={(activeProfile.watchedMovieIds || []).includes(movie.id)}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Plataforma CAIC Card */}
            <section className="my-10 p-8 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
              <div className="max-w-2xl space-y-4 relative z-10">
                <span className="text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  Plataforma CAIC
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Cinema &amp; Inteligência Artificial
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  O conteúdo reúne obras legais, gratuitas e públicas integradas perfeitamente ao seu servidor Jellyfin. O assinante conta com o <strong>CAIC</strong> com IA em todos os filmes, busca semântica em tempo real e recomendações personalizadas que economizam horas de procura em Smart TVs, celulares e navegadores.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Plano Mensal: <strong>R$ 19,90/mês (7 Dias Grátis)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Planos Oficiais: <strong>Individual (R$ 5,90/mês ou R$ 19,90/ano)</strong> &bull; <strong>Família (R$ 9,90/mês ou R$ 29,90/ano)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Período Promocional: <strong>7 Dias de Teste Grátis</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Gemini 3.8 Flash: <strong>Alta velocidade e curadoria em tempo real</strong></span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 py-8 px-4 text-center text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CAIC - Streaming Inteligente Multiplataforma (Web, Mobile e Android TV).</p>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 flex-wrap justify-center">
            <span>Powered by Google Gemini 3.8 Flash</span>
            <span>•</span>
            <span>YouTube Official IFrame API</span>
            <span>•</span>
            <span>Pix Dinâmico Seguro (Mercado Pago)</span>
          </div>
        </div>
      </footer>

      {/* Player Modal */}
      <YouTubePlayerModal
        movie={selectedMovie}
        onClose={() => {
          playbackSessionService.stopPlayback();
          setSelectedMovie(null);
        }}
        onAskSimilar={(m) => {
          playbackSessionService.stopPlayback();
          setSelectedMovie(null);
          handleOpenCuratorWithContext(`Gostei do filme '${m.title}' (${m.genres.join(', ')}). Me recomende mais títulos com a mesma pegada!`);
        }}
        isFavorite={selectedMovie ? activeProfile.favoriteMovieIds.includes(selectedMovie.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Ajudante IA Drawer */}
      <AICuratorDrawer
        isOpen={isCuratorOpen}
        onClose={() => setIsCuratorOpen(false)}
        onPlayMovie={(movie) => {
          setIsCuratorOpen(false);
          handlePlayMovie(movie);
        }}
        initialPrompt={curatorPrompt}
        activeProfile={activeProfile}
        onToggleFavorite={handleToggleFavorite}
        onOpenMovieSuggestion={(q) => {
          setIsCuratorOpen(false);
          handleOpenSuggestionModal(q);
        }}
      />

      {/* Modal de Perfis & Preferências do Usuário (Painel da Conta & Quiz) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialTab={profileModalInitialTab}
        onSelectMovie={(movie) => handlePlayMovie(movie)}
        onOpenAdmin={() => {
          window.location.hash = '#admin';
          setIsAdminOpen(true);
        }}
        onAccountChanged={() => {
          setCurrentAccount(userService.getAccount());
          setActiveProfile(userService.getActiveProfile());
          setProfileVersion((v) => v + 1);
        }}
      />

      {/* Painel Administrativo de Gestão do Catálogo */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={handleCloseAdmin}
        onMovieUpdated={() => setCatalogVersion((v) => v + 1)}
        onPreviewMovie={(movie) => {
          handleCloseAdmin();
          handlePlayMovie(movie);
        }}
      />

      {/* Modal de Acesso no Celular (QR Code & Link Externo Seguro) */}
      <MobileAccessModal
        isOpen={isMobileAccessOpen}
        onClose={() => setIsMobileAccessOpen(false)}
        networkUrl={networkMobileUrl}
        externalUrl={externalMobileUrl}
        onUpdateExternalUrl={setExternalMobileUrl}
      />

      {/* Modal da Chave Gemini */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* Modal de Sugestão de Filmes (Busca Web IA & Fila Admin) */}
      <MovieSuggestionModal
        isOpen={isSuggestionModalOpen}
        onClose={() => setIsSuggestionModalOpen(false)}
        initialQuery={suggestionInitialQuery}
        onPlayMovie={(movie) => handlePlayMovie(movie)}
      />

      {/* Modal de Bloqueio para Visitantes (Degustação de 7 Dias Grátis) */}
      <VisitorTrialModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        movie={visitorBlockMovie}
        onOpenRegister={() => {
          setIsVisitorModalOpen(false);
          setIsProfileModalOpen(true);
        }}
        onOpenLogin={() => {
          setIsVisitorModalOpen(false);
          setIsProfileModalOpen(true);
        }}
      />

      {/* Modal de Concorrência Simultânea (1 Acesso por Vez) */}
      <ConcurrentPlaybackModal
        isOpen={isConcurrentModalOpen}
        onClose={() => {
          setIsConcurrentModalOpen(false);
          setConcurrentBlockedMovie(null);
        }}
        targetMovie={concurrentBlockedMovie}
        activeSession={activeConcurrentSession}
        onForceTakeover={handleForceTakeoverPlayback}
      />
    </div>
  );
};

export default App;
