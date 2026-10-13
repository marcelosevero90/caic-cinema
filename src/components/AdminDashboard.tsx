import React, { useState, useEffect } from 'react';
import {
  X,
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
  Settings,
  Layers,
  Save,
  Film,
  ExternalLink,
  ThumbsUp,
  Inbox,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Key,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogOut,
  ArrowUp,
  ArrowDown,
  Headphones,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { geminiCurationService } from '../services/geminiCurationService';
import { catalogService } from '../services/catalogService';
import { movieRequestService, type MovieRequest } from '../services/movieRequestService';
import { jellyfinService, type JellyfinConfig } from '../services/jellyfinService';
import { userService } from '../services/userService';
import { cinemaSessionService, SESSION_PRESETS } from '../services/cinemaSessionService';
import { supportConfigService, type SupportConfig } from '../services/supportConfigService';
import type { CinemaSession } from '../types/cinemaSession';
import type { Movie, ContentRating, MovieLanguage, UserAccount } from '../types/movie';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieUpdated?: () => void;
  onPreviewMovie: (movie: Movie) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onMovieUpdated,
  onPreviewMovie,
}) => {
  // Estados de Autenticação do Administrador
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return (
      sessionStorage.getItem('CAIC_ADMIN_AUTH') === 'true' ||
      localStorage.getItem('CAIC_ADMIN_AUTH') === 'true'
    );
  });
  const [adminUserDraft, setAdminUserDraft] = useState('');
  const [adminPasswordDraft, setAdminPasswordDraft] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const user = adminUserDraft.trim().toLowerCase();
    const pass = adminPasswordDraft.trim();

    // Aceita admin ou caic ou marcelo
    const validUsers = ['admin', 'caic', 'marcelo'];
    const validPasswords = ['caic@2026', 'admin123', 'admin@2026', 'admin'];

    setTimeout(() => {
      if (validUsers.includes(user) && validPasswords.includes(pass)) {
        sessionStorage.setItem('CAIC_ADMIN_AUTH', 'true');
        localStorage.setItem('CAIC_ADMIN_AUTH', 'true');
        setIsAdminAuthenticated(true);
        setIsLoggingIn(false);
        setAdminPasswordDraft('');
      } else {
        setIsLoggingIn(false);
        setLoginError('Usuário ou senha incorretos. Verifique suas credenciais.');
      }
    }, 250);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('CAIC_ADMIN_AUTH');
    localStorage.removeItem('CAIC_ADMIN_AUTH');
    setIsAdminAuthenticated(false);
  };

  const [activeTab, setActiveTab] = useState<'manage' | 'session' | 'add' | 'requests' | 'jellyfin' | 'subscriptions' | 'support'>('manage');
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogList, setCatalogList] = useState<Movie[]>(catalogService.getAll());
  const [requestsList, setRequestsList] = useState<MovieRequest[]>(movieRequestService.getAll());
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'added'>('all');
  const [originatingRequestId, setOriginatingRequestId] = useState<string | null>(null);

  // Estados da Sessão Cinema Especial
  const [adminSession, setAdminSession] = useState<CinemaSession>(() => cinemaSessionService.getActiveSession());
  const [sessionSaveFeedback, setSessionSaveFeedback] = useState<boolean>(false);
  const [sessionSearchMovie, setSessionSearchMovie] = useState<string>('');

  const handleSelectPreset = (presetId: string) => {
    const updated = cinemaSessionService.setPreset(presetId);
    setAdminSession(updated);
    setAdminActionMessage(`Sessão Cinema alterada para: "${updated.title}"!`);
    setTimeout(() => setAdminActionMessage(null), 3500);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    cinemaSessionService.updateSession(adminSession);
    setSessionSaveFeedback(true);
    setAdminActionMessage(`Sessão Cinema "${adminSession.title}" salva e ativada no portal!`);
    setTimeout(() => {
      setSessionSaveFeedback(false);
      setAdminActionMessage(null);
    }, 3500);
  };

  const handleAddMovieToSession = (movie: Movie) => {
    if (adminSession.movieIds.includes(movie.id)) return;
    const updated = {
      ...adminSession,
      movieIds: [...adminSession.movieIds, movie.id],
    };
    setAdminSession(updated);
    cinemaSessionService.updateSession(updated);
    setAdminActionMessage(`"${movie.title}" adicionado à Sessão Cinema!`);
    setTimeout(() => setAdminActionMessage(null), 3000);
  };

  const handleRemoveMovieFromSession = (movieId: string) => {
    const updated = {
      ...adminSession,
      movieIds: adminSession.movieIds.filter((id) => id !== movieId),
    };
    setAdminSession(updated);
    cinemaSessionService.updateSession(updated);
  };

  const handleMoveMovieInSession = (index: number, direction: 'up' | 'down') => {
    const newIds = [...adminSession.movieIds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newIds.length) return;
    const temp = newIds[index];
    newIds[index] = newIds[targetIdx];
    newIds[targetIdx] = temp;
    const updated = { ...adminSession, movieIds: newIds };
    setAdminSession(updated);
    cinemaSessionService.updateSession(updated);
  };

  // Estados de Assinaturas e Pagamentos
  const [accountsList, setAccountsList] = useState<UserAccount[]>(userService.getAllAccounts());
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);
  const [adminGeminiKey, setAdminGeminiKey] = useState<string>(geminiCurationService.getApiKey() || '');
  const [geminiKeySavedFeedback, setGeminiKeySavedFeedback] = useState<boolean>(false);

  // Estados do Jellyfin
  const [jfConfig, setJfConfig] = useState<JellyfinConfig>(jellyfinService.getConfig());
  const [jfStatus, setJfStatus] = useState<{ connected: boolean; serverName?: string; version?: string; message: string } | null>(null);
  const [jfTesting, setJfTesting] = useState(false);
  const [jfSyncing, setJfSyncing] = useState(false);
  const [jfSyncMessage, setJfSyncMessage] = useState<string | null>(null);

  // Estados de Configuração de Suporte
  const [supportSettings, setSupportSettings] = useState<SupportConfig>(() => supportConfigService.getConfig());
  const [supportSaveFeedback, setSupportSaveFeedback] = useState<boolean>(false);

  const handleSaveSupport = (e: React.FormEvent) => {
    e.preventDefault();
    supportConfigService.saveConfig(supportSettings);
    setSupportSaveFeedback(true);
    setAdminActionMessage('Configurações de Suporte salvas com sucesso!');
    setTimeout(() => {
      setSupportSaveFeedback(false);
      setAdminActionMessage(null);
    }, 3500);
  };

  const handleResetSupport = () => {
    if (window.confirm('Deseja restaurar as configurações padrão de suporte?')) {
      const def = supportConfigService.resetDefaults();
      setSupportSettings(def);
      setAdminActionMessage('Configurações de Suporte restauradas para o padrão!');
      setTimeout(() => setAdminActionMessage(null), 3500);
    }
  };

  useEffect(() => {
    const unsub = movieRequestService.subscribe(() => {
      setRequestsList(movieRequestService.getAll());
    });
    return unsub;
  }, []);

  // Estado para Adicionar / Editar
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genres, setGenres] = useState('Suspense, Cinema');
  const [tags, setTags] = useState('cult, clássico, grátis');
  const [moods, setMoods] = useState('intrigante, reflexivo');
  const [releaseYear, setReleaseYear] = useState<number>(1970);
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [channelName, setChannelName] = useState('Canal do YouTube');
  const [contentRating, setContentRating] = useState<ContentRating>('12');
  const [language, setLanguage] = useState<MovieLanguage>('Dublado');
  const [badge, setBadge] = useState('Acervo');
  const [ratingScore, setRatingScore] = useState<number>(7.8);
  const [posterUrl, setPosterUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const refreshCatalog = () => {
    setCatalogList(catalogService.getAll());
    if (onMovieUpdated) onMovieUpdated();
  };

  const extractVideoId = (url: string): string => {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : '';
  };

  const currentVideoId = extractVideoId(youtubeUrl);
  const derivedPoster = posterUrl || (currentVideoId ? `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg` : '');

  // Análise Automática com Gemini 3.8 Flash
  const handleAnalyzeWithAI = async () => {
    if (!currentVideoId) {
      alert('Insira uma URL válida do YouTube primeiro.');
      return;
    }

    setAnalyzing(true);
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
      } catch {
        // Ignora falha oEmbed
      }

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
      if (result.badge) setBadge(result.badge);
      if (result.channelName) setChannelName(result.channelName);
      if (result.ratingScore) setRatingScore(result.ratingScore);
      if (!posterUrl) {
        setPosterUrl(`https://img.youtube.com/vi/${currentVideoId}/maxresdefault.jpg`);
      }
    } catch (err) {
      console.error('Falha na análise:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartEdit = (movie: Movie) => {
    setEditingMovieId(movie.id);
    setYoutubeUrl(`https://www.youtube.com/watch?v=${movie.youtubeVideoId}`);
    setTitle(movie.title);
    setOriginalTitle(movie.originalTitle || '');
    setSynopsis(movie.synopsis);
    setGenres(movie.genres.join(', '));
    setTags(movie.tags.join(', '));
    setMoods(movie.moods.join(', '));
    setReleaseYear(movie.releaseYear);
    setDurationMinutes(movie.durationMinutes);
    setChannelName(movie.channelName);
    setContentRating(movie.contentRating);
    setLanguage(movie.language);
    setBadge(movie.badge || '');
    setRatingScore(movie.ratingScore);
    setPosterUrl(movie.posterUrl);
    setIsFeatured(Boolean(movie.featured));
    setActiveTab('add');
  };

  const resetForm = () => {
    setEditingMovieId(null);
    setOriginatingRequestId(null);
    setYoutubeUrl('');
    setTitle('');
    setOriginalTitle('');
    setSynopsis('');
    setGenres('Suspense, Cinema');
    setTags('cult, clássico, grátis');
    setMoods('intrigante, reflexivo');
    setReleaseYear(1970);
    setDurationMinutes(90);
    setChannelName('Canal do YouTube');
    setContentRating('12');
    setLanguage('Dublado');
    setBadge('Acervo');
    setRatingScore(7.8);
    setPosterUrl('');
    setIsFeatured(false);
  };

  const handleConvertRequestToMovie = (req: MovieRequest) => {
    resetForm();
    setOriginatingRequestId(req.id);
    setTitle(req.title);
    if (req.year) setReleaseYear(req.year);
    if (req.youtubeUrl) {
      setYoutubeUrl(req.youtubeUrl);
    }
    if (req.userNotes) {
      setSynopsis(req.userNotes);
    }
    setActiveTab('add');
  };

  const handleSaveMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVideoId || !title.trim()) {
      alert('Preencha a URL do YouTube e o título do filme.');
      return;
    }

    const moviePayload: Movie = {
      id: editingMovieId || `custom-${currentVideoId}-${Date.now()}`,
      youtubeVideoId: currentVideoId,
      title: title.trim(),
      originalTitle: originalTitle.trim() || undefined,
      synopsis: synopsis.trim(),
      genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
      tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
      moods: moods.split(',').map((m) => m.trim()).filter(Boolean),
      releaseYear: Number(releaseYear) || 1970,
      durationMinutes: Number(durationMinutes) || 90,
      posterUrl: derivedPoster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      backdropUrl: `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`,
      channelName: channelName.trim() || 'YouTube',
      contentRating,
      language,
      badge: badge.trim() || undefined,
      ratingScore: Number(ratingScore) || 7.5,
      featured: isFeatured,
      addedAt: new Date().toISOString(),
    };

    if (editingMovieId) {
      catalogService.updateMovie(editingMovieId, moviePayload);
    } else {
      catalogService.addMovie(moviePayload);
    }

    if (originatingRequestId) {
      movieRequestService.updateStatus(originatingRequestId, 'added', 'Cadastrado no catálogo oficial', moviePayload.id);
      setOriginatingRequestId(null);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      resetForm();
      refreshCatalog();
      setActiveTab('manage');
    }, 700);
  };

  const handleDeleteMovie = (id: string, titleName: string) => {
    if (confirm(`Tem certeza que deseja remover o filme "${titleName}" do catálogo?`)) {
      catalogService.removeMovie(id);
      refreshCatalog();
    }
  };

  const handleToggleFeatured = (movie: Movie) => {
    catalogService.updateMovie(movie.id, { featured: !movie.featured });
    refreshCatalog();
  };

  useEffect(() => {
    if (activeTab === 'jellyfin' && !jfStatus) {
      handleTestJellyfin();
    }
  }, [activeTab]);

  const handleTestJellyfin = async () => {
    setJfTesting(true);
    try {
      const res = await jellyfinService.checkConnection();
      setJfStatus(res);
    } finally {
      setJfTesting(false);
    }
  };

  const handleSaveJellyfinConfig = () => {
    jellyfinService.saveConfig(jfConfig);
    handleTestJellyfin();
    setJfSyncMessage('Configurações do Jellyfin salvas com sucesso!');
    setTimeout(() => setJfSyncMessage(null), 3500);
  };

  const handleSyncJellyfin = async () => {
    setJfSyncing(true);
    try {
      await catalogService.syncJellyfinMovies();
      refreshCatalog();
      const count = catalogService.getJellyfinMovies().length;
      setJfSyncMessage(`Sincronização concluída! ${count} filme(s) do Jellyfin carregado(s) no CAIC.`);
      setTimeout(() => setJfSyncMessage(null), 4000);
    } finally {
      setJfSyncing(false);
    }
  };

  const refreshAccounts = () => {
    setAccountsList(userService.getAllAccounts());
  };

  const handleAdminActivateIndividual = (account: UserAccount) => {
    userService.adminRecordPayment(account.id, 9.90, 'Aprovação Manual Admin', 'Plano Individual CAIC (R$ 9,90)');
    refreshAccounts();
    setAdminActionMessage(`Plano Individual (R$ 9,90) ativado com sucesso para ${account.name} (+30 dias)!`);
    setTimeout(() => setAdminActionMessage(null), 3500);
  };

  const handleAdminActivateFamily = (account: UserAccount) => {
    userService.adminRecordPayment(account.id, 14.90, 'Aprovação Manual Admin', 'Plano Família CAIC (R$ 14,90)');
    refreshAccounts();
    setAdminActionMessage(`Plano Família (R$ 14,90) ativado com sucesso para ${account.name} (+30 dias)!`);
    setTimeout(() => setAdminActionMessage(null), 3500);
  };

  const handleAdminAddTrial = (account: UserAccount) => {
    const currentEnd = account.trialEndDate ? new Date(account.trialEndDate).getTime() : Date.now();
    const newEnd = new Date(Math.max(Date.now(), currentEnd) + 7 * 86400000).toISOString();
    userService.adminUpdateAccount(account.id, {
      subscriptionStatus: 'trial',
      trialEndDate: newEnd,
      plan: 'Plano CAIC (7 Dias Grátis Estendido)',
    });
    refreshAccounts();
    setAdminActionMessage(`+7 Dias de Degustação adicionados para ${account.name}!`);
    setTimeout(() => setAdminActionMessage(null), 3500);
  };

  const handleAdminCancelSub = (account: UserAccount) => {
    if (confirm(`Deseja realmente suspender a assinatura de ${account.name}?`)) {
      userService.adminUpdateAccount(account.id, {
        subscriptionStatus: 'canceled',
      });
      refreshAccounts();
      setAdminActionMessage(`Assinatura de ${account.name} suspensa.`);
      setTimeout(() => setAdminActionMessage(null), 3500);
    }
  };

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    geminiCurationService.setApiKey(adminGeminiKey.trim());
    setGeminiKeySavedFeedback(true);
    setTimeout(() => setGeminiKeySavedFeedback(false), 3000);
  };

  const filteredCatalog = (catalogList || []).filter((m) => {
    if (!m) return false;
    const q = (searchTerm || '').toLowerCase();
    return (
      (m.title || '').toLowerCase().includes(q) ||
      (m.genres || []).some((g) => (g || '').toLowerCase().includes(q)) ||
      (m.channelName || '').toLowerCase().includes(q)
    );
  });

  if (!isAdminAuthenticated) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
          {/* Botão de Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Icon & Título */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center text-cyan-500 dark:text-cyan-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold border border-cyan-300 dark:border-cyan-800 mb-2">
              <Lock className="w-3 h-3" />
              <span>Acesso Restrito</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Painel Administrativo CAIC
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Informe suas credenciais de administrador para acessar a gestão de filmes, clientes e assinaturas.
            </p>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Usuário Administrador
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={adminUserDraft}
                  onChange={(e) => setAdminUserDraft(e.target.value)}
                  placeholder="Digite o usuário administrador"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={adminPasswordDraft}
                  onChange={(e) => setAdminPasswordDraft(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition disabled:opacity-60 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Entrar no Painel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition cursor-pointer"
            >
              Voltar para o Streaming
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Settings className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Painel Administrativo CAIC</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-300 dark:border-cyan-800">
                  Gestão &amp; Controle
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Gestão do acervo, assinaturas de usuários, pagamentos e chaves de IA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAdminLogout}
              title="Desconectar do Admin"
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <button
              onClick={onClose}
              title="Fechar Janela"
              className="tv-focusable p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="shrink-0 w-full bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {/* TAB 1: GERENCIAR CATÁLOGO */}
            <button
              onClick={() => {
                setActiveTab('manage');
                resetForm();
              }}
              className={`tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25 ring-2 ring-cyan-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Gerenciar Catálogo</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'manage' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {catalogList.length}
              </span>
            </button>

            {/* TAB: SESSÃO CINEMA ESPECIAL */}
            <button
              onClick={() => setActiveTab('session')}
              className={`tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'session'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40 font-black'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-sm">🍿</span>
              <span>Sessão Cinema</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'session' ? 'bg-slate-950 text-amber-400' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
              }`}>
                {adminSession.dateBadge}
              </span>
            </button>

            {/* TAB 2: ADICIONAR FILME COM IA */}
            <button
              onClick={() => setActiveTab('add')}
              className={`tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25 ring-2 ring-cyan-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{editingMovieId ? 'Editar Filme' : 'Adicionar Filme com IA'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'add' ? 'bg-white/20 text-white' : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
              }`}>
                IA
              </span>
            </button>

            {/* TAB 3: PEDIDOS DOS USUÁRIOS */}
            <button
              onClick={() => setActiveTab('requests')}
              className={`tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Film className="w-4 h-4 shrink-0" />
              <span>Pedidos dos Usuários</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {requestsList.length}
              </span>
              {movieRequestService.getPendingCount() > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                  {movieRequestService.getPendingCount()} pendentes
                </span>
              )}
            </button>

            {/* TAB 4: ASSINATURAS & CLIENTES */}
            <button
              onClick={() => {
                setActiveTab('subscriptions');
                refreshAccounts();
              }}
              className={`tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'subscriptions'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Assinaturas &amp; Pagamentos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'subscriptions' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {accountsList.length}
              </span>
            </button>

            {/* TAB 5: SERVIDOR JELLYFIN */}
            <button
              onClick={() => setActiveTab('jellyfin')}
              className={`tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'jellyfin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>Servidor Jellyfin</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'jellyfin' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
              }`}>
                API Remota
              </span>
            </button>

            {/* TAB 6: SUPORTE & CONTATO (WHATSAPP E E-MAIL) */}
            <button
              onClick={() => setActiveTab('support')}
              className={`tv-focusable px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Headphones className="w-4 h-4 shrink-0" />
              <span>Suporte &amp; Contato</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'support'
                  ? 'bg-white/20 text-white'
                  : supportSettings.enabled
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {supportSettings.enabled ? 'Ativo' : 'Pausado'}
              </span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: GERENCIAR CATÁLOGO (LISTA / EDIÇÃO / EXCLUSÃO) */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por título, gênero ou canal..."
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('add');
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Novo Filme</span>
                </button>
              </div>

              {/* Tabela de Filmes */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5">Filme</th>
                        <th className="p-3.5">Ano / Duração</th>
                        <th className="p-3.5">Gêneros</th>
                        <th className="p-3.5">Canal Distribuidor</th>
                        <th className="p-3.5 text-center">Destaque</th>
                        <th className="p-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredCatalog.map((movie) => (
                        <tr key={movie.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3.5 flex items-center gap-3">
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="w-10 h-14 object-cover rounded-lg bg-slate-900 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{movie.title}</h5>
                              <p className="text-[11px] text-slate-400 truncate">ID: {movie.youtubeVideoId}</p>
                            </div>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <span>{movie.releaseYear}</span>
                            <span className="text-slate-400 text-[11px] block">{movie.durationMinutes} min</span>
                          </td>

                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(movie.genres || []).slice(0, 2).map((g) => (
                                <span key={g} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="p-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                            {movie.channelName || 'YouTube'}
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleToggleFeatured(movie)}
                              title={movie.featured ? 'Remover dos Destaques' : 'Tornar Destaque na Home'}
                              className={`p-1.5 rounded-lg transition ${
                                movie.featured
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-slate-400 hover:text-amber-500'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${movie.featured ? 'fill-amber-400' : ''}`} />
                            </button>
                          </td>

                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onPreviewMovie(movie)}
                                title="Assistir / Pré-visualizar"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleStartEdit(movie)}
                                title="Editar dados do filme"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteMovie(movie.id, movie.title)}
                                title="Excluir do catálogo"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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

          {/* TAB: CONFIGURAÇÃO DA SESSÃO CINEMA ESPECIAL */}
          {activeTab === 'session' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Notificação de Sucesso */}
              {adminActionMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{adminActionMessage}</span>
                </div>
              )}

              {/* Card de Apresentação e Status */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-300 dark:border-amber-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center text-2xl shadow-md">
                      🍿
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Sessão Cinema em Cartaz</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                          {adminSession.active ? 'Ativa no Portal' : 'Pausada'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Esta sessão especial fica em destaque no topo da tela inicial com maratona sequencial para todos os usuários.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...adminSession, active: !adminSession.active };
                      setAdminSession(updated);
                      cinemaSessionService.updateSession(updated);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      adminSession.active
                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {adminSession.active ? 'Pausar Sessão' : 'Ativar Sessão'}
                  </button>
                </div>
              </div>

              {/* CARD DE PRESETS RÁPIDOS (1 CLIQUE) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Escolher Tema Rápido (1 Clique)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Alterne instantaneamente o tema</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {SESSION_PRESETS.map((preset) => {
                    const isSelected = adminSession.id === preset.id;
                    const presetEmoji =
                      preset.id === 'velozes_furiosos' ? '🏎️' :
                      preset.id === 'jackie_chan' ? '🥋' :
                      preset.id === 'natal' ? '🎄' : '💥';

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 dark:border-amber-400 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">{presetEmoji}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {preset.dateBadge}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                            {preset.title.replace('Sessão Cinema: ', '').replace('Sessão ', '')}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {preset.subtitle}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold">{preset.movieIds.length} filmes</span>
                          {isSelected && <span className="font-bold text-amber-600 dark:text-amber-400">Ativo ✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FORMULÁRIO DE EDIÇÃO DA SESSÃO */}
              <form onSubmit={handleSaveSession} className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Personalizar Detalhes da Sessão
                  </h4>
                  <span className="text-[11px] text-slate-500">Altere títulos, datas e sequência livremente</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Título da Sessão Cinema
                    </label>
                    <input
                      type="text"
                      required
                      value={adminSession.title}
                      onChange={(e) => setAdminSession({ ...adminSession, title: e.target.value })}
                      placeholder="Ex: Sessão Velozes & Furiosos"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Selo de Data / Período
                    </label>
                    <input
                      type="text"
                      required
                      value={adminSession.dateBadge}
                      onChange={(e) => setAdminSession({ ...adminSession, dateBadge: e.target.value })}
                      placeholder="Ex: Especial 13/10 ou Temporada de Natal"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subtítulo / Descrição da Maratona
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={adminSession.subtitle}
                    onChange={(e) => setAdminSession({ ...adminSession, subtitle: e.target.value })}
                    placeholder="Descrição da programação especial para os cinéfilos..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Etiqueta de Destaque
                    </label>
                    <input
                      type="text"
                      value={adminSession.highlightTag}
                      onChange={(e) => setAdminSession({ ...adminSession, highlightTag: e.target.value })}
                      placeholder="Ex: MARATONA EM SEQUÊNCIA"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cor do Tema
                    </label>
                    <select
                      value={adminSession.accentColor}
                      onChange={(e) => setAdminSession({ ...adminSession, accentColor: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="amber">Âmbar / Laranja (Adrenalina)</option>
                      <option value="cyan">Ciano / Azul (Artes Marciais / Sci-Fi)</option>
                      <option value="emerald">Esmeralda / Verde (Natal / Família)</option>
                      <option value="purple">Roxo / Índigo (Clássicos Retrô)</option>
                      <option value="rose">Rosa / Vermelho (Ação Intensa)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ícone Visual
                    </label>
                    <select
                      value={adminSession.icon}
                      onChange={(e) => setAdminSession({ ...adminSession, icon: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="car">Carro de Corrida 🏎️</option>
                      <option value="swords">Espadas / Artes Marciais ⚔️</option>
                      <option value="gift">Presente de Natal 🎁</option>
                      <option value="flame">Fogo / Adrenalina 🔥</option>
                      <option value="clapperboard">Claquete de Cinema 🎬</option>
                      <option value="star">Estrela ⭐</option>
                    </select>
                  </div>
                </div>

                {/* FILMES NA SEQUÊNCIA DA SESSÃO */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Sequência de Filmes da Maratona ({adminSession.movieIds.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Estes filmes serão exibidos na ordem exata definida abaixo: 1º, 2º, 3º...
                      </p>
                    </div>
                  </div>

                  {/* Lista de Filmes Selecionados */}
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 bg-slate-50 dark:bg-slate-950/60 max-h-80 overflow-y-auto">
                    {adminSession.movieIds.map((movieId, idx) => {
                      const movie = catalogList.find((m) => m.id === movieId);
                      if (!movie) return null;

                      return (
                        <div
                          key={`session-item-${movie.id}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}º
                            </span>
                            <img
                              src={movie.posterUrl}
                              alt=""
                              className="w-8 h-11 object-cover rounded-md shrink-0 border border-slate-200 dark:border-slate-800"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {movie.title}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {movie.releaseYear} • {movie.durationMinutes} min • {(movie.genres || []).slice(0, 2).join(', ')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveMovieInSession(idx, 'up')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === adminSession.movieIds.length - 1}
                              onClick={() => handleMoveMovieInSession(idx, 'down')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMovieFromSession(movie.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Remover da sessão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Campo de Busca para Adicionar Mais Filmes do Catálogo */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Adicionar Filme do Catálogo à Sessão
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={sessionSearchMovie}
                        onChange={(e) => setSessionSearchMovie(e.target.value)}
                        placeholder="Buscar por título para incluir na sequência..."
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {sessionSearchMovie.trim().length > 1 && (
                      <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-md">
                        {catalogList
                          .filter((m) =>
                            m.title.toLowerCase().includes(sessionSearchMovie.toLowerCase().trim())
                          )
                          .slice(0, 8)
                          .map((m) => {
                            const alreadyInSession = adminSession.movieIds.includes(m.id);

                            return (
                              <div
                                key={`search-add-${m.id}`}
                                className="p-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={m.posterUrl} alt="" className="w-6 h-8 object-cover rounded shrink-0" />
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {m.title} ({m.releaseYear})
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  disabled={alreadyInSession}
                                  onClick={() => {
                                    handleAddMovieToSession(m);
                                    setSessionSearchMovie('');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                    alreadyInSession
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-sm'
                                  }`}
                                >
                                  {alreadyInSession ? 'Já Incluído' : '+ Adicionar'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Salvar Alterações */}
                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{sessionSaveFeedback ? 'Sessão Salva com Sucesso!' : 'Salvar e Ativar Sessão Cinema no Portal'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ADICIONAR / EDITAR FILME COM IA */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveMovie} className="space-y-5 max-w-3xl mx-auto">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {editingMovieId ? 'Editar Dados do Filme' : 'Cadastrar Novo Filme no Catálogo'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Insira o link do YouTube e clique em <strong>Analisar com IA</strong> para o Gemini extrair sinopse, tags, gênero e humor automaticamente.
                </p>
              </div>

              {/* YouTube Link Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Link do YouTube ou ID do Vídeo
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyzeWithAI}
                    disabled={!currentVideoId || analyzing}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analisando com IA...</span>
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
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                  <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
                    <img
                      src={derivedPoster}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-5 h-5 text-white/90 fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Vídeo Detectado</span>
                    <h5 className="font-bold text-slate-900 dark:text-white truncate">{title || 'Título será preenchido...'}</h5>
                    <p className="text-[11px] text-slate-400 truncate">{channelName}</p>
                  </div>
                </div>
              )}

              {/* Grid de Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Título Original</label>
                  <input
                    type="text"
                    value={originalTitle}
                    onChange={(e) => setOriginalTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sinopse</label>
                <textarea
                  rows={3}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Gêneros (separados por vírgula)</label>
                  <input
                    type="text"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Humores (Moods)</label>
                  <input
                    type="text"
                    value={moods}
                    onChange={(e) => setMoods(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ano</label>
                  <input
                    type="number"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Duração (min)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Canal Distribuidor</label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Selo / Badge</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Checkbox Destaque na Home */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                />
                <label htmlFor="featured-checkbox" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Exibir como filme em <strong>Destaque Principal na Home (Hero Banner)</strong>
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('manage');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!currentVideoId || !title.trim()}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition disabled:opacity-50"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" /> Salvo com Sucesso!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> {editingMovieId ? 'Salvar Alterações' : 'Publicar no Catálogo'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PEDIDOS DOS USUÁRIOS (SOLICITAÇÕES DA COMUNIDADE) */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Fila de Filmes Sugeridos pelos Usuários
                  </h4>
                  <p className="text-amber-800 dark:text-amber-300/90 text-[11px] mt-0.5">
                    Quando os usuários pesquisam filmes fora do catálogo, eles podem pedir o título. Encontre links no YouTube e cadastre com 1 clique!
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-amber-200 dark:border-amber-800">
                  <button
                    onClick={() => setRequestFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      requestFilter === 'all'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Todos ({requestsList.length})
                  </button>
                  <button
                    onClick={() => setRequestFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      requestFilter === 'pending'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Pendentes ({movieRequestService.getPendingCount()})
                  </button>
                  <button
                    onClick={() => setRequestFilter('added')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      requestFilter === 'added'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Adicionados ({requestsList.filter((r) => r.status === 'added').length})
                  </button>
                </div>
              </div>

              {/* Lista de Pedidos */}
              <div className="space-y-3">
                {requestsList
                  .filter((r) => {
                    if (requestFilter === 'pending') return r.status === 'pending' || r.status === 'searching';
                    if (requestFilter === 'added') return r.status === 'added';
                    return true;
                  })
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {req.title}
                          </h5>
                          {req.year && (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                              {req.year}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              req.status === 'added'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {req.status === 'added' ? '✓ Adicionado ao Catálogo' : 'Aguardando Localização'}
                          </span>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium ml-auto">
                            <ThumbsUp className="w-3 h-3 text-cyan-600" />
                            {req.upvotes} votos de usuários
                          </span>
                        </div>

                        {req.userNotes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                            "{req.userNotes}"
                          </p>
                        )}

                        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-3">
                          <span>Sugerido por: <strong className="text-slate-700 dark:text-slate-300">{req.suggestedBy}</strong></span>
                          <span>•</span>
                          <span>Data: {new Date(req.requestDate).toLocaleDateString('pt-BR')}</span>
                          {req.youtubeUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={req.youtubeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-600 dark:text-cyan-400 underline flex items-center gap-1"
                              >
                                Link Fornecido <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ações do Administrador */}
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                        {/* Botão Buscar no YouTube */}
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(req.title + (req.year ? ` ${req.year}` : '') + ' filme completo dublado')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Abrir busca do YouTube em nova aba"
                        >
                          <Search className="w-3.5 h-3.5 text-red-500" />
                          <span>Buscar no YouTube</span>
                        </a>

                        {/* Botão Cadastrar Filme */}
                        <button
                          onClick={() => handleConvertRequestToMovie(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition"
                          title="Preencher formulário para cadastrar no catálogo"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Cadastrar Filme</span>
                        </button>

                        {/* Alternar Status */}
                        <select
                          value={req.status}
                          onChange={(e) =>
                            movieRequestService.updateStatus(
                              req.id,
                              e.target.value as MovieRequest['status'],
                              'Atualizado no painel de administração'
                            )
                          }
                          className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="pending">Pendente</option>
                          <option value="added">Adicionado</option>
                          <option value="not_found">Não Encontrado</option>
                        </select>

                        {/* Excluir Pedido */}
                        <button
                          onClick={() => {
                            if (confirm(`Remover pedido de "${req.title}"?`)) {
                              movieRequestService.remove(req.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                {requestsList.length === 0 && (
                  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Inbox className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Nenhum pedido de filme no momento.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: INTEGRAÇÃO JELLYFIN MEDIA SERVER */}
          {activeTab === 'jellyfin' && (
            <div className="space-y-6">
              {/* Header da Aba */}
              <div className="p-5 rounded-2xl glass-card border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Servidor Jellyfin Local
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800">
                        Streaming Nativo
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Conecte sua biblioteca local para rodar filmes no CAIC via player de vídeo HTML5 próprio
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleTestJellyfin}
                    disabled={jfTesting}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${jfTesting ? 'animate-spin' : ''}`} />
                    <span>{jfTesting ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>
                  <button
                    onClick={handleSyncJellyfin}
                    disabled={jfSyncing}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${jfSyncing ? 'animate-spin' : ''}`} />
                    <span>{jfSyncing ? 'Sincronizando...' : 'Sincronizar Filmes'}</span>
                  </button>
                </div>
              </div>

              {/* Mensagem de Feedback */}
              {jfSyncMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{jfSyncMessage}</span>
                </div>
              )}

              {/* Status da Conexão */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                jfStatus?.connected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  {jfStatus?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {jfStatus?.connected ? 'Servidor Conectado & Online' : 'Servidor Desconectado ou Não Autorizado'}
                    </span>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {jfStatus ? jfStatus.message : 'Verificando conexão com o Jellyfin...'}
                    </p>
                  </div>
                </div>

                {jfStatus?.connected && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-700">
                    Porta 8096 Ativa
                  </span>
                )}
              </div>

              {/* Formulário de Configuração */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    URL do Servidor Jellyfin:
                  </label>
                  <input
                    type="text"
                    value={jfConfig.serverUrl}
                    onChange={(e) => setJfConfig({ ...jfConfig, serverUrl: e.target.value })}
                    placeholder="http://localhost:8096"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-500">Padrão local: http://localhost:8096</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Chave de API (API Key):
                  </label>
                  <input
                    type="password"
                    value={jfConfig.apiKey}
                    onChange={(e) => setJfConfig({ ...jfConfig, apiKey: e.target.value })}
                    placeholder="Cole a chave gerada no Jellyfin"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-500">Gerada no Jellyfin em: Painel de Controle &gt; Chaves de API</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Limite de Filmes Sincronizados (Para Testes Leves):
                  </label>
                  <select
                    value={jfConfig.maxMovies}
                    onChange={(e) => setJfConfig({ ...jfConfig, maxMovies: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value={3}>3 filmes (Ultraleve para teste rápido)</option>
                    <option value={5}>5 filmes (Recomendado para validação)</option>
                    <option value={10}>10 filmes</option>
                    <option value={25}>25 filmes</option>
                    <option value={100}>100 filmes</option>
                    <option value={0}>Todos os filmes do acervo</option>
                  </select>
                  <p className="text-[11px] text-slate-500">Evita puxar muitos filmes de uma vez enquanto você estiver testando localmente</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Status da Integração no Portal:
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={jfConfig.enabled}
                        onChange={(e) => setJfConfig({ ...jfConfig, enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Exibir filmes do Jellyfin no catálogo do CAIC</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-2 flex justify-end">
                  <button
                    onClick={handleSaveJellyfinConfig}
                    className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition flex items-center gap-1.5 shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Configurações</span>
                  </button>
                </div>
              </div>

              {/* Como Adicionar Poucos Filmes no Jellyfin */}
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-bold">
                  <Film className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Como testar com apenas 1 ou 2 filmes sem ocupar espaço no notebook:</span>
                </div>
                <ol className="list-decimal list-inside text-xs text-amber-900/90 dark:text-amber-300 space-y-1.5 leading-relaxed pl-1">
                  <li>Crie uma pasta no seu computador (por exemplo: <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">C:\Filmes_Teste</code>).</li>
                  <li>Coloque 1 ou 2 arquivos de vídeo nela (formatos <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">.mp4</code> ou <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">.mkv</code>).</li>
                  <li>No painel do Jellyfin (<a href="http://localhost:8096" target="_blank" rel="noreferrer" className="underline font-bold text-amber-700 dark:text-amber-300">http://localhost:8096</a>), vá em <strong>Menu &gt; Painel de Controle &gt; Bibliotecas</strong>.</li>
                  <li>Clique em <strong>Adicionar Biblioteca de Mídia</strong>, selecione o tipo <strong>Filmes</strong> e adicione a pasta criada.</li>
                  <li>Volte aqui e clique no botão roxo <strong>Sincronizar Filmes</strong> — eles aparecerão no CAIC com badge <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white font-bold text-[10px]">Jellyfin</span> e rodarão direto no player próprio!</li>
                </ol>
              </div>

              {/* Lista dos Filmes do Jellyfin Atualmente Carregados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Filmes do Jellyfin Integrados ({catalogService.getJellyfinMovies().length})
                  </h4>
                  <span className="text-xs text-slate-500">
                    {catalogService.getJellyfinMovies().length > 0 ? 'Disponíveis no catálogo' : 'Nenhum filme sincronizado ainda'}
                  </span>
                </div>

                {catalogService.getJellyfinMovies().length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <HardDrive className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Sua biblioteca do Jellyfin ainda não tem filmes cadastrados ou escaneados.
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
                      Adicione 1 ou 2 vídeos na pasta do Jellyfin e clique em Sincronizar Filmes acima para validar!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {catalogService.getJellyfinMovies().map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3"
                      >
                        <img
                          src={m.posterUrl}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded-lg shadow-sm flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {m.title}
                          </h5>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {m.genres.join(', ')} • {m.durationMinutes}m
                          </p>
                          <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Jellyfin Stream
                          </span>
                        </div>
                        <button
                          onClick={() => onPreviewMovie(m)}
                          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition flex-shrink-0"
                          title="Testar reprodução no player"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: GESTÃO DE ASSINATURAS, PAGAMENTOS & API GEMINI */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              {/* Notificação de Ação Administrativa */}
              {adminActionMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{adminActionMessage}</span>
                </div>
              )}

              {/* CARD 1: CONFIGURAÇÃO EXCLUSIVA DA CHAVE GOOGLE GEMINI API */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 border border-cyan-300 dark:border-cyan-800 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-cyan-500 text-slate-950 shadow-md">
                      <Key className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                        <span>Chave Google Gemini API (Exclusivo Administrador)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-300 dark:border-cyan-800">
                          {adminGeminiKey ? 'Chave Configurada' : 'Modo Demonstração'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Esta chave fica exclusivamente restrita a este painel administrativo. Ela alimenta as buscas por linguagem natural, o chat dos filmes e os agentes CAIC.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 text-xs font-bold flex items-center gap-1.5 hover:border-cyan-400 transition"
                  >
                    <span>Obter Chave no Google AI Studio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <form onSubmit={handleSaveGeminiKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="flex-1 relative">
                    <input
                      type="password"
                      value={adminGeminiKey}
                      onChange={(e) => setAdminGeminiKey(e.target.value)}
                      placeholder="AIzaSy... (Cole sua Gemini API Key)"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                    {adminGeminiKey && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Salva
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/20 transition flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{geminiKeySavedFeedback ? 'Salvo com Sucesso!' : 'Salvar Chave API'}</span>
                  </button>
                </form>
              </div>

              {/* CARD 2: CARDS RESUMO DE ASSINATURAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total de Contas</p>
                  <p className="text-xl font-black text-slate-950 dark:text-white mt-1">{accountsList.length}</p>
                  <span className="text-[10px] text-slate-400">Usuários cadastrados</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">Em Teste (7 Dias)</p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {accountsList.filter((a) => a.subscriptionStatus === 'trial').length}
                  </p>
                  <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Degustação ativa</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Assinantes Ativos</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {accountsList.filter((a) => a.subscriptionStatus === 'active').length}
                  </p>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Mensal ou Anual</span>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60">
                  <p className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Receita Registrada</p>
                  <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                    R$ {accountsList.reduce((acc, a) => acc + (a.lastPaymentAmount || 0), 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-cyan-600/80 dark:text-cyan-400/80">Total recebido</span>
                </div>
              </div>

              {/* CARD 3: TABELA DE GESTÃO DE USUÁRIOS E ASSINATURAS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Controle de Usuários e Pagamentos ({accountsList.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">Ative assinaturas manualmente, conceda dias extras de teste grátis e controle o acesso</p>
                  </div>
                  <button
                    onClick={refreshAccounts}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Atualizar Lista</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3.5">Usuário</th>
                          <th className="p-3.5">Plano Atual</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Vigência / Expiração</th>
                          <th className="p-3.5">Último Pagamento</th>
                          <th className="p-3.5 text-right">Ações do Administrador</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {accountsList.map((acc) => {
                          const isTrial = acc.subscriptionStatus === 'trial';
                          const isActive = acc.subscriptionStatus === 'active';
                          const isCanceled = acc.subscriptionStatus === 'canceled';

                          return (
                            <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/60 transition">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  <img src={acc.avatar} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{acc.name}</p>
                                    <p className="text-[11px] text-slate-500">{acc.email}</p>
                                    {acc.phone && <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">📱 {acc.phone}</p>}
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {acc.plan}
                                </span>
                                <span className="block text-[10px] text-slate-400 capitalize">
                                  Tipo: {acc.subscriptionPlan || 'free'}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                  isTrial
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                                    : isActive
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}>
                                  {isTrial ? '7 Dias Grátis' : isActive ? 'Ativo' : isCanceled ? 'Cancelado' : 'Gratuito'}
                                </span>
                              </td>

                              <td className="p-3.5 text-slate-600 dark:text-slate-400">
                                {isTrial && acc.trialEndDate ? (
                                  <div>
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      Degustação até {new Date(acc.trialEndDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : isActive && acc.subscriptionExpiresAt ? (
                                  <div>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      Ativo até {new Date(acc.subscriptionExpiresAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">Sem renovação ativa</span>
                                )}
                              </td>

                              <td className="p-3.5">
                                {acc.lastPaymentAmount ? (
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                      R$ {acc.lastPaymentAmount.toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                      {acc.paymentMethod || 'PIX'} • {acc.lastPaymentDate ? new Date(acc.lastPaymentDate).toLocaleDateString() : ''}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Nenhum pagamento</span>
                                )}
                              </td>

                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => handleAdminActivateIndividual(acc)}
                                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] shadow-sm transition"
                                    title="Aprovar e ativar 30 dias de Plano Individual (R$ 9,90)"
                                  >
                                    +30d Individual
                                  </button>

                                  <button
                                    onClick={() => handleAdminActivateFamily(acc)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm transition"
                                    title="Aprovar e ativar 30 dias de Plano Família (R$ 14,90)"
                                  >
                                    +30d Família
                                  </button>

                                  <button
                                    onClick={() => handleAdminAddTrial(acc)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-[11px] transition"
                                    title="Adicionar mais 7 dias de degustação gratuita"
                                  >
                                    +7d Grátis
                                  </button>

                                  {acc.subscriptionStatus === 'active' && (
                                    <button
                                      onClick={() => handleAdminCancelSub(acc)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold transition"
                                      title="Suspender assinatura"
                                    >
                                      Suspender
                                    </button>
                                  )}
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
            </div>
          )}

          {/* TAB 6: CONFIGURAÇÃO DE SUPORTE & CONTATO (WHATSAPP E E-MAIL) */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Headphones className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        Canais de Suporte &amp; Atendimento ao Cliente
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure os dados de WhatsApp e E-mail exibidos no rodapé do portal para tirar dúvidas e atender assinantes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      supportSettings.enabled
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${supportSettings.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{supportSettings.enabled ? 'Suporte Ativo no Rodapé' : 'Suporte Oculto'}</span>
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveSupport} className="space-y-5">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Exibir Opção "Fale com o Suporte" no Rodapé</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Permite aos visitantes e assinantes acionar o suporte diretamente na parte inferior da página.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={supportSettings.enabled}
                        onChange={(e) => setSupportSettings({ ...supportSettings, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* WhatsApp */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">WhatsApp de Atendimento</h4>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          wa.me Oficial
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Número com DDD (ex: 49 9 88595465)
                        </label>
                        <input
                          type="text"
                          value={supportSettings.whatsappPhone}
                          onChange={(e) => setSupportSettings({ ...supportSettings, whatsappPhone: e.target.value })}
                          placeholder="49 9 88595465"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Mensagem Inicial Pré-definida
                        </label>
                        <textarea
                          rows={2}
                          value={supportSettings.whatsappMessage}
                          onChange={(e) => setSupportSettings({ ...supportSettings, whatsappMessage: e.target.value })}
                          placeholder="Olá! Preciso de suporte com o aplicativo CAIC Cinema."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                      </div>

                      {/* Prévia e Teste */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-500">
                          Exibição: <strong className="text-slate-800 dark:text-slate-200">{supportConfigService.formatDisplayPhone(supportSettings.whatsappPhone)}</strong>
                        </div>
                        <a
                          href={supportConfigService.getWhatsAppUrl(supportSettings.whatsappPhone, supportSettings.whatsappMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Testar WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* E-mail de Suporte */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-cyan-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">E-mail de Suporte</h4>
                        </div>
                        <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800">
                          Gmail / Oficial
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Endereço de E-mail de Atendimento
                        </label>
                        <input
                          type="email"
                          value={supportSettings.supportEmail}
                          onChange={(e) => setSupportSettings({ ...supportSettings, supportEmail: e.target.value })}
                          placeholder="caic.cinema.app@gmail.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Horários / Texto Informativo
                        </label>
                        <input
                          type="text"
                          value={supportSettings.supportHoursText}
                          onChange={(e) => setSupportSettings({ ...supportSettings, supportHoursText: e.target.value })}
                          placeholder="Atendimento via WhatsApp e E-mail todos os dias"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                      </div>

                      {/* Teste E-mail */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          E-mail: <strong className="text-slate-800 dark:text-slate-200">{supportSettings.supportEmail}</strong>
                        </div>
                        <a
                          href={supportConfigService.getEmailUrl(supportSettings.supportEmail, 'Suporte CAIC Cinema')}
                          className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Testar E-mail</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleResetSupport}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                    >
                      Restaurar Padrão (WhatsApp &amp; Gmail)
                    </button>

                    <div className="flex items-center gap-3">
                      {supportSaveFeedback && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Salvo com sucesso!</span>
                        </span>
                      )}

                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Configurações de Suporte</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[AdminDashboard Runtime Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Painel Administrativo
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ocorreu um erro ao carregar os dados administrativos:
            </p>
            <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl text-left overflow-auto max-h-32 border border-rose-200 dark:border-rose-900">
              {this.state.error?.message || 'Erro inesperado'}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition"
              >
                Tentar Recarregar
              </button>
              <button
                type="button"
                onClick={this.props.onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <AdminErrorBoundary onClose={props.onClose}>
      <AdminDashboardView {...props} />
    </AdminErrorBoundary>
  );
};
