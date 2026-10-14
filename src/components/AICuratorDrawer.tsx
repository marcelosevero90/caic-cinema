import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Play,
  Star,
  Bot,
  User,
  Trash2,
  Smile,
  Heart,
  Search,
  Check,
  Globe,
  Mic,
  Compass,
  ShieldCheck
} from 'lucide-react';
import type { Movie, ChatMessage, UserProfile } from '../types/movie';
import { geminiCurationService } from '../services/geminiCurationService';
import { userService } from '../services/userService';
import { movieRequestService } from '../services/movieRequestService';
import { catalogService } from '../services/catalogService';
import {
  KEY_QUESTIONS,
  DEFAULT_MOVIE_QUICK_REPLIES,
  shouldAttachMovieCards
} from '../services/curatorGuardrails';

interface AICuratorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayMovie: (movie: Movie) => void;
  initialPrompt?: string;
  activeProfile?: UserProfile;
  onToggleFavorite?: (movieId: string) => void;
  onOpenMovieSuggestion?: (query?: string) => void;
}

interface MoodCardOption {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  prompt: string;
  color: string;
}

const MOOD_OPTIONS: MoodCardOption[] = [
  {
    id: 'animais',
    emoji: '🐾',
    title: 'Animais & Cães Amigos',
    subtitle: 'Cães leais, bichinhos fofos e aventuras com vida selvagem',
    prompt: 'Me recomende os melhores filmes sobre animais, cães leais ou bichos de estimação do catálogo!',
    color: 'from-emerald-500/20 to-lime-500/20 border-lime-500/30 text-lime-700 dark:text-lime-400'
  },
  {
    id: 'adrenalina',
    emoji: '⚡',
    title: 'Adrenalina Pura',
    subtitle: 'Tiroteios, perseguições e artes marciais eletrizantes',
    prompt: 'Quero um filme com muita adrenalina, perseguição e artes marciais para me empolgar hoje!',
    color: 'from-amber-500/20 to-orange-500/20 border-orange-500/30 text-orange-600 dark:text-orange-400'
  },
  {
    id: 'rir',
    emoji: '😂',
    title: 'Quero Rir e Relaxar',
    subtitle: 'Comédia leve, confusões e boas risadas sem estresse',
    prompt: 'Estou cansado e quero uma comédia divertida e leve para dar boas risadas!',
    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-amber-600 dark:text-yellow-400'
  },
  {
    id: 'hacker',
    emoji: '💻',
    title: 'Cibercrime & Reviravoltas',
    subtitle: 'Submundo dos hackers, computadores e suspense genial',
    prompt: 'Quero um suspense inteligente sobre hackers, invasões de sistemas e crimes tecnológicos com reviravoltas!',
    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'fe',
    emoji: '🙏',
    title: 'Fé & Superação Real',
    subtitle: 'Histórias espirituais, biografias comoventes e esperança',
    prompt: 'Procuro uma história emocionante e edificante sobre fé, espiritualidade e superação humana!',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
  },
  {
    id: 'familia',
    emoji: '🍿',
    title: 'Pipoca em Família',
    subtitle: 'Histórias infantis, bichinhos e robôs para todas as idades',
    prompt: 'Quero um filme aprovado para assistir junto com a família e crianças hoje à noite!',
    color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-rose-600 dark:text-rose-400'
  },
  {
    id: 'susto',
    emoji: '👻',
    title: 'Levar Susto no Escuro',
    subtitle: 'Monstros marinhos, zumbis sanguinários e noites sombrias',
    prompt: 'Quero um filme de terror com monstros, zumbis ou assassinos para sentir medo no escuro!',
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-600 dark:text-purple-400'
  },
  {
    id: 'rapido',
    emoji: '⏳',
    title: 'Pouco Tempo (Até 90min)',
    subtitle: 'Filmes curtos e dinâmicos para a noite',
    prompt: 'Tenho pouco tempo disponível, me recomende filmes ótimos com no máximo 90 minutos de duração!',
    color: 'from-sky-500/20 to-cyan-500/20 border-sky-500/30 text-sky-600 dark:text-sky-400'
  },
  {
    id: 'guerra',
    emoji: '🎖️',
    title: 'Batalhas & Histórias Reais',
    subtitle: 'Tanques da Segunda Guerra, revoltas históricas e heroísmo',
    prompt: 'Quero um épico de guerra com tanques ou baseado em fatos reais sobre a Segunda Guerra Mundial!',
    color: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-600 dark:text-red-400'
  }
];

export const AICuratorDrawer: React.FC<AICuratorDrawerProps> = ({
  isOpen,
  onClose,
  onPlayMovie,
  initialPrompt,
  activeProfile,
  onToggleFavorite,
  onOpenMovieSuggestion,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá${activeProfile ? `, **${activeProfile.name}**` : ''}! Sou o **CAIC**, seu concierge pessoal de filmes e streaming 🎬🍿\n\nEstou aqui exclusivamente para ajudar você a encontrar o filme perfeito no nosso catálogo completo! Para começarmos uma busca precisa, me diga o que deseja ou toque em uma das opções abaixo:`,
      timestamp: 'Agora',
      recommendedMovies: [],
      quickReplies: [
        '🍿 Sozinho(a) com boa história',
        '💑 Sessão a dois em Casal',
        '👨‍👩‍👧‍👦 Filme para a Família & Crianças',
        '😂 Quero rir e relaxar',
        '⚡ Muita ação e adrenalina',
        '⏳ Rápido (Até 90min)',
        '🎯 Perguntas Chaves do Dia'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showKeyQuestions, setShowKeyQuestions] = useState(false);
  const [visibleMovieCounts, setVisibleMovieCounts] = useState<Record<string, number>>({});
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListeningVoice(false);
      setVoiceNotice(null);
    }
  }, [isOpen]);

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Reconhecimento de voz não suportado neste navegador. Use Chrome ou Edge.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isListeningVoice) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListeningVoice(false);
      setVoiceNotice(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setVoiceNotice('🎙️ Ouvindo você... Fale o filme ou tema desejado!');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setInput(transcript);
          setVoiceNotice(`✅ Entendido: "${transcript}"`);
          setTimeout(() => setVoiceNotice(null), 3500);
        }
        setIsListeningVoice(false);
      };

      recognition.onerror = (event: any) => {
        setIsListeningVoice(false);
        if (event.error === 'not-allowed') {
          setVoiceNotice('Permissão do microfone negada. Autorize no seu navegador.');
        } else {
          setVoiceNotice('Não foi possível identificar sua voz. Tente falar novamente.');
        }
        setTimeout(() => setVoiceNotice(null), 4000);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition error:', err);
      setIsListeningVoice(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  const handleTriggerWebSearch = async (title: string, msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, webSearchInitiated: true } : m))
    );

    try {
      const result = await movieRequestService.submitSuggestion({
        title,
        suggestedBy: activeProfile?.name || 'Usuário CAIC',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `web-res-${Date.now()}`,
          role: 'assistant',
          content: result.autoAdded
            ? `🎉 Ótima notícia! Nosso agente localizou "${title}" na web e o filme já foi integrado ao catálogo oficial!`
            : `🔍 Busca na web por "${title}" realizada em segundo plano!\n\n${result.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recommendedMovies: result.movie ? [result.movie] : []
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `web-err-${Date.now()}`,
          role: 'assistant',
          content: `Registramos seu pedido para "${title}" na lista dos administradores para localização e inclusão no catálogo!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    if (prompt === '🎯 Perguntas Chaves do Dia') {
      setShowKeyQuestions(true);
      setShowMoodPicker(false);
      return;
    }

    setShowMoodPicker(false);
    setShowKeyQuestions(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const totalTitles = catalogService.getAll().length || 800;
    const isRecommendationQuery = shouldAttachMovieCards(prompt);
    const thinkingMsg: ChatMessage = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: isRecommendationQuery
        ? `Consultando o acervo de mais de ${totalTitles} títulos e avaliando a melhor afinidade para você...`
        : `Analisando os detalhes cinéfilos para responder sua pergunta...`,
      timestamp: 'Agora',
      isThinking: true
    };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => !m.isThinking && m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      // Encontra os filmes mais recentes recomendados ou discutidos na conversa
      const recentMovies = [...messages]
        .reverse()
        .find((m) => m.recommendedMovies && m.recommendedMovies.length > 0)
        ?.recommendedMovies;

      const response = await geminiCurationService.askCurator(prompt, history, activeProfile, recentMovies);

      const attachCards = shouldAttachMovieCards(prompt);
      let finalRecommended = attachCards ? (response.recommendedMovies || []) : [];
      let finalReasons = attachCards ? response.recommendationsWithReasons : undefined;

      // Rede de proteção: APENAS se o usuário pediu recomendações/links/dicas E a IA não retornou cards estruturados,
      // mas citou filmes no texto (ex: **A Hora do Rush (1998)**), extrai do acervo e anexa com botão Assistir
      if (attachCards && (!finalRecommended || finalRecommended.length === 0) && response.text) {
        const extracted = catalogService.findMoviesMentionedInText(response.text);
        if (extracted.length > 0) {
          finalRecommended = extracted.slice(0, 4);
          finalReasons = finalRecommended.map((m, idx) => ({
            movie: m,
            reason: 'Disponível no catálogo CAIC para assistir agora com 1 clique!',
            matchScore: Math.round(98 - idx * 2)
          }));
        }
      }

      setMessages((prev) => [
        ...prev.filter((m) => !m.isThinking),
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recommendedMovies: finalRecommended,
          recommendationsWithReasons: finalReasons,
          unmatchedQuery: response.unmatchedQuery,
          suggestWebSearch: response.suggestWebSearch,
          fallbackGenre: response.fallbackGenre,
          quickReplies: response.quickReplies,
          isOffTopic: response.isOffTopic,
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.isThinking),
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, tive uma instabilidade momentânea na análise. Mas você pode tentar novamente ou escolher uma das opções abaixo!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickReplies: DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 4)
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setVisibleMovieCounts({});
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Chat reiniciado! Qual é a sessão de cinema de hoje, ${activeProfile?.name || 'amigo'}?`,
        timestamp: 'Agora',
        recommendedMovies: [],
        quickReplies: [
          '🍿 Sozinho(a) com boa história',
          '💑 Sessão a dois em Casal',
          '👨‍👩‍👧‍👦 Filme para a Família & Crianças',
          '😂 Quero rir e relaxar',
          '⚡ Muita ação e adrenalina',
          '⏳ Rápido (Até 90min)',
          '🎯 Perguntas Chaves do Dia'
        ]
      }
    ]);
  };

  const handleSelectMood = (mood: MoodCardOption) => {
    handleSend(mood.prompt);
  };

  const handleToggleFav = (movie: Movie) => {
    if (onToggleFavorite) {
      onToggleFavorite(movie.id);
    } else {
      userService.toggleFavorite(movie.id);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay para fechar ao clicar/tocar fora no celular ou computador */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity animate-fadeIn"
        aria-label="Fechar ao tocar fora"
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] md:w-[560px] max-w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
        
        {/* Top Header - Otimizado para celular sem quebra e com botão fechar sempre visível */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 backdrop-blur-md gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-600 p-0.5 shadow-md shadow-cyan-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm font-extrabold text-slate-950 dark:text-white truncate">CAIC IA</h3>
                <span className="hidden sm:inline-flex text-[10px] uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 font-bold shrink-0">
                  IA Conversacional
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 truncate">
                {activeProfile ? `Para ${activeProfile.name}` : 'Assistente Inteligente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowKeyQuestions((prev) => !prev);
                if (!showKeyQuestions) setShowMoodPicker(false);
              }}
              title="Perguntas Chaves do Dia"
              className={`tv-focusable px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition shrink-0 ${
                showKeyQuestions
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-cyan-500'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className="hidden sm:inline">Perguntas Chaves</span>
            </button>

            <button
              onClick={() => {
                setShowMoodPicker((prev) => !prev);
                if (!showMoodPicker) setShowKeyQuestions(false);
              }}
              title="Como me sinto hoje?"
              className={`tv-focusable px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition shrink-0 ${
                showMoodPicker
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-500'
              }`}
            >
              <Smile className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Meu Humor</span>
            </button>

            <button
              onClick={handleClearChat}
              title="Limpar conversa"
              className="tv-focusable p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              title="Fechar chat"
              aria-label="Fechar chat"
              className="tv-focusable p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/50 dark:text-slate-200 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 transition shrink-0 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* COMPONENTE INTERATIVO: PERGUNTAS CHAVES DO DIA */}
      {showKeyQuestions && (
        <div className="p-4 bg-slate-100/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800 animate-fadeIn space-y-3 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-500" />
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Perguntas Chaves para a Sessão Perfeita
              </h4>
            </div>
            <button
              onClick={() => setShowKeyQuestions(false)}
              className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              Fechar
            </button>
          </div>

          {KEY_QUESTIONS.map((sec, sIdx) => (
            <div key={`kq-sec-${sIdx}`} className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {sec.title}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sec.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      handleSend(opt.prompt);
                      setShowKeyQuestions(false);
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-800 dark:text-slate-200 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPONENTE INTERATIVO: COMO ME SINTO HOJE? */}
      {showMoodPicker && (
        <div className="p-4 bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 animate-fadeIn">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Como você está se sentindo agora?
              </h4>
            </div>
            <button
              onClick={() => setShowMoodPicker(false)}
              className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => handleSelectMood(mood)}
                className={`tv-focusable text-left p-2.5 rounded-xl border bg-gradient-to-br ${mood.color} hover:scale-[1.02] transition-all shadow-xs flex flex-col justify-between`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{mood.emoji}</span>
                  <span className="text-xs font-bold leading-tight line-clamp-1">{mood.title}</span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-tight">
                  {mood.subtitle}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/70 dark:bg-slate-950/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500 dark:text-slate-400 px-1 font-medium">
              {msg.role === 'user' ? (
                <>
                  <span>{activeProfile?.name || 'Você'}</span> <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> <span>CAIC</span>
                </>
              )}
            </div>

            {/* Balão de Mensagem */}
            <div
              className={`max-w-[92%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none shadow-md font-medium'
                  : 'bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
              }`}
            >
              {msg.isThinking ? (
                <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 py-1">
                  <Sparkles className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="italic font-medium">{msg.content}</span>
                </div>
              ) : (
                <>
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Alerta de Escopo caso seja pergunta fora de tópico */}
                  {msg.isOffTopic && (
                    <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Filtro de Escopo: O CAIC responde exclusivamente sobre filmes e cinema.</span>
                    </div>
                  )}

                  {/* Opções Rápidas Interativas sob a Mensagem */}
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-500" />
                        <span>Sugestões Interativas:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.quickReplies.map((reply, rIdx) => (
                          <button
                            key={`qr-${msg.id}-${rIdx}`}
                            onClick={() => {
                              if (reply === '🎯 Perguntas Chaves do Dia') {
                                setShowKeyQuestions(true);
                              } else {
                                handleSend(reply);
                              }
                            }}
                            disabled={loading}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-cyan-500/40 dark:border-cyan-700/50 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 dark:hover:text-white transition transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <span>{reply}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sugestão de Busca na Web em Segundo Plano */}
            {msg.suggestWebSearch && msg.unmatchedQuery && (
              <div className="mt-2.5 w-full max-w-[96%] p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-700/60 shadow-sm animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                      <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Filme não encontrado no acervo local</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-tight">
                      Não encontramos "<strong>{msg.unmatchedQuery}</strong>" no catálogo atual. Apresentamos sugestões por proximidade de gênero{msg.fallbackGenre ? ` (${msg.fallbackGenre})` : ''}. Deseja que nosso agente pesquise na web em segundo plano?
                    </p>
                  </div>
                  <button
                    disabled={msg.webSearchInitiated}
                    onClick={() => handleTriggerWebSearch(msg.unmatchedQuery!, msg.id)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition flex-shrink-0 ${
                      msg.webSearchInitiated
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20 active:scale-95'
                    }`}
                  >
                    {msg.webSearchInitiated ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Buscando na Web...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>Buscar na Web em 2º Plano</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Cards Ricos de Filmes Recomendados dentro do Chat */}
            {msg.recommendedMovies && msg.recommendedMovies.length > 0 && (
              <div className="mt-3 w-full max-w-[96%] space-y-3">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> Recomendações Exclusivas no Catálogo
                  </span>
                  <span className="text-[10px] text-slate-500 lowercase">toque para dar play</span>
                </div>

                {(() => {
                  const maxToShow = visibleMovieCounts[msg.id] || 3;
                  const moviesToDisplay = msg.recommendedMovies.slice(0, maxToShow);
                  const remaining = msg.recommendedMovies.length - maxToShow;

                  return (
                    <div className="space-y-3">
                      {moviesToDisplay.map((movie, idx) => {
                        const reasonObj = msg.recommendationsWithReasons?.find((r) => r.movie.id === movie.id);
                        const matchScore = reasonObj?.matchScore || Math.round(98 - (idx % 3) * 3);
                        const isFav = activeProfile?.favoriteMovieIds.includes(movie.id);

                        return (
                          <div
                            key={movie.id}
                            className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all shadow-md group animate-fadeIn"
                          >
                            <div className="flex gap-3">
                              <div className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 shadow-inner">
                                <img
                                  src={movie.posterUrl}
                                  alt={movie.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-1 left-1">
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white shadow-md">
                                    {matchScore}% match
                                  </span>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-1.5">
                                    <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white line-clamp-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition">
                                      {movie.title}
                                    </h4>

                                    <button
                                      onClick={() => handleToggleFav(movie)}
                                      title={isFav ? "Remover dos favoritos" : "Salvar na minha lista"}
                                      className="p-1 rounded-full text-slate-400 hover:text-rose-500 transition"
                                    >
                                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                                    </button>
                                  </div>

                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 leading-snug">
                                    {movie.synopsis}
                                  </p>
                                </div>

                                {/* Justificativa da IA */}
                                {reasonObj?.reason && (
                                  <div className="my-1.5 p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/50 text-[10px] text-cyan-800 dark:text-cyan-200 font-medium">
                                    💡 <strong>Por que você vai curtir:</strong> {reasonObj.reason}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-0.5 font-bold text-amber-500 dark:text-amber-400">
                                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {movie.ratingScore}
                                    </span>
                                    <span>•</span>
                                    <span>{movie.durationMinutes} min</span>
                                    <span>•</span>
                                    <span className="font-semibold">{movie.genres[0]}</span>
                                  </div>

                                  <button
                                    onClick={() => onPlayMovie(movie)}
                                    className="tv-focusable px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-cyan-500/25 transition group-hover:scale-105"
                                  >
                                    <Play className="w-3 h-3 fill-slate-950" />
                                    <span>Assistir</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Botão para apresentar mais opções de filmes */}
                      {remaining > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setVisibleMovieCounts((prev) => ({
                              ...prev,
                              [msg.id]: (prev[msg.id] || 3) + 3,
                            }));
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/70 dark:hover:bg-cyan-900/60 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-sm hover:scale-[1.01]"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>✨ Ver Mais Opções Deste Tema (+{remaining} filmes no catálogo)</span>
                        </button>
                      ) : (
                        msg.recommendedMovies.length > 3 && (
                          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 py-1 font-medium">
                            ✅ Todos os {msg.recommendedMovies.length} filmes recomendados foram exibidos.
                          </p>
                        )
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões Rápidas em Chips */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setShowKeyQuestions((prev) => !prev)}
            className="tv-focusable flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold text-[11px] shadow-sm hover:opacity-90 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🎯 Perguntas Chaves</span>
          </button>

          <button
            onClick={() => setShowMoodPicker((prev) => !prev)}
            className="tv-focusable flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[11px] shadow-sm hover:opacity-90 transition"
          >
            <span>🎭 Como me sinto hoje?</span>
          </button>

          <button
            onClick={() => handleSend('Me recomende filmes parecidos com Pânico na Floresta')}
            className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-purple-600 dark:text-purple-400"
          >
            🌲 Estilo Pânico na Floresta
          </button>

          <button
            onClick={() => handleSend('Quero filmes com animais e pets')}
            className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-lime-700 dark:text-lime-400"
          >
            🐾 Filmes com Animais
          </button>

          {onOpenMovieSuggestion && (
            <button
              onClick={() => onOpenMovieSuggestion()}
              className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-[11px]"
            >
              💡 Pedir Outro Filme
            </button>
          )}

          <button
            onClick={() => handleSend('Me recomende filmes parecidos com John Wick')}
            className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-rose-600 dark:text-rose-400"
          >
            💥 Estilo John Wick
          </button>

          <button
            onClick={() => handleSend('Me recomende filmes parecidos com Matrix')}
            className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-cyan-600 dark:text-cyan-400"
          >
            🕶️ Estilo Matrix / Hackers
          </button>

          <button
            onClick={() => handleSend('Me recomende os melhores filmes de ação com artes marciais e Jackie Chan')}
            className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-[11px]"
          >
            🥋 Jackie Chan & Lutas
          </button>

          <button
            onClick={() => handleSend('Quero um filme emocionante sobre Chico Xavier ou histórias de fé')}
            className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-[11px]"
          >
            🙏 Chico Xavier & Fé
          </button>

          <button
            onClick={() => handleSend('Quero um filme rápido com menos de 90 minutos')}
            className="tv-focusable flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-[11px]"
          >
            ⏳ Até 90 min
          </button>
        </div>
      </div>

      {/* Aviso de Reconhecimento de Voz */}
      {voiceNotice && (
        <div className="px-4 py-2 bg-cyan-50 dark:bg-cyan-950/80 border-t border-cyan-200 dark:border-cyan-800 text-center text-xs font-bold text-cyan-800 dark:text-cyan-200 flex items-center justify-center gap-1.5 animate-fadeIn">
          <Mic className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Input de Envio com Microfone */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={handleVoiceInput}
          title={isListeningVoice ? 'Ouvindo... Clique para cancelar' : 'Falar com o CAIC pelo microfone'}
          disabled={loading}
          className={`tv-focusable p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
            isListeningVoice
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-2 ring-rose-400 shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Mic className={`w-4 h-4 ${isListeningVoice ? 'text-white animate-bounce' : ''}`} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListeningVoice ? 'Ouvindo... Fale agora!' : "Ex: 'Quero um suspense psicológico' ou fale no microfone..."}
          disabled={loading}
          className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="tv-focusable px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-md shadow-cyan-600/20 disabled:opacity-40 transition shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
    </>
  );
};
