import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Check,
  Plus,
  Trash2,
  Heart,
  History,
  Sparkles,
  LogOut,
  LogIn,
  CreditCard,
  Play,
  CheckCircle2,
  Shield,
  Clock,
  Calendar,
  Settings,
  RotateCcw,
  Crown,
  Zap,
  Receipt,
  Gift,
  Lock,
  Upload,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { userService, AVATAR_PRESETS } from '../services/userService';
import { catalogService } from '../services/catalogService';
import { emailVerificationService } from '../services/emailVerificationService';
import { EmailVerificationModal } from './EmailVerificationModal';
import type { UserProfile, Movie, UserAccount, EraPreference, PacingPreference } from '../types/movie';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  onAccountChanged?: () => void;
  onOpenAdmin?: () => void;
}

const AVAILABLE_STYLES = [
  { id: 'vandamme', label: 'Clássicos de Ação (Jean-Claude Van Damme)', desc: 'Chutes giratórios, combates lendários, Timecop e Retroceder Nunca' },
  { id: 'martial', label: 'Artes Marciais (Jackie Chan / Jet Li)', desc: 'Lutas clássicas, acrobacias e combates espetaculares de Hong Kong' },
  { id: 'hollywood', label: 'Astros do Cinema (Dolph Lundgren / Russell Crowe / Banderas)', desc: 'Ação explosiva, carisma e thrillers com grandes estrelas' },
  { id: 'nacional', label: 'Cinema Nacional / Chico Xavier', desc: 'Grandes produções brasileiras e histórias biográficas tocantes' },
  { id: 'guerra', label: 'Ação de Guerra e Tanques (KV1, Batalha das Ardenas)', desc: 'Confrontos da Segunda Guerra, estratégia e tanques blindados' },
  { id: 'monstros', label: 'Monstros e Criaturas Gigantes (Mega Shark, Megalodon)', desc: 'Tubarões colossais, dragões e catástrofes extremas da natureza' },
  { id: 'hackers', label: 'Espionagem & Hackers (Invasores, Hacker)', desc: 'Invasões cibernéticas, dark web e reviravoltas tecnológicas geniais' },
  { id: 'biblico', label: 'Fé, Bíblico e Espiritualidade (Davi e Golias, Bíblia Sagrada)', desc: 'Histórias religiosas, compaixão, amor ao próximo e milagres' },
  { id: 'survival', label: 'Terror e Sobrevivência na Floresta (Aterro Maldito, O Massacre)', desc: 'Perseguição implacável na mata fechada, isolamento e tensão máxima' },
];

const ERA_OPTIONS: Array<{ id: EraPreference; label: string; desc: string }> = [
  { id: 'todos', label: 'Todas as Épocas', desc: 'Gosto de clássicos nostálgicos e lançamentos modernos' },
  { id: 'classicos', label: 'Clássicos (Anos 80 e 90)', desc: 'Nostalgia retrô e produções clássicas' },
  { id: 'anos2000', label: 'Anos 2000 a 2015', desc: 'A era dos DVDs, ação explosiva e suspense dinâmico' },
  { id: 'recentes', label: 'Lançamentos Recentes (2016+)', desc: 'Filmes contemporâneos em alta definição' },
];

const PACING_OPTIONS: Array<{ id: PacingPreference; label: string; desc: string }> = [
  { id: 'qualquer', label: 'Qualquer Duração', desc: 'O importante é o enredo envolver e prender' },
  { id: 'rapido', label: 'Filmes Rápidos (Até 90 min)', desc: 'Direto ao ponto, dinâmico e sem enrolação' },
  { id: 'epico', label: 'Histórias Épicas (100min+)', desc: 'Desenvolvimento detalhado e universos aprofundados' },
];

const UserProfileModalContent: React.FC<UserProfileModalProps> = ({
  isOpen: _isOpen,
  onClose,
  onSelectMovie,
  onAccountChanged,
  onOpenAdmin: _onOpenAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'subscription' | 'preferences' | 'favorites' | 'history' | 'profiles'>('account');
  const [currentAccount, setCurrentAccount] = useState<UserAccount>(userService.getAccount());
  const [activeProfile, setActiveProfile] = useState<UserProfile>(userService.getActiveProfile());
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(userService.getProfiles());

  // Subscription state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cartão de Crédito' | 'PIX' | 'Boleto'>('PIX');
  const [subscribingMessage, setSubscribingMessage] = useState<string | null>(null);

  // Form states para Login / Cadastro
  const [isRegistering, setIsRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Estados de Verificação de Token de E-mail
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationSandboxCode, setVerificationSandboxCode] = useState<string | undefined>();
  const [pendingRegisterData, setPendingRegisterData] = useState<{ name: string; email: string; password?: string } | null>(null);

  // Form states para criação de perfil
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0].url);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Refs e Handlers para Upload de Foto do Usuário
  const accountPhotoInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'account' | 'newProfile') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAuthMessage('A foto selecionada deve ter no máximo 5MB.');
      setTimeout(() => setAuthMessage(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      if (target === 'account') {
        userService.updateProfileAvatar(activeProfile.id, dataUrl);
        refreshState();
        setAuthMessage('Foto de perfil atualizada com sucesso!');
        setTimeout(() => setAuthMessage(null), 2500);
      } else {
        setSelectedAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const availableGenres = ['Ação', 'Drama', 'Comédia', 'Terror', 'Suspense', 'Ficção Científica', 'Histórico', 'Guerra', 'Família', 'Animação'];
  const availableMoods = ['adrenalina', 'emocionante', 'divertido', 'tenso', 'reflexivo', 'arrepiante', 'leve', 'espiritual', 'épico'];

  // Estados do Quiz Cinéfilo
  const [quizFavoriteGenres, setQuizFavoriteGenres] = useState<string[]>(
    activeProfile?.tasteQuiz?.favoriteGenres || activeProfile?.preferredGenres || ['Ação', 'Drama']
  );
  const [quizActorsAndStyles, setQuizActorsAndStyles] = useState<string[]>(
    activeProfile?.tasteQuiz?.favoriteActorsAndStyles || ['Artes Marciais (Jackie Chan / Jet Li)', 'Cinema Nacional / Chico Xavier']
  );
  const [quizEra, setQuizEra] = useState<EraPreference>(
    activeProfile?.tasteQuiz?.eraPreference || 'todos'
  );
  const [quizPacing, setQuizPacing] = useState<PacingPreference>(
    activeProfile?.tasteQuiz?.pacingPreference || 'qualquer'
  );
  const [quizMoods, setQuizMoods] = useState<string[]>(
    activeProfile?.tasteQuiz?.moodVibePreference || activeProfile?.preferredMoods || ['adrenalina', 'emocionante']
  );
  const [quizSavedFeedback, setQuizSavedFeedback] = useState<boolean>(false);

  const refreshState = () => {
    const acc = userService.getAccount();
    const prof = userService.getActiveProfile();
    const profs = userService.getProfiles();
    setCurrentAccount(acc);
    setActiveProfile(prof);
    setAllProfiles(profs);
    if (onAccountChanged) onAccountChanged();
  };

  useEffect(() => {
    refreshState();
  }, []);

  useEffect(() => {
    setQuizFavoriteGenres(activeProfile?.tasteQuiz?.favoriteGenres || activeProfile?.preferredGenres || ['Ação', 'Drama']);
    setQuizActorsAndStyles(activeProfile?.tasteQuiz?.favoriteActorsAndStyles || ['Artes Marciais (Jackie Chan / Jet Li)', 'Cinema Nacional / Chico Xavier']);
    setQuizEra(activeProfile?.tasteQuiz?.eraPreference || 'todos');
    setQuizPacing(activeProfile?.tasteQuiz?.pacingPreference || 'qualquer');
    setQuizMoods(activeProfile?.tasteQuiz?.moodVibePreference || activeProfile?.preferredMoods || ['adrenalina', 'emocionante']);
  }, [activeProfile?.id]);

  const handleSaveQuiz = () => {
    userService.updateTasteQuiz({
      favoriteGenres: quizFavoriteGenres,
      favoriteActorsAndStyles: quizActorsAndStyles,
      eraPreference: quizEra,
      pacingPreference: quizPacing,
      moodVibePreference: quizMoods,
      hasAnsweredQuiz: true,
    });
    refreshState();
    setQuizSavedFeedback(true);
    setTimeout(() => setQuizSavedFeedback(false), 2500);
  };

  const handleToggleQuizGenre = (genre: string) => {
    setQuizFavoriteGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleToggleQuizStyle = (styleLabel: string) => {
    setQuizActorsAndStyles((prev) =>
      prev.includes(styleLabel) ? prev.filter((s) => s !== styleLabel) : [...prev, styleLabel]
    );
  };

  const handleToggleQuizMood = (mood: string) => {
    setQuizMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleLoginSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!emailInput.trim()) return;

    if (isRegistering) {
      // Solicita envio do token de validação de 6 dígitos para o e-mail
      setAuthMessage('Enviando código de verificação para o seu e-mail...');
      try {
        const sendRes = await emailVerificationService.sendVerificationCode(emailInput, nameInput || 'Novo Assinante');
        setAuthMessage(null);
        setVerificationSandboxCode(sendRes.sandboxCode);
        setPendingRegisterData({
          name: nameInput.trim() || 'Novo Assinante',
          email: emailInput.trim(),
          password: passwordInput,
        });
        setIsVerifyingEmail(true);
      } catch (err: any) {
        setAuthMessage(err.message || 'Erro ao enviar código de validação.');
      }
      return;
    }

    // Login direto
    const res = userService.login(emailInput, passwordInput);
    setAuthMessage(res.message);
    if (res.success) {
      setEmailInput('');
      setPasswordInput('');
      setNameInput('');
      refreshState();
      setTimeout(() => {
        setAuthMessage(null);
        setActiveTab('account');
        onClose();
      }, 900);
    }
  };

  const handleEmailVerificationSuccess = () => {
    if (pendingRegisterData) {
      const res = userService.register(
        pendingRegisterData.name,
        pendingRegisterData.email,
        pendingRegisterData.password
      );
      setAuthMessage(res.message);
      setEmailInput('');
      setPasswordInput('');
      setNameInput('');
      setPendingRegisterData(null);
      refreshState();
      setTimeout(() => {
        setAuthMessage(null);
        setActiveTab('account');
        onClose();
      }, 1000);
    }
  };

  const handleLogout = () => {
    userService.logout();
    refreshState();
    setActiveTab('account');
    setAuthMessage('Você saiu da sua conta.');
    setTimeout(() => setAuthMessage(null), 1500);
  };

  const handleSwitchProfile = (profileId: string) => {
    userService.setActiveProfile(profileId);
    refreshState();
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const check = userService.canCreateProfile();
    if (!check.allowed) {
      alert(check.reason || 'Limite de perfis atingido.');
      return;
    }
    userService.createProfile(newProfileName.trim(), selectedAvatar);
    setNewProfileName('');
    setIsCreatingProfile(false);
    refreshState();
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm('Deseja excluir este perfil?')) {
      userService.deleteProfile(profileId);
      refreshState();
    }
  };

  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const handleSubscribe = (plan: 'individual' | 'family', cycle?: 'monthly' | 'annual') => {
    const chosenCycle = cycle || selectedBillingCycle;
    const res = userService.subscribePlan(plan, chosenCycle, selectedPaymentMethod);
    setSubscribingMessage(res.message);
    refreshState();
    setTimeout(() => {
      setSubscribingMessage(null);
    }, 4500);
  };

  const handleCancelPlan = () => {
    if (confirm('Deseja realmente cancelar a sua assinatura?')) {
      const res = userService.cancelSubscription();
      setSubscribingMessage(res.message);
      refreshState();
      setTimeout(() => {
        setSubscribingMessage(null);
      }, 3500);
    }
  };

  // Filmes favoritos e assistidos do perfil ativo
  const favoriteMovies = ((activeProfile?.favoriteMovieIds) || [])
    .map((id) => catalogService.getById(id))
    .filter(Boolean) as Movie[];

  const historyMovies = ((activeProfile?.watchHistory) || [])
    .map((item) => ({
      movie: catalogService.getById(item.movieId),
      watchedAt: item.watchedAt,
    }))
    .filter((item) => Boolean(item.movie)) as { movie: Movie; watchedAt: string }[];

  const isAuthenticated = Boolean(currentAccount?.isAuthenticated);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3.5">
            <img
              src={activeProfile?.avatar || AVATAR_PRESETS[0].url}
              alt={activeProfile?.name || 'Perfil'}
              className="w-11 h-11 rounded-2xl object-cover border-2 border-cyan-500 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {isAuthenticated ? (currentAccount?.name || 'Usuário') : 'Visitante'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isAuthenticated
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}>
                  {isAuthenticated ? (currentAccount?.plan || 'Assinante') : 'Modo Convidado'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isAuthenticated
                  ? `Perfil ativo: ${activeProfile?.name || 'Padrão'} • E-mail: ${currentAccount?.email || ''}`
                  : 'Faça login para salvar seus filmes e personalizar a IA'}
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

        {/* Feedback de Autenticação */}
        {authMessage && (
          <div className="bg-cyan-500 text-slate-950 px-6 py-2.5 text-xs font-bold text-center animate-fadeIn flex items-center justify-center gap-2 shadow-inner">
            <CheckCircle2 className="w-4 h-4" />
            <span>{authMessage}</span>
          </div>
        )}

        {/* Navegação entre Abas */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 px-6 gap-1 sm:gap-2 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('account')}
            className={`tv-focusable py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'account'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Painel da Conta</span>
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={`tv-focusable py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'subscription'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span>💳 Planos &amp; 7 Dias Grátis</span>
            {currentAccount.subscriptionStatus === 'trial' && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500 text-white font-extrabold animate-pulse">
                7D Grátis
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthMessage('Crie sua conta ou faça login para personalizar seus gostos cinéfilos.');
                setTimeout(() => setAuthMessage(null), 3500);
                return;
              }
              setActiveTab('preferences');
            }}
            disabled={!isAuthenticated}
            className={`tv-focusable py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              !isAuthenticated
                ? 'border-transparent text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                : activeTab === 'preferences'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
            title={!isAuthenticated ? 'Disponível apenas para contas cadastradas' : undefined}
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>🎯 Quiz Cinéfilo &amp; Gostos</span>
            {!isAuthenticated && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthMessage('Crie sua conta ou faça login para salvar filmes na Minha Lista.');
                setTimeout(() => setAuthMessage(null), 3500);
                return;
              }
              setActiveTab('favorites');
            }}
            disabled={!isAuthenticated}
            className={`tv-focusable py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              !isAuthenticated
                ? 'border-transparent text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                : activeTab === 'favorites'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
            title={!isAuthenticated ? 'Disponível apenas para contas cadastradas' : undefined}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Minha Lista ({favoriteMovies.length})</span>
            {!isAuthenticated && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthMessage('Crie sua conta ou faça login para ver seus filmes assistidos.');
                setTimeout(() => setAuthMessage(null), 3500);
                return;
              }
              setActiveTab('history');
            }}
            disabled={!isAuthenticated}
            className={`tv-focusable py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              !isAuthenticated
                ? 'border-transparent text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                : activeTab === 'history'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
            title={!isAuthenticated ? 'Disponível apenas para contas cadastradas' : undefined}
          >
            <History className="w-4 h-4 text-emerald-500" />
            <span>Já Assistidos ({historyMovies.length})</span>
            {!isAuthenticated && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {isAuthenticated && (
            <button
              onClick={() => setActiveTab('profiles')}
              className={`tv-focusable py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'profiles'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Perfis da Família ({allProfiles.length})</span>
            </button>
          )}
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ABA 1: PAINEL DA CONTA / LOGIN / LOGOFF */}
          {activeTab === 'account' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {isAuthenticated ? (
                /* ESTADO LOGADO */
                <div className="space-y-6 animate-fadeIn">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={currentAccount?.avatar || AVATAR_PRESETS[0].url}
                        alt={currentAccount?.name || 'Usuário'}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-slate-950 dark:text-white">
                            {currentAccount?.name || 'Usuário'}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                            Conectado
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{currentAccount?.email || ''}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <CreditCard className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Plano: <strong>{currentAccount?.plan || 'CAIC'}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('subscription')}
                          className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>Planos &amp; 7 Dias Grátis</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <a
                        href="http://localhost:5174"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                        title="Acessar o Painel Administrativo dedicado na porta 5174"
                      >
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <span>Área Administrativa (Porta 5174)</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>

                      <button
                        onClick={handleLogout}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-bold text-xs flex items-center justify-center gap-2 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Fazer Logoff (Sair)</span>
                      </button>
                    </div>
                  </div>

                  {/* Personalização de Foto e Avatar do Perfil */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Personalizar Foto &amp; Avatar ({activeProfile?.name}):
                        </h5>
                      </div>

                      {/* Botão de Upload de Foto */}
                      <div>
                        <input
                          ref={accountPhotoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'account')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => accountPhotoInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Fazer Upload de Foto</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Escolha um dos 14 avatares cinéfilos abaixo ou envie sua própria foto do computador/celular:
                    </p>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 pt-1">
                      {AVATAR_PRESETS.map((av) => {
                        const isCurrent = activeProfile?.avatar === av.url;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => {
                              userService.updateProfileAvatar(activeProfile.id, av.url);
                              refreshState();
                              setAuthMessage(`Avatar alterado para "${av.label}"!`);
                              setTimeout(() => setAuthMessage(null), 2000);
                            }}
                            className={`group relative rounded-2xl p-1 border transition-all text-center flex flex-col items-center ${
                              isCurrent
                                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 shadow-md ring-2 ring-cyan-500/30'
                                : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400 bg-slate-50 dark:bg-slate-900/50'
                            }`}
                            title={av.label}
                          >
                            <img
                              src={av.url}
                              alt={av.label}
                              className="w-11 h-11 rounded-xl object-cover"
                            />
                            {isCurrent && (
                              <div className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 p-0.5 rounded-full shadow-sm">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                            <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 group-hover:text-cyan-600">
                              {av.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ESTADO DESLOGADO (LOGIN / CADASTRO) */
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 mx-auto flex items-center justify-center mb-2 shadow-md">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-extrabold text-slate-950 dark:text-white">
                      {isRegistering ? 'Criar Minha Conta no CAIC' : 'Entrar na Minha Conta'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Faça login para salvar suas preferências de gênero, criar sua lista pessoal e alimentar as sugestões do CAIC.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLoginSubmit(e);
                    }}
                    className="space-y-3.5 max-w-md mx-auto"
                  >
                    {isRegistering && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Seu Nome</label>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Ex: João da Silva"
                          required
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="seu-email@exemplo.com"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLoginSubmit(e);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isRegistering ? 'Cadastrar e Entrar' : 'Entrar na Conta'}</span>
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setIsRegistering((prev) => !prev)}
                        className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                      >
                        {isRegistering ? 'Já tenho uma conta? Fazer Login' : 'Ainda não tem conta? Criar Conta Gratuita'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: PLANOS & 7 DIAS GRÁTIS */}
          {activeTab === 'subscription' && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn pb-6">
              {/* Feedback de Assinatura */}
              {subscribingMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 flex items-center gap-3 animate-fadeIn shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{subscribingMessage}</p>
                </div>
              )}

              {/* Status Atual da Assinatura */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-cyan-500/10 to-indigo-500/10 border border-amber-300/40 dark:border-amber-700/40 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-md">
                      <Crown className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                          Status: {currentAccount.plan}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                          currentAccount.subscriptionStatus === 'trial'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                            : currentAccount.subscriptionStatus === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}>
                          {currentAccount.subscriptionStatus === 'trial'
                            ? 'Período Grátis de Testes'
                            : currentAccount.subscriptionStatus === 'active'
                            ? 'Assinatura Ativa'
                            : 'Plano Gratuito / Expirado'}
                        </span>
                      </div>

                      {currentAccount.subscriptionStatus === 'trial' ? (
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                          🎉 Você tem <strong>{userService.getTrialDaysRemaining()} dias restantes</strong> de 7 dias grátis para aproveitar todo o acervo sem cobrança!
                          {currentAccount.trialEndDate && (
                            <span className="block text-[11px] text-slate-500 mt-0.5">
                              Término do período promocional: {new Date(currentAccount.trialEndDate).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      ) : currentAccount.subscriptionStatus === 'active' ? (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                          Acesso completo e ilimitado habilitado em todos os dispositivos.
                          {currentAccount.subscriptionExpiresAt && (
                            <span className="block text-[11px] text-slate-500 mt-0.5">
                              Válido até: {new Date(currentAccount.subscriptionExpiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Ative seus 7 dias de degustação gratuita sem cobrança imediata em qualquer um dos planos abaixo.
                        </p>
                      )}
                    </div>
                  </div>

                  {currentAccount.subscriptionStatus === 'active' && (
                    <button
                      type="button"
                      onClick={handleCancelPlan}
                      className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
                    >
                      Cancelar Assinatura
                    </button>
                  )}
                </div>
              </div>

              {/* Escolha do Método de Pagamento preferencial */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-cyan-500" />
                  <span>Método de Pagamento Preferencial (Cobrança somente após os 7 dias):</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PIX', 'Cartão de Crédito', 'Boleto'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        selectedPaymentMethod === method
                          ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-500 text-cyan-900 dark:text-cyan-100 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      {selectedPaymentMethod === method && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aviso Importante de Concorrência: 1 Acesso por Vez */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <h5 className="font-extrabold text-amber-900 dark:text-amber-300">
                    Regra de Concorrência: 1 Acesso Ativo por Vez
                  </h5>
                  <p className="text-amber-800/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                    Ambos os planos garantem <strong>1 reprodução simultânea por conta</strong>. Se você estiver assistindo no celular e alguém der play na TV Box ou computador com a mesma conta, a nova reprodução é bloqueada para proteger o acesso.
                  </p>
                </div>
              </div>

              {/* Seletor de Ciclo de Cobrança: Mensal vs Anual */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('monthly')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      selectedBillingCycle === 'monthly'
                        ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    Cobrança Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('annual')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedBillingCycle === 'annual'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>Cobrança Anual</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold uppercase">
                      Mais Econômico
                    </span>
                  </button>
                </div>
              </div>

              {/* Tabela de Planos Oficiais: Individual vs Família */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* PLANO INDIVIDUAL (1 PESSOA) */}
                <div className={`rounded-3xl border p-5 flex flex-col justify-between transition relative overflow-hidden ${
                  currentAccount.subscriptionPlan === 'individual'
                    ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30 shadow-md ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-cyan-400'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        1 Pessoa • 1 Perfil
                      </span>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" /> 7 Dias Grátis
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-950 dark:text-white">Plano Individual</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-slate-950 dark:text-white">
                          R$ {selectedBillingCycle === 'annual' ? '19,90' : '5,90'}
                        </span>
                        <span className="text-xs text-slate-500">
                          /{selectedBillingCycle === 'annual' ? 'ano' : 'mês'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {selectedBillingCycle === 'annual'
                          ? 'Equivale a apenas R$ 1,65 por mês! (12 meses de acesso)'
                          : 'Sem fidelidade • Cancele a qualquer momento'}
                      </p>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span><strong>7 dias gratuitos</strong> para testar sem custo</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span><strong>1 perfil</strong> exclusivo na conta</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span><strong>1 acesso por vez</strong> (proteção de tela única)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Catálogo completo CAIC (YouTube + Jellyfin)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>IA CAIC em todos os filmes & busca semântica</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => handleSubscribe('individual', selectedBillingCycle)}
                      className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition ${
                        currentAccount.subscriptionPlan === 'individual' && currentAccount.subscriptionStatus === 'active'
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-default'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>
                        {currentAccount.subscriptionPlan === 'individual' && currentAccount.subscriptionStatus === 'active'
                          ? 'Plano Atual Ativo'
                          : `Iniciar 7 Dias Grátis (Individual - R$ ${selectedBillingCycle === 'annual' ? '19,90/ano' : '5,90/mês'})`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* PLANO FAMÍLIA (ATÉ 3 PERFIS) */}
                <div className={`rounded-3xl border-2 p-5 flex flex-col justify-between transition relative overflow-hidden ${
                  currentAccount.subscriptionPlan === 'family'
                    ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-lg ring-2 ring-amber-500/20'
                    : 'border-amber-400 dark:border-amber-600 bg-gradient-to-b from-amber-500/5 to-transparent dark:bg-slate-950 shadow-md'
                }`}>
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm">
                    Até 3 Perfis
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        ⭐ Mais Escolhido
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-950 dark:text-white">Plano Família</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-slate-950 dark:text-white">
                          R$ {selectedBillingCycle === 'annual' ? '29,90' : '9,90'}
                        </span>
                        <span className="text-xs text-slate-500">
                          /{selectedBillingCycle === 'annual' ? 'ano' : 'mês'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                        {selectedBillingCycle === 'annual'
                          ? 'Equivale a apenas R$ 2,49 por mês para toda a família!'
                          : 'Apenas R$ 3,30 por perfil na conta!'}
                      </p>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span><strong>7 dias gratuitos</strong> de teste completo</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span><strong>Até 3 perfis</strong> com fotos e IA individuais</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span><strong>1 acesso por vez</strong> (reprodução na residência)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Perfil Kids & modo infantil</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Catálogo completo CAIC (YouTube + Jellyfin)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => handleSubscribe('family', selectedBillingCycle)}
                      className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition ${
                        currentAccount.subscriptionPlan === 'family' && currentAccount.subscriptionStatus === 'active'
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-default'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-amber-500/25'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      <span>
                        {currentAccount.subscriptionPlan === 'family' && currentAccount.subscriptionStatus === 'active'
                          ? 'Plano Atual Ativo'
                          : `Iniciar 7 Dias Grátis (Família - R$ ${selectedBillingCycle === 'annual' ? '29,90/ano' : '9,90/mês'})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Histórico de Pagamentos e Comprovantes */}
              {currentAccount.paymentHistory && currentAccount.paymentHistory.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-cyan-500" />
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Seu Histórico de Cobranças & Recibos:
                    </h5>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Data</th>
                          <th className="p-3">Descrição / Plano</th>
                          <th className="p-3">Método</th>
                          <th className="p-3">Valor</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {currentAccount.paymentHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {item.date && !isNaN(new Date(item.date).getTime()) ? new Date(item.date).toLocaleDateString() : 'Hoje'}
                            </td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              {item.plan || 'Plano CAIC'}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {item.method || 'PIX'}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {item.amount === 0 ? 'Grátis (Teste)' : `R$ ${Number(item.amount || 0).toFixed(2)}`}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Confirmado
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: QUIZ CINÉFILO & MEUS GOSTOS (MOTOR DA IA E RECOMENDAÇÕES) */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn pb-6">
              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-extrabold text-cyan-950 dark:text-cyan-100">
                      Quiz Cinéfilo de {activeProfile.name}
                    </h4>
                    <p className="text-cyan-800 dark:text-cyan-300 mt-0.5 leading-relaxed">
                      Responda às perguntas abaixo sobre seus gostos. Essas respostas ajustam a inteligência artificial para recomendar títulos do catálogo com máxima precisão!
                    </p>
                  </div>
                </div>
                {quizSavedFeedback && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white animate-pulse whitespace-nowrap shadow-sm">
                    Salvo com sucesso!
                  </span>
                )}
              </div>

              {/* 1. GÊNEROS FAVORITOS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Gêneros que Mais Gosta de Assistir</span>
                    <span className="text-slate-400 font-normal">({quizFavoriteGenres.length} selecionados)</span>
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableGenres.map((genre) => {
                    const isSelected = quizFavoriteGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleToggleQuizGenre(genre)}
                        className={`tv-focusable text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-600/20'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-cyan-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{genre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. ATORES & ESTILOS DE CINEMA */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>2. Atores & Temas Marcantes que Você Curte</span>
                  <span className="text-slate-400 font-normal">({quizActorsAndStyles.length} ativos)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_STYLES.map((style) => {
                    const isSelected = quizActorsAndStyles.includes(style.label);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleToggleQuizStyle(style.label)}
                        className={`tv-focusable text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-500 text-slate-950 dark:text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center border flex-shrink-0 ${
                          isSelected ? 'bg-cyan-600 border-cyan-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-snug">{style.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{style.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. ÉPOCA DOS FILMES (ANTIGOS OU NOVOS) */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>3. Preferência de Época: Filmes Antigos ou Recentes?</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ERA_OPTIONS.map((era) => {
                    const isSelected = quizEra === era.id;
                    return (
                      <button
                        key={era.id}
                        type="button"
                        onClick={() => setQuizEra(era.id)}
                        className={`tv-focusable text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-slate-950 dark:text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border flex-shrink-0 ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-snug">{era.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{era.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. RITMO & DURAÇÃO */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>4. Ritmo & Duração do Filme</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PACING_OPTIONS.map((pacing) => {
                    const isSelected = quizPacing === pacing.id;
                    return (
                      <button
                        key={pacing.id}
                        type="button"
                        onClick={() => setQuizPacing(pacing.id)}
                        className={`tv-focusable text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-500 text-slate-950 dark:text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <p className="text-xs font-bold leading-snug">{pacing.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">{pacing.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. VIBE & SENSAÇÕES */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  5. Sensações & Clima Geral Desejados ({quizMoods.length} selecionados)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableMoods.map((mood) => {
                    const isSelected = quizMoods.includes(mood);
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => handleToggleQuizMood(mood)}
                        className={`tv-focusable text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>#{mood}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BOTÃO SALVAR QUIZ */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
                  Suas respostas alimentam a fileira <strong>"Recomendados para Você"</strong> e o <strong>CAIC</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/25 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Meu Perfil Cinéfilo</span>
                </button>
              </div>
            </div>
          )}

          {/* ABA 3: MINHA LISTA (FAVORITOS) */}
          {activeTab === 'favorites' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Filmes Salvos na Minha Lista
                  </h4>
                  <p className="text-xs text-slate-500">Filmes favoritados no catálogo ou no chat da IA</p>
                </div>
                <span className="text-xs font-bold text-rose-500">{favoriteMovies.length} títulos</span>
              </div>

              {favoriteMovies.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <Heart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sua lista está vazia.</p>
                  <p className="text-[11px] text-slate-400">Clique no ícone de coração nos filmes para salvar aqui!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {favoriteMovies.map((movie) => (
                    <div
                      key={movie.id}
                      onClick={() => {
                        onSelectMovie(movie);
                        onClose();
                      }}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-cyan-500 transition shadow-sm"
                    >
                      <div className="relative aspect-[2/3] bg-slate-900">
                        <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>
                      <div className="p-2 text-xs">
                        <h5 className="font-bold text-slate-900 dark:text-white truncate">{movie.title}</h5>
                        <p className="text-[10px] text-slate-500">{movie.releaseYear} • {movie.genres[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: HISTÓRICO DE ASSISTIDOS */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Histórico de Filmes Já Assistidos
                  </h4>
                  <p className="text-xs text-slate-500">Filmes que você já deu play ou marcou como assistido</p>
                </div>
                <span className="text-xs font-bold text-emerald-500">{historyMovies.length} assistidos</span>
              </div>

              {historyMovies.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Nenhum filme assistido recentemente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyMovies.map(({ movie, watchedAt }) => (
                    <div
                      key={movie.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-cyan-500 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={movie.posterUrl} alt={movie.title} className="w-10 h-14 object-cover rounded-lg bg-slate-900 flex-shrink-0" />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{movie.title}</h5>
                          <p className="text-[10px] text-slate-500">{movie.durationMinutes} min • {movie.genres.join(', ')}</p>
                          <span className="text-[9px] text-slate-400">Visto em {new Date(watchedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectMovie(movie);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm transition flex-shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rever</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 5: PERFIS DA FAMÍLIA (MULTI-PERFIL ESTILO NETFLIX) */}
          {activeTab === 'profiles' && isAuthenticated && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Perfis da Assinatura CAIC</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      {allProfiles.length} de {userService.getMaxProfilesAllowed()} perfis
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">Cada perfil tem seu próprio histórico, avatar e recomendações de IA</p>
                </div>
                <button
                  onClick={() => {
                    const check = userService.canCreateProfile();
                    if (!check.allowed) {
                      alert(check.reason || 'Limite de perfis atingido.');
                      return;
                    }
                    setIsCreatingProfile(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Perfil</span>
                </button>
              </div>

              {/* Banner de Upgrade se atingiu o limite do Plano Individual */}
              {allProfiles.length >= userService.getMaxProfilesAllowed() && userService.getMaxProfilesAllowed() === 1 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Limite do Plano Individual (1 perfil) atingido
                    </h5>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      Faça o upgrade para o <strong>Plano Família (R$ 14,90/mês)</strong> e crie até 3 perfis com foto, histórico e IA exclusivos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('subscription')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shadow-sm transition"
                  >
                    Mudar para Plano Família
                  </button>
                </div>
              )}

              {/* Lista de Perfis */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allProfiles.map((p) => {
                  const isActive = p.id === activeProfile.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSwitchProfile(p.id)}
                      className={`p-3.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-between ${
                        isActive
                          ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="relative mb-2">
                        <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400 shadow-sm" />
                        {isActive && (
                          <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-950 p-1 rounded-full shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</h5>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        {p.isKid ? 'Perfil Kids' : 'Perfil Geral'}
                      </span>
                      {!isActive && allProfiles.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProfile(p.id);
                          }}
                          className="mt-2 text-slate-400 hover:text-red-500 p-1 rounded transition"
                          title="Excluir perfil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Formulário de Novo Perfil */}
              {isCreatingProfile && (
                <form onSubmit={handleCreateProfile} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Criar Novo Perfil Familiar:
                    </h5>
                    {/* Botão de Upload de Foto para o Novo Perfil */}
                    <div>
                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'newProfile')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Fazer Upload de Foto</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Ou escolha um dos 14 avatares abaixo:
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {AVATAR_PRESETS.map((av) => (
                        <img
                          key={av.id}
                          src={av.url}
                          alt={av.label}
                          title={av.label}
                          onClick={() => setSelectedAvatar(av.url)}
                          className={`w-11 h-11 rounded-xl object-cover cursor-pointer border-2 transition ${
                            selectedAvatar === av.url ? 'border-cyan-500 scale-105 shadow-md ring-2 ring-cyan-500/30' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nome do perfil:
                    </label>
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="Ex: Maria, Pedro, Filmes dos Filhos..."
                      required
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProfile(false)}
                      className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-xl font-bold shadow-sm"
                    >
                      Salvar Perfil
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Modal de Validação de Token de E-mail */}
      <EmailVerificationModal
        isOpen={isVerifyingEmail}
        onClose={() => setIsVerifyingEmail(false)}
        email={pendingRegisterData?.email || emailInput}
        userName={pendingRegisterData?.name || nameInput || 'Novo Assinante'}
        initialSandboxCode={verificationSandboxCode}
        onVerificationSuccess={handleEmailVerificationSuccess}
      />
    </div>
  );
};

interface UserProfileErrorBoundaryProps {
  children: React.ReactNode;
  onClose?: () => void;
}

interface UserProfileErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class UserProfileErrorBoundary extends React.Component<UserProfileErrorBoundaryProps, UserProfileErrorBoundaryState> {
  constructor(props: UserProfileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): UserProfileErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Erro no painel do usuário:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Painel da Conta
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ocorreu uma instabilidade ao carregar os dados do perfil.
            </p>
            {this.state.error && (
              <p className="text-[11px] font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl text-left overflow-auto max-h-24">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onClose) this.props.onClose();
                }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 py-2.5 bg-cyan-600 text-white font-bold text-xs rounded-xl hover:bg-cyan-500 transition"
              >
                Recarregar App
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const UserProfileModal: React.FC<UserProfileModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <UserProfileErrorBoundary onClose={props.onClose}>
      <UserProfileModalContent {...props} />
    </UserProfileErrorBoundary>
  );
};

