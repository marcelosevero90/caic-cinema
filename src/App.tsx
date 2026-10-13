import React, { useState, useMemo, useEffect } from 'react';
import { catalogService } from './services/catalogService';
import { userService } from './services/userService';
import { playbackSessionService } from './services/playbackSessionService';
import type { Movie, UserProfile, UserAccount, ActivePlaybackSession } from './types/movie';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { MovieCard } from './components/MovieCard';
import { MovieRow } from './components/MovieRow';
import { YouTubePlayerModal } from './components/YouTubePlayerModal';
import { ConcurrentPlaybackModal } from './components/ConcurrentPlaybackModal';
import { AICuratorDrawer } from './components/AICuratorDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MobileAccessModal } from './components/MobileAccessModal';
import { MovieSuggestionModal } from './components/MovieSuggestionModal';
import { VisitorTrialModal } from './components/VisitorTrialModal';
import { CinemaSessionSection } from './components/CinemaSessionSection';
import { CinemaSessionsDirectory } from './components/CinemaSessionsDirectory';
import { cinemaSessionService } from './services/cinemaSessionService';
import { supportConfigService, type SupportConfig } from './services/supportConfigService';
import type { CinemaSession } from './types/cinemaSession';
import { useTvNavigation } from './hooks/useTvNavigation';
import { GENRE_TAXONOMY, FAMOUS_ACTORS, MOOD_OPTIONS } from './data/genreTaxonomy';
import { movieRequestService } from './services/movieRequestService';
import {
  Sparkles,
  CheckCircle,
  Heart,
  RotateCcw,
  ThumbsUp,
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
  Headphones,
  MessageCircle,
  Mail,
  Flame,
  Swords,
  Monitor,
  Smartphone,
  Tv,
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
  const [visibleCount, setVisibleCount] = useState<number>(30);

  // Reseta paginação quando a categoria ou busca mudar
  useEffect(() => {
    setVisibleCount(30);
  }, [activeFilter, searchQuery, selectedSubgenre, selectedActor, selectedMood]);

  // Tema cinematográfico escuro fixo permanente
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('CINEAI_THEME', 'dark');
  }, []);

  // Estado reativo do catálogo e do perfil/conta do usuário
  const [catalogVersion, setCatalogVersion] = useState<number>(0);
  const [profileVersion, setProfileVersion] = useState<number>(0);
  const [currentAccount, setCurrentAccount] = useState<UserAccount>(userService.getAccount());
  const [activeProfile, setActiveProfile] = useState<UserProfile>(userService.getActiveProfile());
  const [cinemaSession, setCinemaSession] = useState<CinemaSession>(() => cinemaSessionService.getActiveSession());
  const [supportConfig, setSupportConfig] = useState<SupportConfig>(() => supportConfigService.getConfig());

  useEffect(() => {
    catalogService.syncJellyfinMovies();
    userService.syncSubscriptionFromMercadoPago();
    const unsubCatalog = catalogService.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
    const unsubUser = userService.subscribe(() => {
      setCurrentAccount(userService.getAccount());
      setActiveProfile(userService.getActiveProfile());
      setProfileVersion((v) => v + 1);
    });
    const unsubSession = cinemaSessionService.subscribe(() => {
      setCinemaSession(cinemaSessionService.getActiveSession());
    });
    const unsubSupport = supportConfigService.subscribe((cfg) => {
      setSupportConfig(cfg);
    });
    return () => {
      unsubCatalog();
      unsubUser();
      unsubSession();
      unsubSupport();
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

  const [marathonQueue, setMarathonQueue] = useState<Movie[]>([]);

  const handlePlayMovie = async (movie: Movie, queue?: Movie[]) => {
    if (queue && queue.length > 0) {
      setMarathonQueue(queue);
    }

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
  
  // Filmes da Sessão Cinema Temática Atual (Velozes & Furiosos, Jackie Chan, Natal, etc.)
  const cinemaSessionMovies = useMemo(() => {
    return cinemaSessionService.getResolvedMovies(cinemaSession, allMovies);
  }, [cinemaSession, allMovies]);
  
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

  // Filmes já assistidos pelo usuário (para fileira "Assistir Novamente" - exclui filmes removidos do catálogo)
  const watchedMovies = useMemo(() => {
    const catalogMap = new Map(allMovies.map((m) => [m.id, m]));
    const validWatchedIds = (activeProfile.watchedMovieIds || []).filter((id) => catalogMap.has(id));
    return validWatchedIds.map((id) => catalogMap.get(id)!).filter(Boolean);
  }, [allMovies, activeProfile, profileVersion]);

  // Purga automática: garante que nenhum filme deletado continue registrado nas listas do usuário
  useEffect(() => {
    if (allMovies.length > 0 && activeProfile) {
      const allIds = new Set(allMovies.map((m) => m.id));
      const hasStaleWatched = (activeProfile.watchedMovieIds || []).some((id) => !allIds.has(id));
      const hasStaleFav = (activeProfile.favoriteMovieIds || []).some((id) => !allIds.has(id));
      const hasStaleHist = (activeProfile.watchHistory || []).some((h) => !allIds.has(h.movieId));
      if (hasStaleWatched || hasStaleFav || hasStaleHist) {
        userService.cleanupNonExistentMovies(allIds);
      }
    }
  }, [allMovies, activeProfile]);

  // Filmes mais recentes que entraram no catálogo (Lançamentos e Novidades)
  const recentReleases = useMemo(() => {
    return catalogService.getRecentReleases();
  }, [allMovies, catalogVersion]);

  // Filtros combinados de busca, gênero, subgênero, ator e humor
  const filteredMovies = useMemo(() => {
    if (activeFilter === '🍿 Sessão Cinema') {
      return cinemaSessionMovies;
    }

    if (activeFilter === '🔥 Lançamentos' || activeFilter === 'Lançamentos') {
      let list = recentReleases;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter((m) =>
          m.title.toLowerCase().includes(q) ||
          m.synopsis.toLowerCase().includes(q) ||
          (m.genres || []).some((g) => g.toLowerCase().includes(q))
        );
      }
      if (selectedSubgenre) {
        list = list.filter((m) => (m.subgenres || []).includes(selectedSubgenre));
      }
      if (selectedActor) {
        list = list.filter((m) => (m.cast || []).includes(selectedActor));
      }
      if (selectedMood) {
        list = list.filter((m) => (m.moods || []).includes(selectedMood));
      }
      return list;
    }

    if (activeFilter === 'Minha Lista') {
      const catalogMap = new Map(allMovies.map((m) => [m.id, m]));
      const validFavIds = (activeProfile.favoriteMovieIds || []).filter((id) => catalogMap.has(id));
      let list = validFavIds.map((id) => catalogMap.get(id)!).filter(Boolean);
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
  }, [searchQuery, activeFilter, selectedSubgenre, selectedActor, selectedMood, allMovies, recentReleases, cinemaSessionMovies, activeProfile]);

  // Paginação progressiva rápida: renderiza inicialmente 30 itens para fluidez máxima
  const displayedMovies = useMemo(() => {
    return filteredMovies.slice(0, visibleCount);
  }, [filteredMovies, visibleCount]);

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
    if (activeFilter === '🔥 Lançamentos' || activeFilter === 'Lançamentos') return '🔥 Recém-Adicionado ao Catálogo';
    if (activeFilter === '🍿 Sessão Cinema') return `🍿 ${cinemaSession.title} (${cinemaSession.dateBadge})`;
    if (activeFilter !== 'Todos') return `🌟 Destaque em ${activeFilter}`;
    return 'Destaque Recomendado pelo CAIC';
  }, [searchQuery, activeFilter, selectedSubgenre, selectedActor, selectedMood, cinemaSession]);

  // Próximo filme para maratona da Sessão Cinema ou fila de reprodução sequencial
  const nextMovie = useMemo(() => {
    if (!selectedMovie) return null;

    // 0. Se há fila de maratona ativa da Sessão Cinema selecionada
    if (marathonQueue.length > 0) {
      const qIdx = marathonQueue.findIndex((m) => m.id === selectedMovie.id);
      if (qIdx !== -1 && qIdx < marathonQueue.length - 1) {
        return marathonQueue[qIdx + 1];
      }
    }

    // 1. Se o filme está na Sessão Cinema Especial
    if (cinemaSession?.active && cinemaSessionMovies.length > 0) {
      const idx = cinemaSessionMovies.findIndex((m) => m.id === selectedMovie.id);
      if (idx !== -1 && idx < cinemaSessionMovies.length - 1) {
        return cinemaSessionMovies[idx + 1];
      }
    }

    // 2. Se há filtro ou busca ativa
    if (filteredMovies.length > 0) {
      const idx = filteredMovies.findIndex((m) => m.id === selectedMovie.id);
      if (idx !== -1 && idx < filteredMovies.length - 1) {
        return filteredMovies[idx + 1];
      }
    }

    // 3. Catálogo geral
    const allIdx = allMovies.findIndex((m) => m.id === selectedMovie.id);
    if (allIdx !== -1 && allIdx < allMovies.length - 1) {
      return allMovies[allIdx + 1];
    }

    return null;
  }, [selectedMovie, marathonQueue, cinemaSession, cinemaSessionMovies, filteredMovies, allMovies]);

  const handlePlayNextMovie = () => {
    if (nextMovie) {
      handlePlayMovie(nextMovie);
    }
  };

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
        onOpenMovieSuggestion={() => handleOpenSuggestionModal()}

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
                id="main-search-input"
                type="text"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Buscar filmes, gêneros, atores ou temas (ex: Guerra, Jackie Chan, Robôs, Medieval)..."
                className="tv-focusable w-full pl-12 pr-12 py-3.5 bg-transparent text-sm sm:text-base text-slate-950 dark:text-white placeholder-slate-400 font-medium focus:outline-none rounded-2xl"
              />
              {searchDraft && (
                <button
                  id="btn-clear-search"
                  type="button"
                  onClick={handleClearSearch}
                  className="tv-focusable absolute right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
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
                id="btn-voice-search"
                type="button"
                onClick={handleVoiceSearch}
                className={`tv-focusable p-3 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
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
                id="btn-submit-search"
                type="submit"
                className="tv-focusable px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer"
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
                  ) : activeFilter === '🔥 Lançamentos' || activeFilter === 'Lançamentos' ? (
                    <>
                      <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
                      <span>Lançamentos & Filmes Recentes no Catálogo</span>
                    </>
                  ) : activeFilter === 'Minha Lista' ? (
                    <>
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Minha Lista de Favoritos ({activeProfile.name})</span>
                    </>
                  ) : activeFilter === '🍿 Sessão Cinema' ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Sessão Cinema CAIC — Maratonas Temáticas</span>
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
                  {activeFilter === '🍿 Sessão Cinema' ? `${cinemaSessionService.getAllSessions().length} edições temáticas` : `${filteredMovies.length} títulos`}
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

            {activeFilter === '🍿 Sessão Cinema' ? (
              <CinemaSessionsDirectory
                sessions={cinemaSessionService.getAllSessions()}
                activeSession={cinemaSession}
                catalog={allMovies}
                onPlayMovie={(movie, queue) => handlePlayMovie(movie, queue)}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
              />
            ) : filteredMovies.length === 0 ? (
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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {displayedMovies.map((movie, idx) => (
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

                {visibleCount < filteredMovies.length && (
                  <div className="flex justify-center pt-8 pb-4">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 30)}
                      className="tv-focusable px-6 py-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500 text-cyan-400 font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <span>Carregar Mais Filmes (+30)</span>
                      <span className="text-xs text-slate-400">({displayedMovies.length} de {filteredMovies.length})</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          <div className="space-y-12">
            
            {/* SESSÃO CINEMA ESPECIAL (MARATONA TEMÁTICA COM PROGRAMAÇÃO ATUALIZÁVEL) */}
            <CinemaSessionSection
              session={cinemaSession}
              movies={cinemaSessionMovies}
              onPlayMovie={(m) => handlePlayMovie(m, cinemaSessionMovies)}
              isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
              onToggleFavorite={handleToggleFavorite}
              isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
              onToggleWatched={handleToggleWatched}
              onSeeAllSessions={() => {
                setActiveFilter('🍿 Sessão Cinema');
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
            />

            {/* FILEIRA 1: ASSISTIR NOVAMENTE (FILMES JÁ VISTOS PELO USUÁRIO) */}
            {watchedMovies.length > 0 && (
              <MovieRow
                rowId="row-watched"
                title="Assistir Novamente"
                subtitle="Filmes que você já assistiu e pode rever a qualquer momento"
                icon={<RotateCcw className="w-5 h-5 text-emerald-500" />}
                movies={watchedMovies}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={() => true}
                onToggleWatched={handleToggleWatched}
                badge={`${watchedMovies.length} títulos`}
              />
            )}

            {/* FILEIRA: LANÇAMENTOS & RECÉM-CHEGADOS AO CATÁLOGO */}
            <MovieRow
              rowId="row-recent-releases"
              title="Lançamentos & Recém-Chegados"
              subtitle="Os filmes e novidades mais recentes adicionados ao catálogo CAIC"
              icon={<Flame className="w-5 h-5 text-rose-500 fill-rose-500" />}
              movies={recentReleases.slice(0, 30)}
              onPlayMovie={handlePlayMovie}
              isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
              onToggleFavorite={handleToggleFavorite}
              isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
              onToggleWatched={handleToggleWatched}
              onSeeAll={() => {
                setActiveFilter('🔥 Lançamentos');
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              seeAllText="Ver Todos os Lançamentos"
              badge={`${recentReleases.length} títulos`}
            />

            {/* FILEIRA 2: RECOMENDADOS PARA VOCÊ (IA + HISTÓRICO DE GOSTO) */}
            <MovieRow
              rowId="row-recommended"
              title={`Recomendados Especialmente para Você, ${activeProfile.name}`}
              subtitle={`Calculado com base nas suas preferências (${(activeProfile?.preferredGenres || []).join(', ')})`}
              icon={<ThumbsUp className="w-5 h-5 text-cyan-500" />}
              movies={personalizedRecommendations}
              onPlayMovie={handlePlayMovie}
              isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
              onToggleFavorite={handleToggleFavorite}
              isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
              onToggleWatched={handleToggleWatched}
              onSeeAll={() => setIsProfileModalOpen(true)}
              seeAllText="Ajustar Meu Gosto"
            />

            {/* FILEIRA 3: CATÁLOGO GERAL EM DESTAQUE */}
            <MovieRow
              rowId="row-catalog"
              title="Catálogo Geral em Destaque"
              subtitle="Filmes gratuitos, de domínio público e licenciados no YouTube"
              icon={<Sparkles className="w-5 h-5 text-amber-500" />}
              movies={allMovies.slice(0, 30)}
              onPlayMovie={handlePlayMovie}
              isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
              onToggleFavorite={handleToggleFavorite}
              isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
              onToggleWatched={handleToggleWatched}
              onSeeAll={() => {
                setIsFullCatalogView(true);
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              seeAllText="Ver catálogo completo"
              badge={`${allMovies.length} títulos`}
            />

            {/* FILEIRA 4: SERVIDOR REMOTO JELLYFIN */}
            {jellyfinMovies.length > 0 && (
              <MovieRow
                rowId="row-jellyfin"
                title="Filmes do Servidor Jellyfin"
                subtitle="Filmes transmitidos diretamente do seu acervo remoto Jellyfin"
                icon={<Server className="w-5 h-5 text-indigo-500" />}
                movies={jellyfinMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Jellyfin')}
                seeAllText={`Ver todos (${jellyfinMovies.length})`}
                badge="filme.manerostream.com.br"
              />
            )}

            {/* FILEIRA 5: AÇÃO, ARTES MARCIAIS & TIROTEIOS */}
            {actionMovies.length > 0 && (
              <MovieRow
                rowId="row-action"
                title="Ação, Artes Marciais & Tiroteios"
                subtitle="Grandes produções com Jackie Chan, Jet Li e combate tático"
                icon={<Swords className="w-5 h-5 text-cyan-500" />}
                movies={actionMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Ação')}
                seeAllText={`Ver todos (${actionMovies.length})`}
              />
            )}

            {/* FILEIRA 6: GUERRA, BATALHAS HISTÓRICAS & TANQUES */}
            {warMovies.length > 0 && (
              <MovieRow
                rowId="row-war"
                title="Guerra, Batalhas Históricas & Tanques"
                subtitle="Segunda Guerra Mundial, Ardenas, Sobibor e confrontos táticos de blindados"
                icon={<Flame className="w-5 h-5 text-orange-500" />}
                movies={warMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Guerra')}
                seeAllText={`Ver todos (${warMovies.length})`}
              />
            )}

            {/* FILEIRA 7: DRAMAS, BIOGRAFIAS & ÉPICOS */}
            {dramaMovies.length > 0 && (
              <MovieRow
                rowId="row-drama"
                title="Dramas, Biografias & Épicos Históricos"
                subtitle="Histórias inspiradoras como Chico Xavier, Sobibor e Padre Pio"
                icon={<Film className="w-5 h-5 text-purple-500" />}
                movies={dramaMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Drama')}
                seeAllText={`Ver todos (${dramaMovies.length})`}
              />
            )}

            {/* FILEIRA 8: COMÉDIAS & FAMÍLIA */}
            {comedyMovies.length > 0 && (
              <MovieRow
                rowId="row-comedy"
                title="Comédias & Diversão para Toda a Família"
                subtitle="Filmes leves, confusões divertidas e histórias infantis"
                icon={<Sparkles className="w-5 h-5 text-yellow-500" />}
                movies={comedyMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Comédia')}
                seeAllText={`Ver todos (${comedyMovies.length})`}
              />
            )}

            {/* FILEIRA 9: SUSPENSE & INVESTIGAÇÃO */}
            {thrillerMovies.length > 0 && (
              <MovieRow
                rowId="row-thriller"
                title="Suspense, Crime & Cibercultura"
                subtitle="Adrenalina pura, reviravoltas e o submundo dos hackers"
                icon={<Sparkles className="w-5 h-5 text-red-500" />}
                movies={thrillerMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Suspense')}
                seeAllText={`Ver todos (${thrillerMovies.length})`}
              />
            )}

            {/* FILEIRA 10: FICÇÃO CIENTÍFICA & MONSTROS */}
            {sciFiMovies.length > 0 && (
              <MovieRow
                rowId="row-scifi"
                title="Ficção Científica & Monstros"
                subtitle="Futuros distópicos, batalhas titânicas e inteligência artificial"
                icon={<Sparkles className="w-5 h-5 text-blue-500" />}
                movies={sciFiMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Ficção Científica')}
                seeAllText={`Ver todos (${sciFiMovies.length})`}
              />
            )}

            {/* FILEIRA 11: TERROR, SLASHER & SOBRENATURAL */}
            {horrorMovies.length > 0 && (
              <MovieRow
                rowId="row-horror"
                title="Terror, Slasher & Sobrenatural"
                subtitle="Sustos, monstros e noites sombrias para quem tem coragem"
                icon={<Flame className="w-5 h-5 text-rose-500" />}
                movies={horrorMovies.slice(0, 24)}
                onPlayMovie={handlePlayMovie}
                isFavorite={(id) => activeProfile.favoriteMovieIds.includes(id)}
                onToggleFavorite={handleToggleFavorite}
                isWatched={(id) => (activeProfile.watchedMovieIds || []).includes(id)}
                onToggleWatched={handleToggleWatched}
                onSeeAll={() => handleSelectFilter('Terror')}
                seeAllText={`Ver todos (${horrorMovies.length})`}
              />
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

      {/* Footer com Suporte e Informações */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 py-10 px-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Fale com o Suporte (WhatsApp & E-mail Configuráveis no Admin) */}
          {supportConfig.enabled && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-50 via-slate-100/70 to-slate-50 dark:from-slate-950/80 dark:via-slate-900/90 dark:to-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Headphones className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Fale com o Suporte CAIC
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  Dúvidas com filmes, pedidos de catálogo ou problemas de acesso? Fale diretamente com nossa equipe via WhatsApp ou E-mail. {supportConfig.supportHoursText}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                {/* Botão WhatsApp */}
                <a
                  href={supportConfigService.getWhatsAppUrl(supportConfig.whatsappPhone, supportConfig.whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2.5 shadow-md shadow-emerald-600/20 transition transform hover:scale-105 active:scale-95 cursor-pointer"
                  title="Conversar no WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <div className="text-left">
                    <div className="text-[10px] opacity-80 leading-none">WhatsApp</div>
                    <div className="font-extrabold leading-tight">{supportConfigService.formatDisplayPhone(supportConfig.whatsappPhone)}</div>
                  </div>
                </a>

                {/* Botão E-mail */}
                <a
                  href={supportConfigService.getEmailUrl(supportConfig.supportEmail, 'Suporte CAIC Cinema')}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-2.5 transition transform hover:scale-105 active:scale-95 cursor-pointer"
                  title="Enviar e-mail para o suporte"
                >
                  <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">E-mail de Suporte</div>
                    <div className="font-extrabold leading-tight">{supportConfig.supportEmail}</div>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Requisitos Recomendados do Sistema (Celular e TV Box) */}
          <div className="pt-6 pb-2 border-t border-slate-200/70 dark:border-slate-800/80">
            <div className="text-center md:text-left mb-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center justify-center md:justify-start gap-2">
                <Monitor className="w-4 h-4 text-cyan-500" />
                <span>Requisitos Recomendados do Sistema</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Para a melhor experiência e reprodução fluida sem travamentos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Celulares & Tablets */}
              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 shrink-0 mt-0.5">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Smartphones & Tablets</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-semibold">Android / iOS</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-slate-800 dark:text-slate-200">Sistema Operacional:</strong> Android 8.0+ ou iOS 14.0+</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Memória RAM:</strong> Mínimo 2 GB (Recomendado 3 GB+)</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Navegador/App:</strong> Chrome, Edge, Safari ou App CAIC APK</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Conexão:</strong> Wi-Fi ou dados móveis 4G/5G (mínimo 10 Mbps)</li>
                  </ul>
                </div>
              </div>

              {/* TV Box & Smart TV */}
              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                  <Tv className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">TV Box & Android TV</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-semibold">Atenção ao Hardware</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-slate-800 dark:text-slate-200">Memória RAM:</strong> 2 GB a 4 GB recomendados <span className="text-amber-500 dark:text-amber-400 font-semibold">(TV Boxes com apenas 1 GB de RAM podem apresentar lentidão ou fechamentos)</span></li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Processador (CPU):</strong> Quad-Core 1.5 GHz ou superior (Amlogic S905+, Allwinner H6/H616, Rockchip)</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Sistema:</strong> Android TV 9.0 ou superior (com WebView do sistema atualizado)</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Conexão:</strong> Cabo de rede RJ45 Ethernet ou Wi-Fi 5 GHz estável (15 Mbps+)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright e Tecnologias */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/70 dark:border-slate-800/80">
            <p>© 2026 CAIC - Streaming Inteligente Multiplataforma (Web, Mobile e Android TV).</p>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 flex-wrap justify-center">
              <span>Powered by Google Gemini 3.8 Flash</span>
              <span>•</span>
              <span>YouTube Official IFrame API</span>
              <span>•</span>
              <span>Pix Dinâmico Seguro (Mercado Pago)</span>
            </div>
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
        nextMovie={nextMovie}
        onNextMovie={handlePlayNextMovie}
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
