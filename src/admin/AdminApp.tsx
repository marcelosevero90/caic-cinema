import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Users,
  DollarSign,
  Settings,
  Sparkles,
  Plus,
  Link as LinkIcon,
  Check,
  Loader2,
  Play,
  Trash2,
  Edit,
  Star,
  Search,
  ExternalLink,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Key,
  ShieldCheck,
  Clock,
  TrendingUp,
  Award,
  Gift,
  Receipt,
  X
} from 'lucide-react';
import { catalogService } from '../services/catalogService';
import { userService } from '../services/userService';
import { geminiCurationService } from '../services/geminiCurationService';
import { movieRequestService, type MovieRequest } from '../services/movieRequestService';
import { jellyfinService, type JellyfinConfig } from '../services/jellyfinService';
import type { Movie, ContentRating, MovieLanguage, UserAccount, PaymentRecord } from '../types/movie';

export const AdminApp: React.FC = () => {
  // Hubs principais conforme solicitação: Manutenção de Filmes, Clientes, Financeiro, Configurações
  const [activeHub, setActiveHub] = useState<'movies' | 'clients' | 'finance' | 'settings'>('movies');
  const [movieSubTab, setMovieSubTab] = useState<'catalog' | 'add' | 'requests' | 'jellyfin'>('catalog');

  // Estados de Filmes
  const [catalogList, setCatalogList] = useState<Movie[]>(() => catalogService.getAllForAdmin());
  const [movieSearch, setMovieSearch] = useState('');
  const [movieGenreFilter, setMovieGenreFilter] = useState('Todos');
  const [movieSourceFilter, setMovieSourceFilter] = useState<'all' | 'youtube' | 'jellyfin'>('all');
  const [movieStatusFilter, setMovieStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [previewMovie, setPreviewMovie] = useState<Movie | null>(null);

  // Estados de Cadastro / Edição de Filme
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genres, setGenres] = useState('Ação, Suspense');
  const [tags, setTags] = useState('cinema, alta qualidade');
  const [moods, setMoods] = useState('adrenalina, empolgante');
  const [releaseYear, setReleaseYear] = useState<number>(2024);
  const [durationMinutes, setDurationMinutes] = useState<number>(100);
  const [channelName, setChannelName] = useState('Canal do YouTube');
  const [contentRating, setContentRating] = useState<ContentRating>('14');
  const [language, setLanguage] = useState<MovieLanguage>('Dublado');
  const [badge, setBadge] = useState('Acervo');
  const [ratingScore, setRatingScore] = useState<number>(8.0);
  const [posterUrl, setPosterUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [movieStatus, setMovieStatus] = useState<'active' | 'inactive'>('active');
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [originatingRequestId, setOriginatingRequestId] = useState<string | null>(null);

  // Estados de Pedidos
  const [requestsList, setRequestsList] = useState<MovieRequest[]>(() => movieRequestService.getAll());
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'added'>('all');

  // Estados do Jellyfin
  const [jfConfig, setJfConfig] = useState<JellyfinConfig>(() => jellyfinService.getConfig());
  const [jfStatus, setJfStatus] = useState<{ connected: boolean; serverName?: string; version?: string; message: string } | null>(null);
  const [jfTesting, setJfTesting] = useState(false);
  const [jfSyncing, setJfSyncing] = useState(false);
  const [jfMessage, setJfMessage] = useState<string | null>(null);

  // Estados de Clientes
  const [accountsList, setAccountsList] = useState<UserAccount[]>(() => userService.getAllAccounts());
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'trial' | 'active' | 'canceled'>('all');

  // Estados Financeiros
  const [manualPayAccount, setManualPayAccount] = useState<UserAccount | null>(null);
  const [manualPayPlan, setManualPayPlan] = useState<'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual'>('individual_monthly');
  const [manualPayMethod, setManualPayMethod] = useState<'PIX' | 'Cartão de Crédito' | 'Boleto'>('PIX');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Estados da Chave Gemini
  const [adminGeminiKey, setAdminGeminiKey] = useState<string>(() => geminiCurationService.getApiKey() || '');
  const [keySavedFeedback, setKeySavedFeedback] = useState(false);

  // Sincronização periódica com o banco local e mudanças
  useEffect(() => {
    const unsubCatalog = catalogService.subscribe(() => {
      setCatalogList(catalogService.getAllForAdmin());
    });
    const unsubRequests = movieRequestService.subscribe(() => {
      setRequestsList(movieRequestService.getAll());
    });
    const unsubUsers = userService.subscribe(() => {
      setAccountsList(userService.getAllAccounts());
    });

    return () => {
      unsubCatalog();
      unsubRequests();
      unsubUsers();
    };
  }, []);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const refreshAll = () => {
    setCatalogList(catalogService.getAllForAdmin());
    setRequestsList(movieRequestService.getAll());
    setAccountsList(userService.getAllAccounts());
    showNotice('Dados atualizados com sucesso!');
  };

  // Extrair ID do YouTube
  const extractVideoId = (url: string): string => {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : '';
  };

  const currentVideoId = extractVideoId(youtubeUrl);
  const derivedPoster = posterUrl || (currentVideoId ? `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg` : '');

  // Análise com Gemini 3.8 Flash
  const handleAnalyzeWithAI = async () => {
    if (!currentVideoId) {
      alert('Insira uma URL válida do YouTube primeiro.');
      return;
    }
    setAnalyzingAi(true);
    try {
      let oembedTitle = title;
      let oembedAuthor = channelName;
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${currentVideoId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) oembedTitle = data.title;
          if (data.author_name) oembedAuthor = data.author_name;
        }
      } catch {}

      const result = await geminiCurationService.analyzeYouTubeVideo({
        youtubeUrl,
        videoId: currentVideoId,
        initialTitle: oembedTitle || title,
        channelName: oembedAuthor !== 'Canal do YouTube' ? oembedAuthor : undefined,
      });

      setTitle(result.title);
      if (result.originalTitle) setOriginalTitle(result.originalTitle);
      setSynopsis(result.synopsis);
      setGenres(result.genres.join(', '));
      setTags(result.tags.join(', '));
      setMoods(result.moods.join(', '));
      setReleaseYear(result.releaseYear);
      setDurationMinutes(result.durationMinutes);
      setContentRating(result.contentRating);
      setLanguage(result.language);
      if (result.channelName) setChannelName(result.channelName);
      if (result.ratingScore) setRatingScore(result.ratingScore);
      if (result.badge) setBadge(result.badge);
      showNotice('Filme analisado com sucesso pelo Gemini 3.8 Flash!');
    } catch (err: any) {
      alert('Erro na análise com IA: ' + (err.message || 'Verifique a chave da API'));
    } finally {
      setAnalyzingAi(false);
    }
  };

  const resetMovieForm = () => {
    setEditingMovieId(null);
    setYoutubeUrl('');
    setTitle('');
    setOriginalTitle('');
    setSynopsis('');
    setGenres('Ação, Suspense');
    setTags('cinema, alta qualidade');
    setMoods('adrenalina, empolgante');
    setReleaseYear(2024);
    setDurationMinutes(100);
    setChannelName('Canal do YouTube');
    setContentRating('14');
    setLanguage('Dublado');
    setBadge('Acervo');
    setRatingScore(8.0);
    setPosterUrl('');
    setIsFeatured(false);
    setMovieStatus('active');
    setOriginatingRequestId(null);
  };

  const handleStartEditMovie = (movie: Movie) => {
    setEditingMovieId(movie.id);
    setYoutubeUrl((movie as any).youtubeUrl || (movie.youtubeVideoId ? `https://www.youtube.com/watch?v=${movie.youtubeVideoId}` : ''));
    setTitle(movie.title);
    setOriginalTitle(movie.originalTitle || '');
    setSynopsis(movie.synopsis);
    setGenres(movie.genres.join(', '));
    setTags(movie.tags.join(', '));
    setMoods(movie.moods.join(', '));
    setReleaseYear(movie.releaseYear);
    setDurationMinutes(movie.durationMinutes);
    setChannelName(movie.channelName || '');
    setContentRating(movie.contentRating);
    setLanguage(movie.language);
    setBadge(movie.badge || '');
    setRatingScore(movie.ratingScore);
    setPosterUrl(movie.posterUrl);
    setIsFeatured(Boolean(movie.featured));
    setMovieStatus(movie.status === 'inactive' || movie.isActive === false ? 'inactive' : 'active');
    setMovieSubTab('add');
    setActiveHub('movies');
  };

  const handleSaveMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('O título do filme é obrigatório.');
      return;
    }

    const moviePayload: Movie = {
      id: editingMovieId || (currentVideoId ? `yt-${currentVideoId}` : `custom-${Date.now()}`),
      youtubeVideoId: currentVideoId || (editingMovieId ? editingMovieId.replace('yt-', '') : `id-${Date.now()}`),
      title: title.trim(),
      originalTitle: originalTitle.trim() || undefined,
      synopsis: synopsis.trim(),
      genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      moods: moods.split(',').map((m) => m.trim()).filter(Boolean),
      releaseYear: Number(releaseYear) || 2024,
      durationMinutes: Number(durationMinutes) || 90,
      contentRating,
      language,
      badge: badge.trim() || undefined,
      channelName: channelName.trim() || 'YouTube',
      ratingScore: Number(ratingScore) || 7.5,
      posterUrl: derivedPoster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
      backdropUrl: derivedPoster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280',
      featured: isFeatured,
      status: movieStatus,
      isActive: movieStatus === 'active',
      source: 'youtube',
    };

    if (editingMovieId) {
      catalogService.updateMovie(editingMovieId, moviePayload);
      showNotice(`Filme "${moviePayload.title}" atualizado com sucesso!`);
    } else {
      catalogService.addMovie(moviePayload);
      showNotice(`Filme "${moviePayload.title}" adicionado ao catálogo!`);
    }

    if (originatingRequestId) {
      movieRequestService.updateStatus(originatingRequestId, 'added', 'Cadastrado no catálogo oficial', moviePayload.id);
      setOriginatingRequestId(null);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      resetMovieForm();
      setMovieSubTab('catalog');
    }, 600);
  };

  const handleDeleteMovie = (id: string, movieTitle: string) => {
    if (confirm(`Tem certeza que deseja remover "${movieTitle}" do catálogo?`)) {
      catalogService.removeMovie(id);
      setCatalogList(catalogService.getAllForAdmin());
      showNotice(`Filme "${movieTitle}" removido.`);
    }
  };

  const handleToggleFeatured = (movie: Movie) => {
    catalogService.updateMovie(movie.id, { featured: !movie.featured });
    setCatalogList(catalogService.getAllForAdmin());
    showNotice(movie.featured ? 'Removido dos destaques' : 'Marcado como Destaque na Home');
  };

  const handleToggleStatus = (movie: Movie) => {
    const updated = catalogService.toggleMovieStatus(movie.id);
    setCatalogList(catalogService.getAllForAdmin());
    const isNowActive = updated ? (updated.status !== 'inactive' && updated.isActive !== false) : true;
    showNotice(
      isNowActive
        ? `"${movie.title}" agora está ATIVO e visível na plataforma!`
        : `"${movie.title}" agora está INATIVO e oculto da plataforma.`
    );
  };

  // Testar e sincronizar Jellyfin
  const handleTestJellyfin = async () => {
    setJfTesting(true);
    try {
      const res = await jellyfinService.checkConnection();
      setJfStatus(res);
      showNotice(res.message);
    } finally {
      setJfTesting(false);
    }
  };

  const handleSaveJellyfinConfig = () => {
    jellyfinService.saveConfig(jfConfig);
    handleTestJellyfin();
    setJfMessage('Configurações do servidor Jellyfin salvas com sucesso!');
    setTimeout(() => setJfMessage(null), 3500);
  };

  const handleSyncJellyfin = async () => {
    setJfSyncing(true);
    try {
      await catalogService.syncJellyfinMovies();
      setCatalogList(catalogService.getAllForAdmin());
      const count = catalogService.getJellyfinMovies().length;
      showNotice(`Sincronização concluída! ${count} filme(s) do Jellyfin integrados.`);
    } finally {
      setJfSyncing(false);
    }
  };

  // Salvar Chave Gemini
  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    geminiCurationService.setApiKey(adminGeminiKey.trim());
    setKeySavedFeedback(true);
    showNotice('Chave Gemini API salva com sucesso!');
    setTimeout(() => setKeySavedFeedback(false), 3000);
  };

  // Ações de Clientes e Financeiro
  const handleAddTrialDays = (account: UserAccount) => {
    const currentEnd = account.trialEndDate ? new Date(account.trialEndDate).getTime() : Date.now();
    const newEnd = new Date(Math.max(Date.now(), currentEnd) + 7 * 86400000).toISOString();
    userService.adminUpdateAccount(account.id, {
      subscriptionStatus: 'trial',
      trialEndDate: newEnd,
      plan: account.plan || 'Plano CAIC (7 Dias Grátis Estendido)',
    });
    setAccountsList(userService.getAllAccounts());
    showNotice(`+7 Dias de Degustação concedidos para ${account.name}!`);
  };

  const handleActivatePlan = (account: UserAccount, planType: 'individual' | 'family', cycle: 'monthly' | 'annual') => {
    const isFam = planType === 'family';
    const isAnn = cycle === 'annual';
    const price = isFam ? (isAnn ? 29.90 : 9.90) : (isAnn ? 19.90 : 5.90);
    const planName = isFam
      ? (isAnn ? 'Plano Família Anual (R$ 29,90/ano)' : 'Plano Família Mensal (R$ 9,90/mês)')
      : (isAnn ? 'Plano Individual Anual (R$ 19,90/ano)' : 'Plano Individual Mensal (R$ 5,90/mês)');
    const days = isAnn ? 365 : 30;

    userService.adminRecordPayment(account.id, price, 'Aprovação Manual Admin', planName, days);
    setAccountsList(userService.getAllAccounts());
    showNotice(`${planName} ativado com sucesso para ${account.name} (+${days} dias)!`);
  };

  const handleToggleSuspendUser = (account: UserAccount) => {
    const isCanceled = account.subscriptionStatus === 'canceled';
    const newStatus = isCanceled ? 'active' : 'canceled';
    userService.adminUpdateAccount(account.id, {
      subscriptionStatus: newStatus,
    });
    setAccountsList(userService.getAllAccounts());
    showNotice(isCanceled ? `Acesso de ${account.name} reativado.` : `Acesso de ${account.name} suspenso.`);
  };

  const handleConfirmManualPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayAccount) return;

    let price = 5.90;
    let planName = 'Plano Individual Mensal (R$ 5,90/mês)';
    let days = 30;

    if (manualPayPlan === 'individual_annual') {
      price = 19.90;
      planName = 'Plano Individual Anual (R$ 19,90/ano)';
      days = 365;
    } else if (manualPayPlan === 'family_monthly') {
      price = 9.90;
      planName = 'Plano Família Mensal (R$ 9,90/mês)';
      days = 30;
    } else if (manualPayPlan === 'family_annual') {
      price = 29.90;
      planName = 'Plano Família Anual (R$ 29,90/ano)';
      days = 365;
    }

    userService.adminRecordPayment(manualPayAccount.id, price, manualPayMethod, planName, days);
    setAccountsList(userService.getAllAccounts());
    showNotice(`Pagamento de R$ ${price.toFixed(2)} registrado e ${planName} liberado para ${manualPayAccount.name}!`);
    setManualPayAccount(null);
  };

  // Filtros de Filmes
  const filteredCatalog = useMemo(() => {
    return catalogList.filter((m) => {
      const isInactive = m.status === 'inactive' || m.isActive === false;
      if (movieStatusFilter === 'active' && isInactive) return false;
      if (movieStatusFilter === 'inactive' && !isInactive) return false;

      const matchSearch =
        m.title.toLowerCase().includes(movieSearch.toLowerCase()) ||
        (m.originalTitle || '').toLowerCase().includes(movieSearch.toLowerCase()) ||
        (m.channelName || '').toLowerCase().includes(movieSearch.toLowerCase()) ||
        m.genres.some((g) => g.toLowerCase().includes(movieSearch.toLowerCase()));
      const matchGenre = movieGenreFilter === 'Todos' || m.genres.includes(movieGenreFilter);
      const matchSource =
        movieSourceFilter === 'all' ||
        (movieSourceFilter === 'jellyfin' ? m.source === 'jellyfin' : m.source !== 'jellyfin');
      return matchSearch && matchGenre && matchSource;
    });
  }, [catalogList, movieSearch, movieGenreFilter, movieSourceFilter, movieStatusFilter]);

  // Filtros de Clientes
  const filteredClients = useMemo(() => {
    return accountsList.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        a.email.toLowerCase().includes(clientSearch.toLowerCase());
      const matchStatus =
        clientStatusFilter === 'all' || a.subscriptionStatus === clientStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [accountsList, clientSearch, clientStatusFilter]);

  // Métricas Financeiras
  const totalRevenue = useMemo(() => {
    return accountsList.reduce((acc, a) => acc + (a.lastPaymentAmount || 0), 0);
  }, [accountsList]);

  const activeSubscribersCount = useMemo(() => {
    return accountsList.filter((a) => a.subscriptionStatus === 'active').length;
  }, [accountsList]);

  const trialClientsCount = useMemo(() => {
    return accountsList.filter((a) => a.subscriptionStatus === 'trial').length;
  }, [accountsList]);

  const allPaymentRecords = useMemo(() => {
    const list: Array<PaymentRecord & { userName: string; userEmail: string }> = [];
    accountsList.forEach((acc) => {
      (acc.paymentHistory || []).forEach((rec) => {
        list.push({ ...rec, userName: acc.name, userEmail: acc.email });
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [accountsList]);

  const genresList = ['Todos', 'Ação', 'Guerra', 'Drama', 'Comédia', 'Terror', 'Suspense', 'Ficção Científica', 'Família'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header do Painel Admin */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">
                  CAIC <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">ADMIN</span>
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Porta 5174
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Gestão Oficial • Filmes, Clientes e Financeiro</p>
            </div>
          </div>

          {/* Links e Atalhos no Topo */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={refreshAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
              title="Recarregar dados do sistema"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sincronizar</span>
            </button>

            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 flex items-center gap-1.5 transition"
            >
              <span>Abrir App do Usuário</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Notificação Toast */}
      {actionNotice && (
        <div className="fixed top-18 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2.5 shadow-2xl animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Barra de Navegação dos 3 Hubs Principais */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveHub('movies')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition whitespace-nowrap ${
              activeHub === 'movies'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>1. Manutenção de Filmes ({catalogList.length})</span>
          </button>

          <button
            onClick={() => setActiveHub('clients')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition whitespace-nowrap ${
              activeHub === 'clients'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Gestão de Clientes ({accountsList.length})</span>
          </button>

          <button
            onClick={() => setActiveHub('finance')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition whitespace-nowrap ${
              activeHub === 'finance'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>3. Gestão Financeira (R$ {totalRevenue.toFixed(2)})</span>
          </button>

          <button
            onClick={() => setActiveHub('settings')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition whitespace-nowrap ${
              activeHub === 'settings'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>4. Configurações &amp; IA</span>
          </button>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">

        {/* ======================================================== */}
        {/* HUB 1: MANUTENÇÃO DE FILMES */}
        {/* ======================================================== */}
        {activeHub === 'movies' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Sub-navegação do Hub de Filmes */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMovieSubTab('catalog')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    movieSubTab === 'catalog' ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Acervo ({catalogList.length})
                </button>
                <button
                  onClick={() => {
                    resetMovieForm();
                    setMovieSubTab('add');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    movieSubTab === 'add' ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Filme (IA)</span>
                </button>
                <button
                  onClick={() => setMovieSubTab('jellyfin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    movieSubTab === 'jellyfin' ? 'bg-slate-800 text-purple-400 border border-purple-500/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Jellyfin Local</span>
                </button>
                <button
                  onClick={() => setMovieSubTab('requests')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    movieSubTab === 'requests' ? 'bg-slate-800 text-amber-400 border border-amber-500/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Pedidos dos Usuários ({requestsList.filter(r => r.status === 'pending').length})</span>
                </button>
              </div>

              {movieSubTab === 'catalog' && (
                <button
                  onClick={() => {
                    resetMovieForm();
                    setMovieSubTab('add');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Filme com IA</span>
                </button>
              )}
            </div>

            {/* Sub-Aba 1: Lista e Tabela do Acervo */}
            {movieSubTab === 'catalog' && (
              <div className="space-y-4">
                {/* Filtros e Busca */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={movieSearch}
                      onChange={(e) => setMovieSearch(e.target.value)}
                      placeholder="Buscar por título, elenco, canal ou gênero..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={movieGenreFilter}
                      onChange={(e) => setMovieGenreFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      {genresList.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>

                    <select
                      value={movieSourceFilter}
                      onChange={(e) => setMovieSourceFilter(e.target.value as any)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="all">Todas as Fontes</option>
                      <option value="youtube">Somente YouTube</option>
                      <option value="jellyfin">Somente Jellyfin</option>
                    </select>

                    <select
                      value={movieStatusFilter}
                      onChange={(e) => setMovieStatusFilter(e.target.value as any)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="all">Todas Situações</option>
                      <option value="active">Somente Ativos</option>
                      <option value="inactive">Somente Inativos</option>
                    </select>
                  </div>
                </div>

                {/* Tabela de Filmes */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3.5">Filme / Título</th>
                          <th className="p-3.5">Ano / Duração</th>
                          <th className="p-3.5">Gêneros</th>
                          <th className="p-3.5">Distribuidor / Fonte</th>
                          <th className="p-3.5 text-center">Situação</th>
                          <th className="p-3.5 text-center">Destaque</th>
                          <th className="p-3.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredCatalog.map((movie) => (
                          <tr key={movie.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 flex items-center gap-3">
                              <img
                                src={movie.posterUrl}
                                alt={movie.title}
                                className="w-10 h-14 object-cover rounded-lg bg-slate-950 flex-shrink-0 border border-slate-800"
                              />
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-white truncate max-w-xs">{movie.title}</h5>
                                <p className="text-[11px] text-slate-400 truncate">
                                   {movie.source === 'jellyfin' ? 'Biblioteca Jellyfin' : `ID: ${movie.youtubeVideoId}`}
                                </p>
                              </div>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-200">{movie.releaseYear}</span>
                              <span className="text-slate-500 text-[11px] block">{movie.durationMinutes} min</span>
                            </td>

                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(movie.genres || []).slice(0, 2).map((g) => (
                                  <span key={g} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              {movie.source === 'jellyfin' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                                  Jellyfin Stream
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  {movie.channelName || 'YouTube'}
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleToggleStatus(movie)}
                                title={movie.status === 'inactive' || movie.isActive === false ? 'Clique para Ativar este filme na plataforma' : 'Clique para Inativar este filme (ocultar da plataforma)'}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                  movie.status === 'inactive' || movie.isActive === false
                                    ? 'bg-rose-950/60 text-rose-400 border border-rose-800 hover:bg-rose-900/60'
                                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/60'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${movie.status === 'inactive' || movie.isActive === false ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <span>{movie.status === 'inactive' || movie.isActive === false ? 'Inativo' : 'Ativo'}</span>
                              </button>
                            </td>

                            <td className="p-3.5 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleToggleFeatured(movie)}
                                title={movie.featured ? 'Remover dos Destaques' : 'Tornar Destaque na Home'}
                                className={`p-1.5 rounded-lg transition ${
                                  movie.featured
                                    ? 'bg-amber-950 text-amber-400 font-bold border border-amber-800'
                                    : 'text-slate-500 hover:text-amber-400'
                                }`}
                              >
                                <Star className={`w-4 h-4 ${movie.featured ? 'fill-amber-400' : ''}`} />
                              </button>
                            </td>

                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setPreviewMovie(movie)}
                                  title="Pré-visualizar filme"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleStartEditMovie(movie)}
                                  title="Editar dados do filme"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteMovie(movie.id, movie.title)}
                                  title="Excluir filme"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Aba 2: Formulário de Cadastro e Edição com IA */}
            {movieSubTab === 'add' && (
              <form onSubmit={handleSaveMovie} className="space-y-5 max-w-4xl mx-auto bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div>
                  <h4 className="text-base font-extrabold text-white">
                    {editingMovieId ? 'Editar Filme do Catálogo' : 'Cadastrar Novo Filme com Análise IA'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Cole o link do YouTube e clique em <strong>Analisar com IA</strong> para o Gemini 3.8 Flash preencher sinopse, tags e gênero automaticamente.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    URL do Vídeo no YouTube ou ID
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAnalyzeWithAI}
                      disabled={!currentVideoId || analyzingAi}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition"
                    >
                      {analyzingAi ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analisando com Gemini...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analisar com IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Prévia do Vídeo */}
                {currentVideoId && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                    <img src={derivedPoster} alt="Thumb" className="w-24 aspect-video rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-cyan-400">Vídeo Detectado</span>
                      <h5 className="font-extrabold text-white text-xs truncate">{title || 'Título extraído pelo YouTube...'}</h5>
                      <p className="text-[11px] text-slate-400 truncate">{channelName}</p>
                    </div>
                  </div>
                )}

                {/* Grid de Campos do Filme */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Título do Filme</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Título Original (Opcional)</label>
                    <input
                      type="text"
                      value={originalTitle}
                      onChange={(e) => setOriginalTitle(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sinopse Completa</label>
                    <textarea
                      value={synopsis}
                      onChange={(e) => setSynopsis(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Gêneros (separados por vírgula)</label>
                    <input
                      type="text"
                      value={genres}
                      onChange={(e) => setGenres(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tags Semânticas</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Ano de Lançamento</label>
                    <input
                      type="number"
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Duração (minutos)</label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Classificação Etária</label>
                    <select
                      value={contentRating}
                      onChange={(e) => setContentRating(e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Livre">Livre</option>
                      <option value="10">10 anos</option>
                      <option value="12">12 anos</option>
                      <option value="14">14 anos</option>
                      <option value="16">16 anos</option>
                      <option value="18">18 anos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Áudio / Idioma</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Dublado">Dublado</option>
                      <option value="Legendado">Legendado</option>
                      <option value="Nacional">Nacional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nota Crítica (0 a 10)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ratingScore}
                      onChange={(e) => setRatingScore(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Canal / Distribuidor</label>
                    <input
                      type="text"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                      />
                      <label htmlFor="isFeatured" className="text-xs font-bold text-amber-400 flex items-center gap-1 cursor-pointer">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span>Destacar este filme no topo da página inicial</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Situação:</span>
                      <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setMovieStatus('active')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            movieStatus === 'active'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Ativo (Visível)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovieStatus('inactive')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            movieStatus === 'inactive'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Inativo (Oculto)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      resetMovieForm();
                      setMovieSubTab('catalog');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-600/20 transition flex items-center gap-1.5"
                  >
                    {savedSuccess ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingMovieId ? 'Salvar Alterações' : 'Cadastrar Filme no Catálogo'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Sub-Aba 3: Sincronização Jellyfin */}
            {movieSubTab === 'jellyfin' && (
              <div className="space-y-5 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-purple-400" />
                      <span>Biblioteca Jellyfin Local</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sincronize arquivos de filmes locais que você colocou na pasta do Jellyfin para o catálogo do CAIC.
                    </p>
                  </div>
                  <button
                    onClick={handleSyncJellyfin}
                    disabled={jfSyncing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {jfSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Sincronizar Filmes Locais</span>
                  </button>
                </div>

                {/* Painel de Configuração Rápida do Jellyfin */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                      <span>Configurações do Servidor Jellyfin</span>
                    </span>
                    {jfMessage && (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-800 animate-fadeIn">
                        {jfMessage}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                        URL do Servidor (ex: http://localhost:8096 ou IP da sua rede)
                      </label>
                      <input
                        type="text"
                        value={jfConfig.serverUrl}
                        onChange={(e) => setJfConfig({ ...jfConfig, serverUrl: e.target.value })}
                        placeholder="http://192.168.0.x:8096"
                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                        Chave de API (Gerada no Jellyfin &gt; Painel &gt; Chaves de API)
                      </label>
                      <input
                        type="text"
                        value={jfConfig.apiKey || ''}
                        onChange={(e) => setJfConfig({ ...jfConfig, apiKey: e.target.value })}
                        placeholder="Cole aqui a API Key do Jellyfin..."
                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <p className="text-[10px] text-slate-500">
                      💡 A Chave de API é necessária para sincronizar os filmes. Para gerar: abra seu Jellyfin, vá em <strong>Painel de Controle &gt; Avançado &gt; Chaves de API</strong> e clique em <strong>+</strong>.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveJellyfinConfig}
                        disabled={jfTesting}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                      >
                        {jfTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Salvar &amp; Testar Conexão</span>
                      </button>
                      <a
                        href={jfConfig.serverUrl || "http://localhost:8096"}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-bold rounded-xl flex items-center gap-1 transition"
                      >
                        <span>Abrir Web</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Cards de Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Endereço Configurado</span>
                    <p className="text-sm font-bold text-white mt-1 truncate" title={jfConfig.serverUrl}>
                      {jfConfig.serverUrl || 'http://localhost:8096'}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Status da Conexão</span>
                    {jfStatus ? (
                      <p className={`text-xs font-bold mt-1 flex items-center gap-1.5 ${
                        jfStatus.connected ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {jfStatus.connected ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="line-clamp-2">{jfStatus.message}</span>
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Aguardando teste</span>
                      </p>
                    )}
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Filmes Detectados</span>
                    <p className="text-sm font-bold text-purple-400 mt-1">
                      {catalogService.getJellyfinMovies().length} títulos locais no CAIC
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Aba 4: Pedidos dos Usuários */}
            {movieSubTab === 'requests' && (
              <div className="space-y-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-extrabold text-white">Solicitações de Filmes dos Usuários</h4>
                    <p className="text-xs text-slate-400">Filmes que os usuários buscaram na Web e pediram para inclusão.</p>
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'pending', 'added'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setRequestStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                          requestStatusFilter === st ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st === 'all' ? 'Todos' : st === 'pending' ? 'Pendentes' : 'Adicionados'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                  {requestsList
                    .filter((r) => requestStatusFilter === 'all' || r.status === requestStatusFilter)
                    .map((req) => (
                      <div key={req.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-extrabold text-white text-sm">{req.title}</h5>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              req.status === 'added' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {req.status === 'added' ? 'Adicionado' : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{req.userNotes || 'Sem observações'}</p>
                          <span className="text-[10px] text-slate-500">Sugerido por: {req.suggestedBy}</span>
                        </div>

                        {req.status === 'pending' && (
                          <button
                            onClick={() => {
                              setTitle(req.title);
                              setOriginatingRequestId(req.id);
                              setMovieSubTab('add');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Cadastrar no Catálogo</span>
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* HUB 2: GESTÃO DE CLIENTES */}
        {/* ======================================================== */}
        {activeHub === 'clients' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Cards Resumo de Clientes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total de Clientes</span>
                <p className="text-2xl font-black text-white mt-1">{accountsList.length}</p>
                <span className="text-[10px] text-slate-500">Cadastros no sistema</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60">
                <span className="text-[11px] font-bold text-amber-400 uppercase">Em Teste (7 Dias)</span>
                <p className="text-2xl font-black text-amber-300 mt-1">{trialClientsCount}</p>
                <span className="text-[10px] text-amber-400/70">Degustação sem custo</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
                <span className="text-[11px] font-bold text-emerald-400 uppercase">Assinantes Ativos</span>
                <p className="text-2xl font-black text-emerald-300 mt-1">{activeSubscribersCount}</p>
                <span className="text-[10px] text-emerald-400/70">Mensal ou Anual</span>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60">
                <span className="text-[11px] font-bold text-cyan-400 uppercase">Plano Família</span>
                <p className="text-2xl font-black text-cyan-300 mt-1">
                  {accountsList.filter((a) => a.subscriptionPlan === 'family').length}
                </p>
                <span className="text-[10px] text-cyan-400/70">Até 3 perfis por conta</span>
              </div>
            </div>

            {/* Filtros e Busca de Clientes */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente por nome ou e-mail..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={clientStatusFilter}
                onChange={(e) => setClientStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos os Status</option>
                <option value="trial">Em Teste (7 Dias)</option>
                <option value="active">Assinatura Ativa</option>
                <option value="canceled">Suspensos / Cancelados</option>
              </select>
            </div>

            {/* Tabela de Clientes */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Plano Contratado</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Vigência / Vencimento</th>
                      <th className="p-3.5">Último Pagamento</th>
                      <th className="p-3.5 text-right">Ações Administrativas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredClients.map((acc) => {
                      const isTrial = acc.subscriptionStatus === 'trial';
                      const isActive = acc.subscriptionStatus === 'active';
                      const isCanceled = acc.subscriptionStatus === 'canceled';

                      return (
                        <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 flex items-center gap-3">
                            <img src={acc.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                            <div>
                              <p className="font-extrabold text-white text-xs">{acc.name}</p>
                              <p className="text-[11px] text-slate-400">{acc.email}</p>
                              {acc.phone && <p className="text-[10px] text-cyan-400 font-semibold">📱 {acc.phone}</p>}
                              <span className="text-[9px] text-slate-500 block">
                                Desde: {new Date(acc.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-slate-200">{acc.plan}</span>
                            <span className="block text-[10px] text-slate-400 capitalize">
                              Ciclo: {acc.billingCycle === 'annual' ? 'Anual' : 'Mensal'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              isTrial
                                ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                                : isActive
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {isTrial ? '7 Dias Grátis' : isActive ? 'Ativo' : isCanceled ? 'Suspenso' : 'Visitante'}
                            </span>
                          </td>

                          <td className="p-3.5 text-slate-400">
                            {isTrial && acc.trialEndDate ? (
                              <span className="font-semibold text-amber-400">
                                Degustação até {new Date(acc.trialEndDate).toLocaleDateString()}
                              </span>
                            ) : isActive && acc.subscriptionExpiresAt ? (
                              <span className="font-semibold text-emerald-400">
                                Ativo até {new Date(acc.subscriptionExpiresAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span>Sem assinatura ativa</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {acc.lastPaymentAmount ? (
                              <div>
                                <p className="font-extrabold text-white">R$ {acc.lastPaymentAmount.toFixed(2)}</p>
                                <span className="text-[10px] text-slate-400">{acc.paymentMethod || 'PIX'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Sem cobrança</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleAddTrialDays(acc)}
                                className="px-2 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[11px] font-bold transition"
                                title="Conceder +7 dias de degustação"
                              >
                                +7d Grátis
                              </button>

                              <button
                                onClick={() => handleActivatePlan(acc, 'individual', 'monthly')}
                                className="px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[11px] font-bold transition"
                                title="Ativar 30 dias de Plano Individual (R$ 5,90)"
                              >
                                +30d Ind.
                              </button>

                              <button
                                onClick={() => handleActivatePlan(acc, 'family', 'monthly')}
                                className="px-2 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[11px] font-bold transition"
                                title="Ativar 30 dias de Plano Família (R$ 9,90)"
                              >
                                +30d Fam.
                              </button>

                              <button
                                onClick={() => setManualPayAccount(acc)}
                                className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px] font-bold transition"
                                title="Registrar pagamento manual PIX/Boleto"
                              >
                                Lançar Pagamento
                              </button>

                              <button
                                onClick={() => handleToggleSuspendUser(acc)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition ${
                                  acc.subscriptionStatus === 'canceled'
                                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                                    : 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900'
                                }`}
                                title={acc.subscriptionStatus === 'canceled' ? 'Reativar conta' : 'Suspender acesso'}
                              >
                                {acc.subscriptionStatus === 'canceled' ? 'Reativar' : 'Suspender'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* HUB 3: GESTÃO FINANCEIRA */}
        {/* ======================================================== */}
        {activeHub === 'finance' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Indicadores Financeiros */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/60 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Faturamento Total</span>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-3xl font-black text-white mt-2">R$ {totalRevenue.toFixed(2)}</p>
                <span className="text-[11px] text-emerald-400/70 mt-1 block">Receita confirmada</span>
              </div>

              <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-950/60 to-slate-900 border border-cyan-800/60 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Assinaturas Ativas</span>
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-3xl font-black text-white mt-2">{activeSubscribersCount}</p>
                <span className="text-[11px] text-cyan-400/70 mt-1 block">Pagantes mensais/anuais</span>
              </div>

              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-800/60 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Em Degustação (7 Dias)</span>
                  <Gift className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-3xl font-black text-white mt-2">{trialClientsCount}</p>
                <span className="text-[11px] text-amber-400/70 mt-1 block">Conversão futura em receita</span>
              </div>

              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/60 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Ticket Médio</span>
                  <Award className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-3xl font-black text-white mt-2">
                  R$ {activeSubscribersCount > 0 ? (totalRevenue / activeSubscribersCount).toFixed(2) : '14.90'}
                </p>
                <span className="text-[11px] text-indigo-400/70 mt-1 block">Por cliente ativo</span>
              </div>
            </div>

            {/* Tabela de Preços Oficiais Configurados */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Grade Oficial de Preços CAIC (Vigente)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-cyan-400 uppercase">Plano Individual (1 perfil • 1 tela)</span>
                    <p className="text-sm text-slate-300 mt-1">
                      Mensal: <strong className="text-white text-base">R$ 5,90</strong> • Anual: <strong className="text-white text-base">R$ 19,90</strong>
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">7 Dias Grátis</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-amber-400 uppercase">Plano Família (até 3 perfis • 1 tela)</span>
                    <p className="text-sm text-slate-300 mt-1">
                      Mensal: <strong className="text-white text-base">R$ 9,90</strong> • Anual: <strong className="text-white text-base">R$ 29,90</strong>
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">7 Dias Grátis</span>
                </div>
              </div>
            </div>

            {/* Histórico Completo de Transações e Recibos */}
            <div className="space-y-3 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-cyan-400" />
                    <span>Livro Caixa de Transações &amp; Comprovantes ({allPaymentRecords.length})</span>
                  </h4>
                  <p className="text-xs text-slate-400">Registro de todas as ativações, renovações e testes aprovados.</p>
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Data</th>
                        <th className="p-3.5">Cliente</th>
                        <th className="p-3.5">Plano / Descrição</th>
                        <th className="p-3.5">Forma</th>
                        <th className="p-3.5">Valor (R$)</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {allPaymentRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 whitespace-nowrap text-slate-400">
                            {rec.date ? new Date(rec.date).toLocaleDateString() : 'Hoje'}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-white block">{rec.userName}</span>
                            <span className="text-[10px] text-slate-500">{rec.userEmail}</span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-200">{rec.plan}</td>
                          <td className="p-3.5 text-slate-400">{rec.method}</td>
                          <td className="p-3.5 font-extrabold text-white">
                            {rec.amount === 0 ? 'Grátis (Teste)' : `R$ ${rec.amount.toFixed(2)}`}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Confirmado
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* HUB 4: CONFIGURAÇÕES & IA */}
        {/* ======================================================== */}
        {activeHub === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            {/* Chave da Google Gemini API */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-500 text-slate-950 shadow-md">
                    <Key className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Chave Google Gemini API (Exclusivo Administrador)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                        {adminGeminiKey ? 'Ativa' : 'Pendente'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Esta chave alimenta os agentes de busca inteligente, o chat dos filmes e a catalogação automática.
                    </p>
                  </div>
                </div>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 text-xs font-bold flex items-center gap-1.5 hover:border-cyan-500 transition"
                >
                  <span>Obter no Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleSaveGeminiKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                <input
                  type="password"
                  value={adminGeminiKey}
                  onChange={(e) => setAdminGeminiKey(e.target.value)}
                  placeholder="AIzaSy... (Cole sua chave da Google Gemini API)"
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {keySavedFeedback ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                  <span>{keySavedFeedback ? 'Chave Salva!' : 'Salvar Chave'}</span>
                </button>
              </form>
            </div>

            {/* Configuração do Jellyfin */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <span>Configuração do Servidor Jellyfin</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conexão direta com o servidor de mídia local rodando em seu computador.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">URL do Servidor Jellyfin</label>
                  <input
                    type="text"
                    value={jfConfig.serverUrl}
                    onChange={(e) => setJfConfig({ ...jfConfig, serverUrl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">API Key do Jellyfin (Opcional)</label>
                  <input
                    type="password"
                    value={jfConfig.apiKey || ''}
                    onChange={(e) => setJfConfig({ ...jfConfig, apiKey: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveJellyfinConfig}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition"
                >
                  Salvar Configuração Jellyfin
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Modal de Lançamento de Pagamento Manual */}
      {manualPayAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <button
              onClick={() => setManualPayAccount(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <span>Lançar Pagamento Manual</span>
            </h4>

            <p className="text-xs text-slate-400">
              Registrar recebimento de pagamento para <strong>{manualPayAccount.name}</strong> ({manualPayAccount.email}).
            </p>

            <form onSubmit={handleConfirmManualPayment} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Selecione o Plano &amp; Ciclo:</label>
                <select
                  value={manualPayPlan}
                  onChange={(e) => setManualPayPlan(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="individual_monthly">Plano Individual Mensal - R$ 5,90 (+30 dias)</option>
                  <option value="individual_annual">Plano Individual Anual - R$ 19,90 (+365 dias)</option>
                  <option value="family_monthly">Plano Família Mensal - R$ 9,90 (+30 dias)</option>
                  <option value="family_annual">Plano Família Anual - R$ 29,90 (+365 dias)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Forma de Pagamento Recebida:</label>
                <select
                  value={manualPayMethod}
                  onChange={(e) => setManualPayMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="PIX">PIX (Transferência Instantânea)</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Boleto">Boleto Bancário</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualPayAccount(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md"
                >
                  Confirmar e Ativar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Prévia do Filme */}
      {previewMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h4 className="font-extrabold text-sm text-white truncate">{previewMovie.title} ({previewMovie.releaseYear})</h4>
              <button onClick={() => setPreviewMovie(null)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {previewMovie.youtubeVideoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${previewMovie.youtubeVideoId}?autoplay=1`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Vídeo sem ID do YouTube
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
